/**
 * Centralized Google OAuth & Gmail Connection Diagnostics + 8-Step Setup Guide.
 * NEVER handles or exposes client secrets or OAuth tokens.
 */

export const GOOGLE_CLOUD_CONSOLE_LINKS = {
  gmailApi: "https://console.cloud.google.com/apis/library/gmail.googleapis.com",
  projectSelector: "https://console.cloud.google.com/projectselector2/home/dashboard",
  oauthBranding: "https://console.cloud.google.com/auth/branding",
  oauthAudience: "https://console.cloud.google.com/auth/audience",
  oauthClients: "https://console.cloud.google.com/auth/clients",
  apiCredentials: "https://console.cloud.google.com/apis/credentials",
} as const;

export type GmailErrorCode =
  | "gmail_api_disabled"
  | "credentials_missing"
  | "redirect_uri_mismatch"
  | "app_in_testing"
  | "not_approved_test_user"
  | "consent_cancelled"
  | "token_expired"
  | "verification_required"
  | "backend_incomplete";

export interface GmailDiagnosticInfo {
  code: GmailErrorCode;
  headline: string;
  explanation: string;
  nextAction: string;
  googleUrl: string;
  googleUrlLabel: string;
  isAdminAction: boolean;
  showSupportAfterSteps: string;
}

