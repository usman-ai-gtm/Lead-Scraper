import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { generatePersonalizedEmail, RecipientLead, SenderProfile } from "@/lib/gemini-email-assistant";
import { updateNeonLeadOutreachStatus, getNeonGmailAccount } from "@/lib/neon-db";

export async function POST(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json(
      { error: "Authentication required to generate emails." },
      { status: 401 }
    );
  }
  if (currentUser.status === "LOCKED" || currentUser.status === "PENDING") {
    return NextResponse.json(
      {
        error: "Account Locked — Subscription Activation Required ($25/month or $100 Lifetime). Contact Owner via WhatsApp (+923174383702) for Instant Activation."
      },
      { status: 403 }
    );
  }
  if (currentUser.status === "SUSPENDED" || currentUser.status === "REVOKED") {
    return NextResponse.json(
      {
        error: "Account Suspended or Revoked. Contact Administrator via WhatsApp (+923174383702)."
      },
      { status: 403 }
    );
  }
  const workspaceId = currentUser.workspace_id || 1;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { lead, sender } = body;

  if (!lead || !lead.business_name || !lead.email) {
    return NextResponse.json(
      { error: "lead object with business_name and email is required." },
      { status: 400 }
    );
  }

  // Retrieve sender profile defaults if not fully provided
  const gmailAccount = await getNeonGmailAccount(workspaceId);
  const senderProfile: SenderProfile = {
    company_name: sender?.company_name || currentUser?.company || "USMAN AI GTM",
    sender_name: sender?.sender_name || gmailAccount?.sender_name || currentUser?.full_name || "Sales Outreach",
    sender_title: sender?.sender_title || "Client Solutions",
    sender_email: sender?.sender_email || gmailAccount?.sender_email || currentUser?.email || "",
    offer_description:
      sender?.offer_description ||
      "B2B lead generation, market intelligence, and verified business data solutions to scale customer acquisition.",
    website: sender?.website || "",
  };

  const recipientLead: RecipientLead = {
    id: lead.id,
    business_name: lead.business_name,
    domain: lead.domain,
    website: lead.website,
    email: lead.email,
    phone: lead.phone,
    city: lead.city,
    country: lead.country,
    industry: lead.industry,
    address: lead.address,
    notes: lead.notes,
    search_keyword: lead.search_keyword,
  };

  try {
    const draft = await generatePersonalizedEmail(recipientLead, senderProfile);

    // Update lead CRM stage to 'DRAFT READY'
    if (lead.id) {
      await updateNeonLeadOutreachStatus(workspaceId, Number(lead.id), "DRAFT READY");
    }

    return NextResponse.json({
      success: true,
      draft,
      model: draft.model_used,
      message: "Personalized cold outreach draft prepared by Gemini AI.",
    });
  } catch (err: any) {
    console.error("[Gemini Outreach Generation Error]:", err);
    return NextResponse.json(
      {
        error: err.message || "Failed to generate outreach email draft with Gemini AI.",
      },
      { status: 500 }
    );
  }
}
