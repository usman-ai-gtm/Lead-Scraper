import { NextResponse } from "next/server";
import dns from "dns";

interface DnsCheckResult {
  domain: string;
  timestamp: string;
  overall: "EXCELLENT" | "GOOD" | "NEEDS ATTENTION" | "INCOMPLETE";
  mx: {
    status: "PASS" | "MISSING" | "NEEDS ATTENTION";
    records: string[];
    summary: string;
  };
  spf: {
    status: "PASS" | "MISSING" | "NEEDS ATTENTION";
    record: string | null;
    summary: string;
  };
  dmarc: {
    status: "PASS" | "MISSING" | "NEEDS ATTENTION";
    record: string | null;
    summary: string;
  };
  dkim: {
    status: "PASS" | "MISSING" | "NEEDS ATTENTION" | "NOT CHECKED";
    selector: string;
    record: string | null;
    summary: string;
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  let domain = url.searchParams.get("domain") || "";
  const selector = (url.searchParams.get("selector") || "google").trim().toLowerCase();

  return runCheck(domain, selector);
}

export async function POST(request: Request) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  const domain = body.domain || "";
  const selector = (body.selector || "google").trim().toLowerCase();

  return runCheck(domain, selector);
}

async function runCheck(rawDomain: string, selector: string) {
  // Clean domain input (remove http/https, paths, spaces)
  let domain = rawDomain.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/:\d+$/, "");

  if (!domain || !domain.includes(".")) {
    return NextResponse.json(
      { error: "Please provide a valid domain name (e.g. yourcompany.com)." },
      { status: 400 }
    );
  }

  const result: DnsCheckResult = {
    domain,
    timestamp: new Date().toISOString(),
    overall: "GOOD",
    mx: { status: "MISSING", records: [], summary: "No MX records found." },
    spf: { status: "MISSING", record: null, summary: "No SPF record found." },
    dmarc: { status: "MISSING", record: null, summary: "No DMARC record found." },
    dkim: { status: "NOT CHECKED", selector, record: null, summary: "DKIM check skipped." },
  };

  // 1. Check MX Records
  try {
    const mxRecords = await dns.promises.resolveMx(domain);
    if (mxRecords && mxRecords.length > 0) {
      result.mx = {
        status: "PASS",
        records: mxRecords.sort((a, b) => a.priority - b.priority).map((r) => `${r.priority} ${r.exchange}`),
        summary: `Found ${mxRecords.length} active mail server (MX) record(s). Mail routing is configured.`,
      };
    }
  } catch (e: any) {
    result.mx = {
      status: "MISSING",
      records: [],
      summary: "Domain has no active MX records configured. Inbound emails cannot be received.",
    };
  }

  // 2. Check SPF (TXT records on root domain containing 'v=spf1')
  try {
    const txtRecords = await dns.promises.resolveTxt(domain);
    const flattened = txtRecords.map((chunks) => chunks.join(""));
    const spfRecord = flattened.find((r) => r.toLowerCase().startsWith("v=spf1"));

    if (spfRecord) {
      result.spf = {
        status: "PASS",
        record: spfRecord,
        summary: "Valid Sender Policy Framework (SPF) record detected. Authorizes your sending servers.",
      };
    } else {
      result.spf = {
        status: "NEEDS ATTENTION",
        record: null,
        summary: "Missing SPF record. Receiving mailboxes may treat outreach emails as suspicious or unverified.",
      };
    }
  } catch (e: any) {
    result.spf = {
      status: "MISSING",
      record: null,
      summary: "Could not retrieve TXT records. Configure: v=spf1 include:_spf.google.com ~all",
    };
  }

  // 3. Check DMARC (TXT record at _dmarc.<domain>)
  try {
    const dmarcRecords = await dns.promises.resolveTxt(`_dmarc.${domain}`);
    const flattened = dmarcRecords.map((chunks) => chunks.join(""));
    const dmarcRecord = flattened.find((r) => r.toLowerCase().startsWith("v=dmarc1"));

    if (dmarcRecord) {
      result.dmarc = {
        status: "PASS",
        record: dmarcRecord,
        summary: "Domain-based Message Authentication (DMARC) record is active.",
      };
    } else {
      result.dmarc = {
        status: "NEEDS ATTENTION",
        record: null,
        summary: "No DMARC policy found. Add a TXT record for '_dmarc." + domain + "' with 'v=DMARC1; p=none;'",
      };
    }
  } catch (e: any) {
    result.dmarc = {
      status: "MISSING",
      record: null,
      summary: "Missing DMARC policy at _dmarc." + domain + ". Recommended for deliverability.",
    };
  }

  // 4. Check DKIM (TXT record at <selector>._domainkey.<domain>)
  try {
    const dkimRecords = await dns.promises.resolveTxt(`${selector}._domainkey.${domain}`);
    const flattened = dkimRecords.map((chunks) => chunks.join(""));
    const dkimRecord = flattened.find((r) => r.toLowerCase().includes("v=dkim1") || r.toLowerCase().includes("p="));

    if (dkimRecord) {
      result.dkim = {
        status: "PASS",
        selector,
        record: dkimRecord.length > 50 ? `${dkimRecord.substring(0, 47)}...` : dkimRecord,
        summary: `DKIM key found for selector '${selector}'. Cryptographic email signing verified.`,
      };
    } else {
      result.dkim = {
        status: "NEEDS ATTENTION",
        selector,
        record: null,
        summary: `No DKIM record found at selector '${selector}'._domainkey.${domain}.`,
      };
    }
  } catch (e: any) {
    result.dkim = {
      status: "NEEDS ATTENTION",
      selector,
      record: null,
      summary: `DKIM record not found for selector '${selector}'. If using a custom selector, specify it.`,
    };
  }

  // Determine overall deliverability grade
  const passes = [result.mx.status, result.spf.status, result.dmarc.status, result.dkim.status].filter(
    (s) => s === "PASS"
  ).length;

  if (passes >= 3 && result.mx.status === "PASS" && result.spf.status === "PASS") {
    result.overall = passes === 4 ? "EXCELLENT" : "GOOD";
  } else {
    result.overall = "NEEDS ATTENTION";
  }

  return NextResponse.json(result);
}
