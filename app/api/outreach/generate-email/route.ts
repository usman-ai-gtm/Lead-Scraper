import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { generatePersonalizedEmail, RecipientLead, SenderProfile } from "@/lib/gemini-email-assistant";
import { getWorkspaceProfileForPersonalization } from "@/lib/lead-personalizer";
import { updateNeonLeadOutreachStatus, getNeonGmailAccount } from "@/lib/neon-db";

export async function POST(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  const authCheck = await verifyClientActiveSubscription(currentUser, "cold_email");
  if (!authCheck.allowed) {
    return NextResponse.json({ error: authCheck.message }, { status: authCheck.statusCode || 403 });
  }
  const workspaceId = Number(authCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const {
    lead,
    sender,
    instruction,
    instruction_audio_base64,
    instruction_audio_mime,
    template_name,
    output_language,
    tone,
    template_mode,
  } = body;

  const hasExplicitLead = Boolean(lead && lead.business_name);
  if (!hasExplicitLead && !String(instruction || "").trim()) {
    return NextResponse.json(
      { error: "Please paste instructions or select a lead to generate an outreach email." },
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
      businessProfile?.ai_summary ||
      "B2B solutions and business growth services.",
    website: sender?.website || businessProfile?.website || "",
  };

  const recipientLead: RecipientLead = hasExplicitLead
    ? {
        id: lead.id,
        business_name: lead.business_name,
        domain: lead.domain,
        website: lead.website,
        email: lead.email || "",
        phone: lead.phone,
        city: lead.city,
        country: lead.country,
        industry: lead.industry,
        address: lead.address,
        notes: lead.notes,
        snippet: lead.snippet,
        search_keyword: lead.search_keyword,
        positive_signals: lead.positive_signals,
        enrichment_data: lead.enrichment_data,
      }
    : {
        business_name: "{{business_name}}",
        email: "",
        city: "{{city}}",
        country: businessProfile?.country || businessProfile?.preferred_locations || "",
        industry: businessProfile?.ideal_industries || businessProfile?.target_customer_type || "{{industry}}",
      };

  try {
    const draft = await generatePersonalizedEmail(recipientLead, senderProfile, {
      businessProfile,
      customInstruction: instruction,
      instructionAudioBase64: instruction_audio_base64,
      instructionAudioMime: instruction_audio_mime,
      templateName: template_name,
      outputLanguage: output_language,
      tone,
      templateMode: Boolean(template_mode || !hasExplicitLead),
    });

    if (lead?.id) {
      await updateNeonLeadOutreachStatus(workspaceId, Number(lead.id), "DRAFT READY");
    }

    return NextResponse.json({
      success: true,
      draft,
      model: "Smart Outreach Engine",
      used_business_profile: Boolean(businessProfile),
      message: "Personalized outreach draft generated cleanly.",
    });
  } catch (err: any) {
    console.error("[Outreach Generation Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate personalized outreach draft." },
      { status: 500 }
    );
  }
}