export const GMAIL_ERROR_CATALOG: Record<GmailErrorCode, GmailDiagnosticInfo> = {
  gmail_api_disabled: {
    code: "gmail_api_disabled",
    headline: "Gmail API is not enabled.",
    explanation:
      "Google rejected sending or profile access because Gmail API (gmail.googleapis.com) is disabled on the Google Cloud project.",
    nextAction:
      "The application administrator must open Google Cloud Gmail API library, select the active project, click Enable, and then click Reconnect Gmail.",
    googleUrl: GOOGLE_CLOUD_CONSOLE_LINKS.gmailApi,
    googleUrlLabel: "Open Gmail API in Google Cloud",
    isAdminAction: true,
    showSupportAfterSteps: "If the administrator confirms Gmail API is already enabled and the error persists after reconnecting, contact support.",
  },
  credentials_missing: {
    code: "credentials_missing",
    headline: "OAuth credentials are missing.",
    explanation:
      "The server environment is missing valid Google OAuth Client credentials (GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET).",
    nextAction:
      "The application administrator must create or copy the Web Application OAuth client ID and secret in Google Cloud API Credentials and save them in server environment settings.",
    googleUrl: GOOGLE_CLOUD_CONSOLE_LINKS.apiCredentials,
    googleUrlLabel: "Open Google API Credentials",
    isAdminAction: true,
    showSupportAfterSteps: "Once environment variables are saved and redeployed, refresh this page. Contact support if credentials fail.",
  },
  redirect_uri_mismatch: {
    code: "redirect_uri_mismatch",
    headline: "Redirect URI does not match.",
    explanation:
      "Google could not return to USMAN AI GTM because the callback URL registered in Google Cloud does not exactly match this application's Gmail OAuth callback URL.",
    nextAction:
      "The administrator must open OAuth Clients in Google Cloud and ensure the Authorized Redirect URI exactly matches https://lead-scraper-mxs5.vercel.app/api/integrations/gmail/callback (plus exact domain origins).",
    googleUrl: GOOGLE_CLOUD_CONSOLE_LINKS.oauthClients,
    googleUrlLabel: "Fix Redirect URI in OAuth Clients",
    isAdminAction: true,
    showSupportAfterSteps: "Wait 5 minutes after saving in Google Cloud, then retry Connect Gmail. Contact support if mismatch continues.",
  },
  app_in_testing: {
    code: "app_in_testing",
    headline: "Google app is in Testing mode.",
    explanation:
      "The Google OAuth consent screen is currently in Testing publishing status, so Google limits OAuth connections to explicitly listed test users until app verification/publishing completes.",
    nextAction:
      "Ask the administrator to either add your Gmail address under Audience -> Test Users or complete Google App Verification and publish to Production.",
    googleUrl: GOOGLE_CLOUD_CONSOLE_LINKS.oauthAudience,
    googleUrlLabel: "Open OAuth Audience / Test Users",
    isAdminAction: true,
    showSupportAfterSteps: "After your Gmail is added as a Test User or the app is published, click Reconnect Gmail.",
  },
  not_approved_test_user: {
    code: "not_approved_test_user",
    headline: "This Gmail address is not an approved test user.",
    explanation:
      "While this Google OAuth app is in Testing mode, Google blocked authorization because your selected Gmail address is not on Google Cloud's Test Users list.",
    nextAction:
      "Ask the administrator to add your exact Gmail address under OAuth Audience -> Test Users, wait 1-2 minutes, and click Connect Gmail again.",
    googleUrl: GOOGLE_CLOUD_CONSOLE_LINKS.oauthAudience,
    googleUrlLabel: "Add Gmail to OAuth Test Users",
    isAdminAction: true,
    showSupportAfterSteps: "If your exact Gmail is already listed under Test Users and Google still blocks sign-in, contact the Owner.",
  },
  consent_cancelled: {
    code: "consent_cancelled",
    headline: "Google authorization was cancelled.",
    explanation:
      "You closed the Google sign-in window or clicked Cancel/Deny before granting the Gmail send permission required for outreach.",
    nextAction:
      "Click Connect Gmail below, select your Gmail account, and click Allow on the gmail.send permission screen.",
    googleUrl: GOOGLE_CLOUD_CONSOLE_LINKS.oauthBranding,
    googleUrlLabel: "Review OAuth Consent Info",
    isAdminAction: false,
    showSupportAfterSteps: "If Google blocks approval with an error screen instead of a Cancel button, check Audience/Test Users or contact support.",
  },
  token_expired: {
    code: "token_expired",
    headline: "Token expired; reconnect Gmail.",
    explanation:
      "Your previously connected Gmail authorization token has expired or was revoked in Google Account security settings (invalid_grant).",
    nextAction:
      "Click Reconnect Gmail right next to your mailbox to authorize a fresh offline refresh token cleanly without changing any workspace leads.",
    googleUrl: GOOGLE_CLOUD_CONSOLE_LINKS.gmailApi,
    googleUrlLabel: "Check Gmail API Status",
    isAdminAction: false,
    showSupportAfterSteps: "If Reconnect Gmail repeatedly expires immediately, check Google Account third-party app access or contact support.",
  },
  verification_required: {
    code: "verification_required",
    headline: "Google verification is required.",
    explanation:
      "Because gmail.send is a sensitive Google API scope, Google displays an unverified-app warning or restricts arbitrary public users until Google OAuth App Verification is approved.",
    nextAction:
      "For ordinary customers before full Google Trust & Safety approval, the administrator must publish after Google verification or add approved Test Users in Audience.",
    googleUrl: GOOGLE_CLOUD_CONSOLE_LINKS.oauthAudience,
    googleUrlLabel: "Manage Publishing & Verification",
    isAdminAction: true,
    showSupportAfterSteps: "Customers who already have Test User access can connect immediately; otherwise contact the Owner for test-user allowlisting.",
  },
  backend_incomplete: {
    code: "backend_incomplete",
    headline: "Backend configuration is incomplete.",
    explanation:
      "Google OAuth callback or token persistence could not complete because required backend environment or database settings are incomplete.",
    nextAction:
      "Verify GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_APP_URL, and DATABASE_URL on the server, then retry.",
    googleUrl: GOOGLE_CLOUD_CONSOLE_LINKS.apiCredentials,
    googleUrlLabel: "Check Google API Credentials",
    isAdminAction: true,
    showSupportAfterSteps: "If backend health is green and this error persists, report the error code to the Owner.",
  },
};

