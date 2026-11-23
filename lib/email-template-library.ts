/**
 * USMAN AI GTM — Professional Cold Email Template Library & Personalization Engine
 * Contains 10 default high-converting templates with dynamic variables and anti-glitch cleanup.
 */

export interface EmailTemplateDefinition {
  id?: number;
  slug: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  is_default?: boolean;
}

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateDefinition[] = [
  {
    slug: "first-contact-intro",
    name: "1. First Contact / Introduction",
    category: "Introduction",
    subject: "Quick introduction — {{company_name}} & B2B growth",
    body: `Hi {{first_name}},

I came across {{business_name}} while reviewing leading companies in the {{industry}} space.

I was impressed by your presence in {{industry}} and wanted to reach out directly. We help companies like {{company_name}} discover verified client acquisition opportunities and scale revenue efficiently.

Would you be open to a brief 5-minute conversation next week to see how this could benefit {{business_name}}?

Best regards,
{{sender_name}}`,
    is_default: true,
  },
  {
    slug: "service-offer",
    name: "2. Service Offer",
    category: "Sales",
    subject: "Tailored {{service_name}} for {{business_name}}",
    body: `Hi {{first_name}},

I'm reaching out because we specialize in delivering high-impact {{service_name}} specifically designed for {{industry}} organizations.

Many businesses struggle with acquiring qualified B2B clients consistently. Our approach removes that bottleneck by delivering verified direct contacts and strategic outreach tailored to {{company_name}}.

Could I share a quick 2-minute overview of how we achieve this for businesses like yours?

Kind regards,
{{sender_name}}`,
    is_default: true,
  },
  {
    slug: "website-design-offer",
    name: "3. Website Design Offer",
    category: "Web & Digital",
    subject: "Digital growth & website opportunities for {{business_name}}",
    body: `Hi {{first_name}},

I took a look at {{website}} and noticed several opportunities where an optimized, high-converting digital storefront could significantly increase client inquiries for {{business_name}}.

We specialize in modern, high-speed website design and conversion rate optimization for businesses in {{industry}}.

Would you be open to a complimentary 3-point UX review of {{website}} with zero obligation?

Best regards,
{{sender_name}}`,
    is_default: true,
  },
  {
    slug: "accounting-bookkeeping",
    name: "4. Accounting and Bookkeeping Services",
    category: "Financial Services",
    subject: "Streamlining financial reporting for {{business_name}}",
    body: `Hi {{first_name}},

As {{company_name}} continues to expand in the {{industry}} sector, keeping books, payroll, and compliance flawless becomes critical to protecting your margins.

We provide dedicated bookkeeping, monthly financial reporting, and tax-ready accounting services for growing businesses. Our clients typically save 10-15 hours each month while gaining clear visibility into cash flow.

Would you be open to a brief introductory chat to see if we can simplify financial management for {{business_name}}?

Warm regards,
{{sender_name}}`,
    is_default: true,
  },
  {
    slug: "marketing-services",
    name: "5. Marketing Services",
    category: "Marketing",
    subject: "Predictable customer acquisition for {{business_name}}",
    body: `Hi {{first_name}},

Reaching decision-makers in {{industry}} requires targeted, data-backed outreach rather than broad advertising.

We help companies like {{company_name}} build dedicated client pipelines using hyper-targeted B2B marketing campaigns that produce measurable conversations.

Are you currently taking on new clients at {{business_name}} this quarter? If so, I'd love to share what is currently working best in your sector.

Best,
{{sender_name}}`,
    is_default: true,
  },
  {
    slug: "follow-up-1",
    name: "6. Follow-up Email",
    category: "Follow-up",
    subject: "Re: Quick introduction — {{company_name}}",
    body: `Hi {{first_name}},

I wanted to quickly follow up on my previous note. I know you're busy steering {{business_name}}.

In short: we help businesses in {{industry}} discover and connect with pre-verified high-intent clients.

Do you have 5 minutes this Thursday or Friday for a quick introductory conversation?

Best regards,
{{sender_name}}`,
    is_default: true,
  },
  {
    slug: "follow-up-2",
    name: "7. Second Follow-up",
    category: "Follow-up",
    subject: "Quick thought regarding {{business_name}}",
    body: `Hi {{first_name}},

I'm following up one last time regarding growth opportunities for {{business_name}} in {{industry}}.

If client acquisition isn't a priority right now, I completely understand and won't crowd your inbox.

However, if you'd like to explore how we can deliver verified B2B leads directly to your team, feel free to let me know whenever the timing is right.

Wishing you and {{company_name}} continued success,
{{sender_name}}`,
    is_default: true,
  },
  {
    slug: "meeting-request",
    name: "8. Meeting Request",
    category: "Direct Outreach",
    subject: "10-minute discovery call for {{business_name}}?",
    body: `Hi {{first_name}},

Given {{company_name}}'s position in {{industry}}, I believe our client-generation infrastructure could provide immediate value for your business development.

Would you be available for a brief 10-minute video or phone call next Tuesday or Wednesday?

Looking forward to connecting,
{{sender_name}}`,
    is_default: true,
  },
  {
    slug: "partnership-proposal",
    name: "9. Partnership Proposal",
    category: "Partnership",
    subject: "Strategic partnership idea for {{company_name}} & USMAN AI",
    body: `Hi {{first_name}},

I've been following {{business_name}}'s trajectory in the {{industry}} market and see strong potential synergy between our organizations.

We provide automated client identification and outreach technology, and partnering could allow us to bring mutual value to our respective client bases.

Could we schedule a brief exploratory conversation to discuss potential collaboration?

Warm regards,
{{sender_name}}`,
    is_default: true,
  },
  {
    slug: "custom-template",
    name: "10. Custom Template",
    category: "Custom",
    subject: "Collaboration with {{business_name}}",
    body: `Hi {{first_name}},

I am reaching out regarding {{company_name}} in {{industry}}.

We offer {{service_name}} designed to help you scale efficiently.

Would you be open to connecting this week?

Best regards,
{{sender_name}}`,
    is_default: true,
  },
];

