import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import {
  createPaymentSubmission,
  listCustomerPaymentSubmissions,
  listPaymentMethods,
  validateProofUpload,
} from "@/lib/payments-db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function resolveAuthenticatedCustomer(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return { error: NextResponse.json({ detail: "Authentication required." }, { status: 401 }) };
  }
  if (!isNeonConfigured()) {
    return { error: NextResponse.json({ detail: "Database unavailable." }, { status: 503 }) };
  }
  const sql = getNeonSql();
  if (!sql) {
    return { error: NextResponse.json({ detail: "Database connection failed." }, { status: 503 }) };
  }

  const userId = Number(currentUser.id || currentUser.sub) || 0;
  const rows = await sql.query(
    `SELECT id, username, email, role, account_type, workspace_id, status,
            COALESCE(session_version, 1) AS session_version
     FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  if (!rows || rows.length === 0) {
    return { error: NextResponse.json({ detail: "Account not found. Please sign in again." }, { status: 401 }) };
  }
  const u = rows[0];
  const tokenSv = currentUser.sv != null ? Number(currentUser.sv) : 1;
  if (!isAuthorizedOwner(u) && tokenSv !== Number(u.session_version || 1)) {
    return { error: NextResponse.json({ detail: "Session invalidated. Please sign in again." }, { status: 401 }) };
  }
  const statusUpper = String(u.status || "").toUpperCase();
  if (!isAuthorizedOwner(u) && statusUpper === "REVOKED") {
    return { error: NextResponse.json({ detail: "Account revoked." }, { status: 403 }) };
  }

  return {
    user: u,
    userId: Number(u.id),
    workspaceId: Number(u.workspace_id) || 1,
  };
}

export async function GET(req: Request) {
  noStore();
  try {
    const resolved = await resolveAuthenticatedCustomer(req);
    if (resolved.error) return resolved.error;
    const submissions = await listCustomerPaymentSubmissions(resolved.userId, resolved.workspaceId);
    return NextResponse.json({ submissions });
  } catch (err: any) {
    console.error("[Payment Submissions GET] Error:", err);
    return NextResponse.json({ detail: err?.message || "Failed to fetch payment submissions." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const resolved = await resolveAuthenticatedCustomer(req);
    if (resolved.error) return resolved.error;

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof (file as any).arrayBuffer !== "function") {
      return NextResponse.json(
        { detail: "Please upload a valid payment screenshot or PDF receipt (JPG, PNG, WebP, or PDF)." },
        { status: 400 }
      );
    }

    const uploaded = file as File;
    const rawBuf = Buffer.from(await uploaded.arrayBuffer());
    const { safeFilename, verifiedMime, size } = validateProofUpload({
      filename: uploaded.name || "payment_proof.png",
      mimeType: uploaded.type || "",
      buffer: rawBuf,
      userId: resolved.userId,
      workspaceId: resolved.workspaceId,
    });

    const requestedPlanRaw = String(formData.get("requested_plan") || "BASIC").toUpperCase();
    const requestedPlan = ["BASIC", "LIFETIME", "CUSTOM"].includes(requestedPlanRaw)
      ? requestedPlanRaw
      : "BASIC";
    const planLabel = String(formData.get("plan_label") || "").trim() || undefined;
    const agreedPriceRaw = formData.get("agreed_price_usd");
    const defaultPrice = requestedPlan === "LIFETIME" ? 100 : 25;
    const agreedPriceUsd =
      agreedPriceRaw !== null && String(agreedPriceRaw).trim() !== ""
        ? Number(agreedPriceRaw)
        : defaultPrice;
    if (Number.isNaN(agreedPriceUsd) || agreedPriceUsd <= 0 || agreedPriceUsd > 1000000) {
      return NextResponse.json({ detail: "Enter a valid agreed payment amount." }, { status: 400 });
    }

    const currency = String(formData.get("currency") || "USD").trim().toUpperCase().slice(0, 12) || "USD";
    const methodIdRaw = formData.get("payment_method_id");
    const paymentMethodId = methodIdRaw && !Number.isNaN(Number(methodIdRaw)) ? Number(methodIdRaw) : null;
    let paymentMethodName = String(formData.get("payment_method_name") || "").trim();

    if (paymentMethodId) {
      const configuredMethods = await listPaymentMethods(false);
      const found = configuredMethods.find((m) => m.id === paymentMethodId);
      if (found) paymentMethodName = found.name;
    }
    if (!paymentMethodName) {
      return NextResponse.json({ detail: "Please specify or select the payment method used." }, { status: 400 });
    }

    const paymentReference = String(formData.get("payment_reference") || "").trim().slice(0, 160);
    const customerNote = String(formData.get("customer_note") || "").trim().slice(0, 500);
    const customDurationValue = formData.get("custom_duration_value")
      ? Number(formData.get("custom_duration_value"))
      : null;
    const customDurationUnit = formData.get("custom_duration_unit")
      ? String(formData.get("custom_duration_unit")).trim().toLowerCase()
      : null;

    let customFeaturesJson: any = null;
    const rawFeatures = formData.get("custom_features_json");
    if (rawFeatures && typeof rawFeatures === "string") {
      try {
        customFeaturesJson = JSON.parse(rawFeatures);
      } catch {}
    }

    const submission = await createPaymentSubmission({
      userId: resolved.userId,
      workspaceId: resolved.workspaceId,
      username: String(resolved.user.username || resolved.user.email || `client_${resolved.userId}`),
      email: String(resolved.user.email || ""),
      requestedPlan,
      planLabel,
      agreedPriceUsd,
      currency,
      paymentMethodId,
      paymentMethodName,
      paymentReference,
      customerNote,
      customDurationValue: customDurationValue && !Number.isNaN(customDurationValue) ? customDurationValue : null,
      customDurationUnit,
      customFeaturesJson,
      safeFilename,
      verifiedMime,
      size,
      buffer: rawBuf,
    });

    return NextResponse.json({
      status: "success",
      message: "Payment proof submitted successfully. Awaiting Owner verification.",
      submission,
    });
  } catch (err: any) {
    console.error("[Payment Submissions POST] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to upload payment proof." },
      { status: 400 }
    );
  }
}
