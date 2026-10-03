export interface User {
  id: number;
  email: string;
  full_name: string;
  company?: string;
  role: "ADMIN" | "MANAGER" | "USER" | "VIEWER";
  workspace_id: number;
  tenant_id: number;
}

export interface Workspace {
  id: number;
  name: string;
  plan: string;
  ai_credits: number;
  search_credits: number;
  created_at: string;
}

export interface Lead {
  id: number;
  business_name: string;
  category?: string;
  industry?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  website?: string;
  email?: string;
  email_status?: string;
  email_confidence?: number;
  rating?: number;
  review_count?: number;
  ai_summary?: string;
  lead_score: number;
  fit_score?: number;
  opportunity_score?: number;
  priority?: string;
  lead_temperature?: "HOT" | "WARM" | "COLD";
  crm_stage: string;
  source?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Deal {
  id: number;
  title: string;
  stage: string;
  amount: number;
  win_probability: number;
  expected_close_date?: string;
  company_name?: string;
  contact_name?: string;
  created_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  status: "Draft" | "Active" | "Paused" | "Completed";
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  replied_count: number;
  created_at: string;
}

export interface ConnectedAccount {
  id: number;
  account_type: "email" | "whatsapp";
  provider: "gmail" | "smtp" | "meta_whatsapp";
  display_name: string;
  external_identity: string;
  status: "CONNECTED" | "DISCONNECTED" | "ACTION REQUIRED" | "ERROR";
  is_default: boolean;
  usage?: {
    today_sent: number;
    total_sent: number;
    total_delivered: number;
    total_read: number;
    total_replied: number;
    total_failed: number;
  };
}

export interface DashboardMetrics {
  total_leads: number;
  verified_leads: number;
  high_intent_leads: number;
  active_campaigns: number;
  total_emails_sent: number;
  open_rate: number;
  reply_rate: number;
  meetings_booked: number;
  pipeline_value: number;
  won_revenue: number;
  conversion_rate: number;
  health_score: number;
  lead_growth_series: { date: string; discovered: number; qualified: number }[];
  pipeline_by_stage: { stage: string; count: number; value: number }[];
  campaign_performance: any[];
  recent_activities: { type: string; text: string; time: string }[];
}

export interface AIProvider {
  id: number;
  provider_name: string;
  provider_type: string;
  model_name: string;
  masked_key: string;
  has_key: boolean;
  enabled: boolean;
  priority: number;
  latency: number;
  status: string;
  last_success?: string;
}