/**
 * Robust Template Personalization Engine
 * Replaces variables with actual lead data, resolves fallback values gracefully,
 * and completely strips unresolved placeholders so raw brackets are NEVER sent.
 */
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
  serviceName: string = "B2B Lead Generation & Client Acquisition"
): string {
  if (!templateText) return "";

  const bName = lead.business_name || lead.company || "your business";
  const firstName = lead.first_name || (lead.business_name ? lead.business_name.split(/\s+/)[0] : "Business Owner");
  const compName = lead.business_name || lead.company || "your company";
  const ind = lead.industry || "Commercial & B2B";
  const web = lead.website || "";
  const sName = sender.sender_name || "Sales Outreach";
  const sComp = sender.company_name || "USMAN AI GTM";

  let rendered = templateText
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{company_name\}\}/gi, compName)
    .replace(/\{\{business_name\}\}/gi, bName)
    .replace(/\{\{industry\}\}/gi, ind)
    .replace(/\{\{website\}\}/gi, web)
    .replace(/\{\{service_name\}\}/gi, serviceName)
    .replace(/\{\{sender_name\}\}/gi, sName)
    .replace(/\{\{sender_company\}\}/gi, sComp);

  // Fallbacks for any variant variable names
  rendered = rendered
    .replace(/\{\{contact_name\}\}/gi, firstName)
    .replace(/\{\{city\}\}/gi, lead.city || "")
    .replace(/\{\{country\}\}/gi, lead.country || "");

  // Anti-Glitch Guard: strip any remaining unresolved placeholders
  rendered = rendered.replace(/\{\{[^}]+\}\}/g, "").replace(/\[(?:Business Name|Company Name|First Name|Name|Sender Name)\]/gi, "");

  return rendered.trim();
}
