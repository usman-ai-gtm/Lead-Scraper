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
import { calculateAuthoritativeOrderSpec } from "@/lib/custom-plans";
import { convertUsdAmount, SUPPORTED_CURRENCY_CODES } from "@/lib/fx-rates";
import { consumeRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";

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

    const rl = await consumeRateLimit({
      bucket: "payment_submission",
      identifier: String(resolved.userId),
      limit: 10,
      windowSeconds: 3600,
    });
    if (!rl.allowed) {
      return rateLimitExceededResponse(
        rl.retryAfterSeconds,
        "Too many payment submissions uploaded recently. Please wait before submitting again."
      );
    }

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

    const submittedUsername = String(formData.get("username") || "").trim();
    const authUsername = String(resolved.user.username || "").trim();
    const authEmail = String(resolved.user.email || "").trim();
    if (
      submittedUsername &&
      submittedUsername.toLowerCase() !== authUsername.toLowerCase() &&
      (!authEmail || submittedUsername.toLowerCase() !== authEmail.toLowerCase())
    ) {
      return NextResponse.json(
        {
          detail: `Account identity mismatch: you are signed in as "${authUsername || authEmail}". Submit payment proof from the exact customer account being upgraded.`,
        },
        { status: 403 }
      );
    }

    const requestedPlanRaw = String(formData.get("requested_plan") || "BASIC").toUpperCase();
    const requestedPlan = ["BASIC", "LIFETIME", "CUSTOM"].includes(requestedPlanRaw)
      ? requestedPlanRaw
      : "INVALID";
    if (requestedPlan === "INVALID") {
      return NextResponse.json({ detail: "Invalid plan selected. Choose BASIC, LIFETIME, or CUSTOM." }, { status: 400 });
    }

    const customDurationValueRaw = formData.get("custom_duration_value");
    const customDurationUnitRaw = formData.get("custom_duration_unit");
    const includeGoogleMaps = String(formData.get("include_google_maps") ?? "true").toLowerCase() !== "false";

    // Strict server-side pricing & lead allowance calculation (never trusts client price)
    const orderSpec = calculateAuthoritativeOrderSpec({
      requestedPlan,
      durationUnit: customDurationUnitRaw,
      durationValue: customDurationValueRaw,
      includeGoogleMaps,
    });
    if (!orderSpec.ok) {
      return NextResponse.json({ detail: orderSpec.error || "Invalid custom plan configuration." }, { status: 400 });
    }

    const requestedCurrency = String(formData.get("currency") || "USD").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "USD";
    const targetCurrency =
      SUPPORTED_CURRENCY_CODES.includes(requestedCurrency) || /^[A-Z]{3}$/.test(requestedCurrency)
        ? requestedCurrency
        : "USD";
    const fx = await convertUsdAmount(orderSpec.priceUsd, targetCurrency);
    const effectiveCurrency = fx.fallbackToUsd ? "USD" : fx.targetCurrency;

    const methodIdRaw = formData.get("payment_method_id");
    const paymentMethodId = methodIdRaw && !Number.isNaN(Number(methodIdRaw)) ? Number(methodIdRaw) : null;
    const configuredMethods = await listPaymentMethods(false);
    let paymentMethodName = "";
    if (paymentMethodId) {
      const found = configuredMethods.find((m) => m.id === paymentMethodId);
      if (!found) {
        return NextResponse.json(
          { detail: "Selected payment method is not currently active or configured. Choose an active payment method." },
          { status: 400 }
        );
      }
      paymentMethodName = found.name;
    } else {
      const fallbackName = String(formData.get("payment_method_name") || "").trim();
      const matchedByName = configuredMethods.find((m) => m.name.toLowerCase() === fallbackName.toLowerCase());
      if (!matchedByName) {
        return NextResponse.json(
          { detail: "Please select an active Owner-configured payment method." },
          { status: 400 }
        );
      }
      paymentMethodName = matchedByName.name;
    }

    const paymentReference = String(formData.get("payment_reference") || "").trim().slice(0, 160);
    const customerNote = String(formData.get("customer_note") || "").trim().slice(0, 500);
    const idempotencyKeyRaw = String(formData.get("idempotency_key") || "").trim().slice(0, 96);

    const submission = await createPaymentSubmission({
      userId: resolved.userId,
      workspaceId: resolved.workspaceId,
      username: authUsername || authEmail || `client_${resolved.userId}`,
      email: authEmail,
      requestedPlan: orderSpec.requestedPlan,
      planLabel: orderSpec.planLabel,
      agreedPriceUsd: orderSpec.priceUsd,
      currency: effectiveCurrency,
      exchangeRate: fx.rate,
      convertedAmount: fx.convertedAmount,
      leadAllowance: orderSpec.leadAllowance,
      idempotencyKey: idempotencyKeyRaw || null,
      paymentMethodId,
      paymentMethodName,
      paymentReference,
      customerNote,
      customDurationValue: orderSpec.durationValue,
      customDurationUnit: orderSpec.durationUnit,
      customFeaturesJson: orderSpec.features,
      safeFilename,
      verifiedMime,
      size,
      buffer: rawBuf,
    });

    return NextResponse.json({
      status: "success",
      message: `Payment proof submitted cleanly (${submission.request_code || `#${submission.id}`}). Your request is PENDING until Owner verifies receipt of funds.`,
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
