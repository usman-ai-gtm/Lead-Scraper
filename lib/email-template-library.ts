/**
 * USMAN AI GTM — Simplified Practical Cold Email Template Library
 * Contains 6 clear, plain-language templates for everyday business outreach.
 */

export interface EmailTemplateDefinition {
  id?: number;
  slug: string;
  name: string;
  category: string;
  description: string;
  subject: string;
  body: string;
  is_default?: boolean;
}

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateDefinition[] = [
  {
    slug: "first-contact-intro",
    name: "First Introduction",
    category: "Introduction",
    description: "First time contacting a potential customer.",
    subject: "Quick introduction — {{business_name}}",
    body: `Hi {{first_name}},

I came across {{business_name}} and wanted to reach out directly regarding your work in {{industry}}.

We help organizations with {{service_name}} to attract more clients cleanly and consistently.

Would you be open to a brief 5-minute introductory conversation this week?

Best regards,
{{sender_name}}`,
    is_default: true,
  },
  {
    slug: "service-offer",
    name: "Service Offer",
    category: "Offer",
    description: "Introduce a relevant service or solution.",
    subject: "Relevant {{service_name}} for {{business_name}}",
    body: `Hi {{first_name}},

We work closely with businesses in {{industry}} to deliver practical {{service_name}} tailored to their goals.

If {{company_name}} is exploring ways to strengthen client acquisition or streamline operations, I would gladly share a short overview.

Would a brief 10-minute chat next week work for you?

Kind regards,
{{sender_name}}`,
    is_default: true,
  },
  {
    slug: "business-opportunity",
    name: "Business Opportunity",
    category: "Opportunity",
    description: "Explain a specific potential business opportunity.",
    subject: "Growth opportunity for {{business_name}}",
    body: `Hi {{first_name}},

While reviewing {{website}} and your presence in {{city}}, I noticed a clear opportunity where our team could support {{business_name}} with {{service_name}}.

We focus on practical outcomes without long lock-in commitments. Happy to send over 2–3 tailored suggestions if helpful.

Let me know if you'd like me to share those notes.

Best regards,
{{sender_name}}`,
    is_default: true,
  },
  {
    slug: "follow-up-1",
    name: "First Follow-Up",
    category: "Follow-Up",
    description: "Polite follow-up after the first email.",
    subject: "Re: Quick introduction — {{business_name}}",
    body: `Hi {{first_name}},

Just following up briefly on my earlier message in case it was buried during a busy week.

If exploring {{service_name}} for {{company_name}} makes sense right now, let me know when you might have 5 minutes to connect.

Best regards,
{{sender_name}}`,
    is_default: true,
  },
  {
    slug: "follow-up-2",
    name: "Second Follow-Up",
    category: "Follow-Up",
    description: "A polite second follow-up.",
    subject: "Following up — {{business_name}}",
    body: `Hi {{first_name}},

Checking in one more time regarding {{business_name}}. I completely understand schedules get crowded.

If someone else on your team handles {{service_name}} or new partnerships, feel free to point me their way.

Warm regards,
{{sender_name}}`,
    is_default: true,
  },
  {
    slug: "follow-up-3",
    name: "Final Follow-Up",
    category: "Follow-Up",
    description: "A final respectful message before closing outreach.",
    subject: "Closing the loop — {{business_name}}",
    body: `Hi {{first_name}},

This will be my final note so I do not crowd your inbox.

If {{service_name}} becomes a priority for {{company_name}} down the road, please feel free to reply anytime. Wishing you and the team at {{business_name}} every success.

Best regards,
{{sender_name}}`,
    is_default: true,
  },
];

export function renderPersonalizedEmail(
  templateText: string,
  lead: {
    first_name?: string;
    business_name?: string;
    company?: string;
    industry?: string;
    website?: string;
    city?: string;
    country?: string;
  },
  sender: {
    sender_name?: string;
    company_name?: string;
  },
  serviceName: string = "our business solutions"
): string {
  if (!templateText) return "";

  const bName = lead.business_name || lead.company || "your business";
  const firstName = lead.first_name || (lead.business_name ? `${lead.business_name} Team` : "Team");
  const compName = lead.business_name || lead.company || "your company";
  const ind = lead.industry || "your industry";
  const web = lead.website || "your website";
  const sName = sender.sender_name || "Outreach Team";
  const sComp = sender.company_name || "USMAN AI GTM";

  let rendered = templateText
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{company_name\}\}/gi, compName)
    .replace(/\{\{business_name\}\}/gi, bName)
    .replace(/\{\{industry\}\}/gi, ind)
    .replace(/\{\{website\}\}/gi, web)
    .replace(/\{\{service_name\}\}/gi, serviceName)
    .replace(/\{\{sender_name\}\}/gi, sName)
    .replace(/\{\{sender_company\}\}/gi, sComp)
    .replace(/\{\{contact_name\}\}/gi, firstName)
    .replace(/\{\{city\}\}/gi, lead.city || "your area")
    .replace(/\{\{country\}\}/gi, lead.country || "");

  rendered = rendered
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\[(?:Business Name|Company Name|First Name|Name|Sender Name)\]/gi, "");

  return rendered.trim();
}
