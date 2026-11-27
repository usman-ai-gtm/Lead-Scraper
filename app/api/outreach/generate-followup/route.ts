import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { generateFollowupEmail, RecipientLead, SenderProfile } from "@/lib/gemini-email-assistant";
import { getWorkspaceProfileForPersonalization } from "@/lib/lead-personalizer";
import { getNeonGmailAccount } from "@/lib/neon-db";

export async function POST(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  const authCheck = await verifyClientActiveSubscription(currentUser, "cold_email");
  if (!authCheck.allowed) {
    return NextResponse.json(
      { error: authCheck.message },
      { status: authCheck.statusCode || 403 }
    );
  }
  const workspaceId = Number(authCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { original_subject, original_body, lead, sender } = body;

  if (!original_subject || !lead || !lead.business_name) {
    return NextResponse.json(
      { error: "original_subject and lead are required." },
      { status: 400 }
    );
  }

  const [gmailAccount, businessProfile] = await Promise.all([
    getNeonGmailAccount(workspaceId),
    getWorkspaceProfileForPersonalization(workspaceId),
  ]);
  const senderProfile: SenderProfile = {
    company_name: sender?.company_name || businessProfile?.business_name || currentUser?.company || "Our Team",
    sender_name: sender?.sender_name || gmailAccount?.sender_name || currentUser?.full_name || "Outreach Team",
    sender_title: sender?.sender_title || "Business Development",
    sender_email: sender?.sender_email || gmailAccount?.sender_email || currentUser?.email || "",
    offer_description:
      sender?.offer_description ||
      businessProfile?.products_services ||
      "B2B business solutions.",
    website: sender?.website || businessProfile?.website || "",
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
  };

  try {
    const draft = await generateFollowupEmail(
      original_subject,
      original_body || "",
      recipientLead,
      senderProfile,
      { businessProfile, outputLanguage: body.output_language, tone: body.tone }
    );

    return NextResponse.json({
      success: true,
      draft,
      model: "Smart Outreach Engine",
      message: "Follow-up email draft generated successfully.",
    });
  } catch (err: any) {
    console.error("[Follow-up Generation Error]:", err);
    return NextResponse.json(
      {
        error: err.message || "Failed to generate follow-up email draft.",
      },
      { status: 500 }
    );
  }
}
