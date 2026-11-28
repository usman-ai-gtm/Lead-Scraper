export interface User {
  id: number;
  username?: string;
  email: string;
  full_name: string;
  company?: string;
  role: "ADMIN" | "MANAGER" | "USER" | "VIEWER" | "CLIENT" | "SUPER_ADMIN" | string;
  account_type?: "MASTER_OWNER" | "FREE_PREVIEW" | "PAID_CLIENT" | string;
  workspace_id: number;
  tenant_id?: number;
  status?: string;
  plan?: string;
  plan_type?: string;
  plan_label?: string;
  google_maps_enabled?: boolean;
  daily_email_limit?: number;
  features?: Record<string, boolean>;
  custom_duration_value?: number | null;
  custom_duration_unit?: string | null;
  custom_price_usd?: number | null;
  suggested_price_usd?: number | null;
  max_leads_quota?: number | null;
  leads_used_in_period?: number;
  remaining_leads_quota?: number | null;
  is_active?: boolean;
  isLocked?: boolean;
  isPreview?: boolean;
  remaining_days?: number | string;
  remaining_detailed?: string;
  subscription_start?: string | null;
  subscription_expires_at?: string | null;
  must_change_password?: boolean;
  session_version?: number;
}

export interface ClientAccount {
  id: number;
  username?: string;
  email: string;
  full_name: string;
  company?: string;
  workspace_id: number;
  workspace_name: string;
  role: string;
  account_type?: "MASTER_OWNER" | "FREE_PREVIEW" | "PAID_CLIENT" | string;
  status: "ACTIVE" | "SUSPENDED" | "REVOKED" | "LOCKED" | "PENDING" | "EXPIRED" | "PREVIEW_ONLY";
  must_change_password: boolean;
  max_leads_quota: number;
  client_notes?: string;
  created_at: string;
  last_login?: string;
  first_google_signin_at?: string | null;
  last_google_signin_at?: string | null;
  google_sub?: string | null;
  auth_provider?: string | null;
  converted_from_preview_at?: string | null;
  leads_count: number;
  plan?: string;
  raw_plan?: string;
  plan_type?: string;
  plan_label?: string;
  google_maps_enabled?: boolean;
  daily_email_limit?: number;
  features?: Record<string, boolean>;
  custom_duration_value?: number | null;
  custom_duration_unit?: string | null;
  custom_price_usd?: number | null;
  suggested_price_usd?: number | null;
  payment_status?: string;
  subscription_start?: string;
  subscription_expires_at?: string | null;
  subscription_status?: string;
  subscription_notes?: string;
  remaining_days?: number | string;
  remaining_detailed?: string;
  total_leads?: number;
  total_searches?: number;
  connected_accounts?: number;
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
  phone_status?: string;
  website?: string;
  email?: string;
  email_status?: string;
  email_confidence?: number;
  rating?: number;
  review_count?: number;
  ai_summary?: string;
  lead_score: number;
  final_lead_score?: number;
  icp_fit_score?: number;
  data_confidence_score?: number;
  business_opportunity_score?: number;
  buying_potential_score?: number;
  qualification_level?: string;
  positive_signals?: string;
  negative_signals?: string;
  missing_info?: string;
  main_opportunity?: string;
  main_risk?: string;
  recommended_action?: string;
  scoring_confidence?: number;
  buying_intent_score?: number;
  buying_intent_level?: string;
  buying_intent_category?: string;
  intent_confidence?: number;
  fit_score?: number;
  opportunity_score?: number;
  priority?: string;
  lead_temperature?: "HOT" | "WARM" | "COLD";
  crm_stage: string;
  next_followup?: string;
  outreach_status?: string;
  last_email_sent_at?: string;
  source?: string;
  source_url?: string;
  source_platform?: string;
  original_source_url?: string;
  domain?: string;
  email_source_url?: string;
  phone_source_url?: string;
  saved_date?: string;
  saved_time?: string;
  extraction_date?: string;
  extraction_time?: string;
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
  channel?: string;
  status: "Draft" | "Active" | "Paused" | "Completed";
  total_recipients?: number;
  total_leads?: number;
  sender_email?: string;
  sent_count: number;
  delivered_count?: number;
  opened_count?: number;
  open_count?: number;
  replied_count?: number;
  reply_count?: number;
  daily_limit?: number;
  positive_replies?: number;
  meetings_booked?: number;
  created_at: string;
}

export interface ConnectedAccount {
  id: number;
  account_type: "email" | "whatsapp";
  provider?: "gmail" | "smtp" | "meta_whatsapp";
  display_name?: string;
  external_identity?: string;
  identifier?: string;
  status: "CONNECTED" | "DISCONNECTED" | "ACTION REQUIRED" | "ERROR";
  is_default?: boolean;
  daily_limit?: number;
  sent_today?: number;
  workspace_id?: number;
  is_active?: boolean;
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
