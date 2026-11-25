/**
 * USMAN AI GTM - Production Unified API Client
 * Seamlessly interfaces with API / serverless functions with JWT tokens and error handling.
 */

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // When running in a browser on any production or cloud domain, ALWAYS use same-origin "/api"
    if (host !== "localhost" && host !== "127.0.0.1") {
      return "/api";
    }
  }
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!envUrl || envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
    return "/api";
  }
  return envUrl;
}

const API_BASE_URL = getApiBaseUrl();

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("usman_gtm_token");
      if (token && token !== "null" && token !== "undefined") {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    let url = endpoint;
    if (!url.startsWith("http")) {
      const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
      url = `${getApiBaseUrl()}${cleanEndpoint}`;
    }
    
    const config: RequestInit = {
      cache: "no-store",
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {}),
      },
    };

    try {
      const res = await fetch(url, config);

      if (res.status === 401 && typeof window !== "undefined") {
        const localUser = localStorage.getItem("usman_gtm_user");
        if (!localUser && window.location.pathname.startsWith("/app")) {
          localStorage.removeItem("usman_gtm_token");
          window.location.href = "/login?session_expired=true";
        }
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errorMsg =
          errData.detail ||
          errData.message ||
          errData.error ||
          (typeof errData === "string" ? errData : null) ||
          `Request failed with status ${res.status}`;
        throw new Error(errorMsg);
      }

      return await res.json();
    } catch (err: any) {
      console.warn(`[API] Error on ${url}:`, err.message);
      throw err;
    }
  }

  get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let url = endpoint;
    if (params) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          query.append(key, String(val));
        }
      });
      const queryString = query.toString();
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }
    }
    return this.request<T>(url, { method: "GET" });
  }

  post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiClient();
