"""
SSRF Protection Module (SEC-010)
Provides robust validation and safe HTTP fetching to prevent Server-Side Request Forgery.
Blocks loopback, private RFC1918, link-local (cloud metadata), multicast, reserved IPs,
disallows non-standard schemes and ports, and validates all redirect hops.
"""
import ipaddress
import logging
import socket
import urllib.parse
from typing import Optional, Tuple, Dict, Any
import requests

logger = logging.getLogger("usman_gtm.ssrf_protection")

# Explicitly forbidden cloud metadata and link-local addresses
METADATA_IPS = {
    "169.254.169.254",   # AWS / GCP / Azure metadata
    "metadata.google.internal",
    "100.100.100.200",   # Alibaba cloud metadata
}

ALLOWED_SCHEMES = {"http", "https"}
ALLOWED_PORTS = {80, 443, 8080, 8443}
MAX_REDIRECTS = 3
MAX_RESPONSE_BYTES = 1_048_576  # 1 MB limit for passive crawling
DEFAULT_TIMEOUT = 6.0


class SSRFSecurityError(ValueError):
    """Raised when an outbound URL target violates SSRF policy."""
    pass


def is_ip_safe(ip_str: str) -> Tuple[bool, str]:
    """
    Validates whether an IP address is a safe public address.
    Rejects loopback, private, link-local, multicast, and cloud metadata IPs.
    """
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return False, f"Invalid IP address format: {ip_str}"

    # Check for cloud metadata specifically
    if str(ip) in METADATA_IPS:
        return False, f"Target IP {ip} is cloud metadata"

    # Block loopback (127.0.0.0/8, ::1)
    if ip.is_loopback:
        return False, f"Target IP {ip} is loopback"

    # Block private networks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7)
    if ip.is_private:
        return False, f"Target IP {ip} is in a private network"

    # Block link-local (169.254.0.0/16, fe80::/10)
    if ip.is_link_local:
        return False, f"Target IP {ip} is link-local"

    # Block multicast (224.0.0.0/4, ff00::/8)
    if ip.is_multicast:
        return False, f"Target IP {ip} is multicast"

    # Block reserved / unspecified (0.0.0.0/8, ::)
    if ip.is_reserved or ip.is_unspecified:
        return False, f"Target IP {ip} is reserved/unspecified"

    return True, "Safe"


def validate_url_safety(url: str) -> Tuple[bool, str]:
    """
    Validates scheme, hostname, port, and DNS resolution of a URL.
    Returns (True, "OK") if safe, or (False, reason) if unsafe.
    """
    if not url or not isinstance(url, str):
        return False, "Empty or non-string URL"

    try:
        parsed = urllib.parse.urlsplit(url)
    except Exception as e:
        return False, f"Malformed URL: {e}"

    # 1. Scheme check
    if parsed.scheme.lower() not in ALLOWED_SCHEMES:
        return False, f"Disallowed scheme: '{parsed.scheme}'. Only HTTP and HTTPS are permitted."

    # 2. Host check
    hostname = parsed.hostname
    if not hostname:
        return False, "URL missing hostname"

    # Disallow credentials in authority (user:pass@host)
    if parsed.username or parsed.password:
        return False, "URLs with embedded credentials are not allowed"

    # 3. Port check
    port = parsed.port
    if port is not None and port not in ALLOWED_PORTS:
        return False, f"Disallowed port: {port}. Allowed ports: {sorted(list(ALLOWED_PORTS))}"

    # Check against known metadata domain names
    if hostname.lower() in METADATA_IPS:
        return False, f"Target domain {hostname} is forbidden cloud metadata"

    # 4. Resolve DNS and check all resolved IPs
    try:
        # Check if hostname is already a literal IP
        try:
            ipaddress.ip_address(hostname)
            is_literal = True
        except ValueError:
            is_literal = False

        if is_literal:
            safe, reason = is_ip_safe(hostname)
            if not safe:
                return False, f"SSRF blocked: {reason}"
        else:
            # Resolve hostname
            addr_info = socket.getaddrinfo(hostname, port or 80, family=socket.AF_UNSPEC, type=socket.SOCK_STREAM)
            if not addr_info:
                return False, f"Could not resolve host: {hostname}"

            resolved_ips = set()
            for entry in addr_info:
                sockaddr = entry[4]
                ip_resolved = sockaddr[0]
                resolved_ips.add(ip_resolved)

            for ip_str in resolved_ips:
                safe, reason = is_ip_safe(ip_str)
                if not safe:
                    return False, f"SSRF blocked: Host {hostname} resolves to restricted IP ({reason})"

    except socket.gaierror as e:
        return False, f"DNS resolution failed for {hostname}: {e}"
    except Exception as e:
        return False, f"Host validation error: {e}"

    return True, "OK"


def safe_http_get(
    url: str,
    headers: Optional[Dict[str, str]] = None,
    timeout: float = DEFAULT_TIMEOUT,
    max_bytes: int = MAX_RESPONSE_BYTES,
    max_redirects: int = MAX_REDIRECTS
) -> Tuple[int, str, Dict[str, str]]:
    """
    Safely executes an HTTP GET request with SSRF controls:
    - Pre-validates destination URL and resolved IPs
    - Disables automatic redirects to re-validate each redirect target
    - Limits response body size to prevent memory exhaustion / denial of service
    - Enforces strict socket connection and read timeouts

    Returns:
        (status_code, response_text, headers_dict)
    Raises:
        SSRFSecurityError: if target or any redirect target resolves to private/internal network.
    """
    current_url = url
    current_headers = headers or {"User-Agent": "UsmanResearchBot/2.0"}

    for hop in range(max_redirects + 1):
        safe, reason = validate_url_safety(current_url)
        if not safe:
            logger.warning(f"SSRF violation blocked for {current_url}: {reason}")
            raise SSRFSecurityError(f"Request blocked by SSRF policy: {reason}")

        try:
            resp = requests.get(
                current_url,
                headers=current_headers,
                timeout=timeout,
                allow_redirects=False,
                stream=True
            )
        except requests.RequestException as e:
            logger.info(f"Safe fetch network error for {current_url}: {e}")
            raise

        # Check for redirect status codes
        if resp.status_code in (301, 302, 303, 307, 308):
            redirect_target = resp.headers.get("Location")
            if not redirect_target:
                break
            # Resolve relative redirects
            current_url = urllib.parse.urljoin(current_url, redirect_target)
            resp.close()
            continue

        # Non-redirect response: bounded read
        content_chunks = []
        bytes_read = 0
        try:
            for chunk in resp.iter_content(chunk_size=4096, decode_unicode=False):
                content_chunks.append(chunk)
                bytes_read += len(chunk)
                if bytes_read > max_bytes:
                    logger.warning(f"Response size exceeded {max_bytes} bytes for {current_url}; truncating")
                    break
        finally:
            resp.close()

        raw_bytes = b"".join(content_chunks)
        # Attempt decoding
        encoding = resp.encoding or "utf-8"
        try:
            text = raw_bytes.decode(encoding, errors="replace")
        except Exception:
            text = raw_bytes.decode("utf-8", errors="replace")

        return resp.status_code, text, dict(resp.headers)

    raise SSRFSecurityError(f"Too many redirects ({max_redirects}) for {url}")
