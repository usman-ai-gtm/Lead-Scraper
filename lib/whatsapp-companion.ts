/**
 * USMAN AI GTM - WhatsApp Outreach Companion Types & Helper Logic
 */

export interface WhatsAppTemplate {
  id: number;
  name: string;
  category: "B2B_OUTREACH" | "FOLLOW_UP" | "CONSULTATION" | "PARTNERSHIP" | "CUSTOM";
  body: string;
  description?: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WhatsAppActivityLog {
  id: number;
  workspace_id?: number;
  lead_id?: number;
  business_name: string;
  contact_name?: string;
  phone_number: string;
  action: 
    | "DRAFT_PREPARED" 
    | "CHAT_OPENED" 
    | "MANUALLY_MARKED_SENT" 
    | "REPLY_RECORDED" 
    | "FOLLOW_UP_SCHEDULED" 
    | "OPTED_OUT";
  notes?: string;
  next_followup?: string;
  created_at: string;
}

export interface WhatsAppSuppression {
  id: number;
  phone_number: string;
  reason: string;
  business_name?: string;
  created_at: string;
}

export interface WhatsAppCompanionSettings {
  my_business_name: string;
  my_offering: string;
  value_proposition: string;
  sender_name: string;
  default_country_code: string;
  default_tone: string;
  auto_open_web: boolean;
}

export const DEFAULT_COMPANION_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 1,
    name: "Executive B2B Value Proposition",
    category: "B2B_OUTREACH",
    body: "Hi {{contact_name}}, I noticed {{business_name}} is expanding in {{city}}. At {{my_business}}, we {{value_proposition}}. Would you be open to a quick 5-minute chat this week to share how peers in {{industry}} are solving this?",
    description: "High-intent concise value hook tailored for founders and directors.",
    is_default: true,
  },
  {
    id: 2,
    name: "Consultative Service Brief",
    category: "CONSULTATION",
    body: "Hello! Reaching out from {{my_business}} regarding {{business_name}}. We specialize in helping {{industry}} companies scale operations through {{value_proposition}}. Are you currently taking on new growth initiatives?",
    description: "Warm, professional inquiry for local and enterprise service providers.",
    is_default: true,
  },
  {
    id: 3,
    name: "Quick Gentle Follow-up",
    category: "FOLLOW_UP",
    body: "Hi {{contact_name}}, following up on my previous note to {{business_name}}. Wanted to make sure this didn't slip through the cracks. Does a brief 5-min walk-through tomorrow work for you?",
    description: "Courteous reminder for leads requiring secondary touch.",
    is_default: true,
  },
  {
    id: 4,
    name: "Strategic Partnership Intro",
    category: "PARTNERSHIP",
    body: "Greetings {{contact_name}}! We follow {{business_name}}'s work in {{city}}. {{my_business}} provides {{value_proposition}}, and we believe a collaboration could deliver significant mutual client value. Open to connecting?",
    description: "Collaborative angle for co-marketing and agency partnerships.",
    is_default: true,
  },
];

export interface VariableInterpolationResult {
  renderedText: string;
  missingVariables: string[];
  resolvedVariables: Record<string, string>;
}

/**
 * Resolves template variables using genuine lead and user profile records.
 * Flags any missing variable so the user is informed without inserting invented claims.
 */
export function interpolateTemplateVariables(
  templateText: string,
  lead: {
    business_name?: string;
    contact_name?: string;
    city?: string;
    country?: string;
    industry?: string;
    website?: string;
    category?: string;
  },
  userProfile: {
    my_business_name?: string;
    value_proposition?: string;
    sender_name?: string;
  }
): VariableInterpolationResult {
  const missing: string[] = [];
  const resolved: Record<string, string> = {};

  // Standard lookup dictionary
  const dictionary: Record<string, string | undefined> = {
    business_name: lead.business_name?.trim() || undefined,
    contact_name: lead.contact_name?.trim() || (lead.business_name ? `Team at ${lead.business_name}` : undefined),
    my_business: userProfile.my_business_name?.trim() || "USMAN AI GTM",
    value_proposition: userProfile.value_proposition?.trim() || "automate high-intent lead generation and client acquisition",
    city: lead.city?.trim() || undefined,
    country: lead.country?.trim() || undefined,
    industry: lead.industry?.trim() || lead.category?.trim() || undefined,
    website: lead.website?.trim() || undefined,
    sender_name: userProfile.sender_name?.trim() || "Muhammad Usman",
  };

  // Find all {{variable}} patterns
  const renderedText = templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, varName) => {
    const val = dictionary[varName];
    if (val !== undefined && val !== "") {
      resolved[varName] = val;
      return val;
    } else {
      missing.push(varName);
      return `[Missing: {{${varName}}}]`;
    }
  });

  return {
    renderedText,
    missingVariables: Array.from(new Set(missing)),
    resolvedVariables: resolved,
  };
}