export function classifyGoogleOAuthError(
  rawError?: string | null,
  rawDescription?: string | null,
  context: "callback" | "token_exchange" | "send" | "config" = "callback"
): GmailDiagnosticInfo {
  const combined = `${String(rawError || "")} ${String(rawDescription || "")}`.toLowerCase();

  // Direct known codes first
  if (combined in GMAIL_ERROR_CATALOG) {
    return GMAIL_ERROR_CATALOG[combined as GmailErrorCode];
  }
  const exactCode = String(rawError || "").trim().toLowerCase() as GmailErrorCode;
  if (exactCode && GMAIL_ERROR_CATALOG[exactCode]) {
    return GMAIL_ERROR_CATALOG[exactCode];
  }

  if (
    combined.includes("credentials_missing") ||
    combined.includes("oauth_not_configured") ||
    combined.includes("missing google_client") ||
    combined.includes("invalid_client") ||
    combined.includes("unauthorized_client")
  ) {
    return GMAIL_ERROR_CATALOG.credentials_missing;
  }

  if (combined.includes("redirect_uri_mismatch")) {
    return GMAIL_ERROR_CATALOG.redirect_uri_mismatch;
  }

  if (
    combined.includes("access not configured") ||
    combined.includes("gmail api has not been used") ||
    combined.includes("gmail.googleapis.com") ||
    combined.includes("service_disabled")
  ) {
    return GMAIL_ERROR_CATALOG.gmail_api_disabled;
  }

  if (
    combined.includes("test user") ||
    combined.includes("developer approved testers") ||
    combined.includes("org_internal")
  ) {
    return GMAIL_ERROR_CATALOG.not_approved_test_user;
  }

  if (
    combined.includes("access_denied") ||
    combined.includes("has not completed the google verification") ||
    combined.includes("currently being tested")
  ) {
    if (context === "callback" && combined.includes("cancelled")) {
      return GMAIL_ERROR_CATALOG.consent_cancelled;
    }
    if (combined.includes("verification")) {
      return GMAIL_ERROR_CATALOG.verification_required;
    }
    return GMAIL_ERROR_CATALOG.app_in_testing;
  }

  if (
    combined.includes("user_cancelled") ||
    combined.includes("consent_cancelled") ||
    combined.includes("cancelled")
  ) {
    return GMAIL_ERROR_CATALOG.consent_cancelled;
  }

  if (
    combined.includes("invalid_grant") ||
    combined.includes("token has been expired") ||
    combined.includes("revoked") ||
    combined.includes("401") ||
    combined.includes("unauthenticated") ||
    combined.includes("insufficient")
  ) {
    return GMAIL_ERROR_CATALOG.token_expired;
  }

  if (combined.includes("verification") || combined.includes("unverified")) {
    return GMAIL_ERROR_CATALOG.verification_required;
  }

  if (context === "send") {
    return GMAIL_ERROR_CATALOG.token_expired;
  }
  return GMAIL_ERROR_CATALOG.backend_incomplete;
}

export interface GmailSetupStep {
  stepNumber: number;
  title: string;
  audience: "SHARED_DEFAULT" | "CUSTOM_OPTIONAL" | "CUSTOMER_ANYTIME";
  summary: string;
  details?: string[];
  linkUrl?: string;
  linkLabel?: string;
  importantWarning?: string;
  checklist?: string[];
}

export function buildGmail8Steps(redirectUri = "https://lead-scraper-mxs5.vercel.app/api/integrations/gmail/callback"): GmailSetupStep[] {
  return [
    {
      stepNumber: 1,
      title: "STEP 1 — Open Google Cloud",
      audience: "CUSTOM_OPTIONAL",
      summary:
        "If using Shared Owner-Managed OAuth (our default), the Owner already maintains the Google Cloud project (`usman-ai-gtm-516005`) for you. If setting up an optional workspace-specific Google Cloud OAuth app, open Google Cloud Project Selector, pick an existing project or create a new project for your company.",
      linkUrl: GOOGLE_CLOUD_CONSOLE_LINKS.projectSelector,
      linkLabel: "Open Google Cloud Project Selector",
    },
    {
      stepNumber: 2,
      title: "STEP 2 — Enable Gmail API",
      audience: "CUSTOM_OPTIONAL",
      summary:
        "Open the Gmail API Library page, verify your selected Google Cloud project in the top bar, click Enable, and confirm the page updates to 'API Enabled' so authorized OAuth tokens are permitted to send email.",
      linkUrl: GOOGLE_CLOUD_CONSOLE_LINKS.gmailApi,
      linkLabel: "Enable Gmail API in Google Cloud",
    },
    {
      stepNumber: 3,
      title: "STEP 3 — Configure OAuth Branding",
      audience: "CUSTOM_OPTIONAL",
      summary:
        "Open Google Auth Platform → Branding and enter your Application Name (e.g., USMAN AI GTM or your agency name), User Support Email, Authorized Domains, and Developer Contact Information.",
      linkUrl: GOOGLE_CLOUD_CONSOLE_LINKS.oauthBranding,
      linkLabel: "Configure OAuth Branding",
    },
    {
      stepNumber: 4,
      title: "STEP 4 — Configure OAuth Audience and Test User",
      audience: "CUSTOM_OPTIONAL",
      summary:
        "Open Google Auth Platform → Audience. Choose External (for standard @gmail.com and external domains) or Internal (only inside your Google Workspace org). If your project Publishing Status is Testing mode, ONLY email addresses added under Test Users can connect — note that only a project Administrator with IAM permissions on that specific Google Cloud project can edit Test Users (customers cannot add themselves to someone else's Google Cloud project).",
      linkUrl: GOOGLE_CLOUD_CONSOLE_LINKS.oauthAudience,
      linkLabel: "Open OAuth Audience & Test Users",
    },
    {
      stepNumber: 5,
      title: "STEP 5 — Create OAuth Client",
      audience: "CUSTOM_OPTIONAL",
      summary:
        "Open OAuth Clients, choose Application type: 'Web application', add this app's exact Authorized JavaScript Origin (https://lead-scraper-mxs5.vercel.app), and add the exact Authorized Redirect URI read from this backend below:",
      details: [`Exact Authorized Redirect URI: ${redirectUri}`],
      linkUrl: GOOGLE_CLOUD_CONSOLE_LINKS.oauthClients,
      linkLabel: "Open OAuth Clients",
    },
    {
      stepNumber: 6,
      title: "STEP 6 — Save Client ID and Client Secret",
      audience: "CUSTOM_OPTIONAL",
      summary:
        "Open Google API Credentials / OAuth Client details to review your Client ID and Client Secret. Download the Web Application client_secret_*.json file when created. All Client Secrets saved inside this platform are encrypted at rest with AES-256-GCM on the server — never stored in browser localStorage, never exposed in frontend JavaScript, and never sent over WhatsApp. For Shared Owner-Managed OAuth customers, this JSON file is NOT required.",
      importantWarning:
        "IMPORTANT: DOWNLOAD THE JSON FILE BEFORE CLOSING THE GOOGLE CREDENTIALS SCREEN, IF THIS CUSTOMER-SPECIFIC CONFIGURATION REQUIRES IT.",
      linkUrl: GOOGLE_CLOUD_CONSOLE_LINKS.apiCredentials,
      linkLabel: "Open Google API Credentials",
    },
    {
      stepNumber: 7,
      title: "STEP 7 — VERIFY THE TEST USER",
      audience: "CUSTOMER_ANYTIME",
      summary:
        "Return to Google Auth Platform → Audience and verify that the exact Gmail address you intend to connect is listed under Test Users (if Testing mode applies, and if you hold permissions on that Google Cloud project). Confirm all 5 checks manually before connecting:",
      checklist: [
        "Correct Google project selected",
        "Gmail API enabled",
        "Correct OAuth audience (External vs Internal)",
        "Intended Gmail address present in test users, if Testing mode applies",
        "Web Application OAuth client created with exact Redirect URI",
      ],
      linkUrl: GOOGLE_CLOUD_CONSOLE_LINKS.oauthAudience,
      linkLabel: "Verify Audience & Test Users",
    },
    {
      stepNumber: 8,
      title: "STEP 8 — Securely Submit Configuration and Test Gmail",
      audience: "CUSTOMER_ANYTIME",
      summary:
        "Using Shared Owner-Managed OAuth (Default): Simply return here, refresh the page, click 'Connect Official Gmail Account', select your Gmail account, grant the minimal gmail.send permission, verify the Connected status badge, and send a safe test email. Using Optional Customer-Specific OAuth: Upload your Web Application JSON file inside the secure Custom OAuth panel below (encrypted server-side and submitted for Owner review — never send OAuth secrets via WhatsApp or email), then click Connect Gmail.",
    },
  ];
}

export const GMAIL_8_STEP_SETUP_GUIDE: GmailSetupStep[] = buildGmail8Steps();
