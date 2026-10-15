-- ============================================================
-- USMAN AI GTM - Cloud PostgreSQL Schema Export
-- Auto-generated compatible schema for Supabase / Neon / RDS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS workspaces (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL
        , tenant_id INTEGER DEFAULT 1, description TEXT DEFAULT '');

CREATE TABLE IF NOT EXISTS leads (
            id SERIAL PRIMARY KEY,
            workspace_id INTEGER,
            business_name TEXT,
            category TEXT,
            subcategory TEXT,
            industry TEXT,
            address TEXT,
            city TEXT,
            state TEXT,
            country TEXT,
            postal_code TEXT,
            phone TEXT,
            website TEXT,
            email TEXT,
            email_status TEXT DEFAULT 'Not Found',
            email_confidence TEXT DEFAULT 'Low',
            source TEXT,
            source_url TEXT,
            search_keyword TEXT,
            search_location TEXT,
            date_discovered TEXT,
            rating REAL,
            review_count INTEGER,
            ai_summary TEXT,
            lead_score INTEGER DEFAULT 0,
            lead_temperature TEXT DEFAULT 'COLD',
            pain_points TEXT,
            opportunities TEXT,
            recommended_approach TEXT,
            crm_stage TEXT DEFAULT 'Not Contacted',
            tags TEXT,
            notes TEXT,
            campaign TEXT,
            last_contact TEXT,
            next_followup TEXT,
            created_at TEXT,
            updated_at TEXT, identity_key TEXT DEFAULT '', last_verified_at TEXT, data_freshness_days INTEGER DEFAULT 0, industry_group TEXT DEFAULT '', employee_count_estimate INTEGER DEFAULT 0, estimated_revenue REAL DEFAULT 0, source_confidence REAL DEFAULT 0, domain TEXT DEFAULT '', snippet TEXT DEFAULT '', icp_fit_score REAL DEFAULT 0, data_confidence_score REAL DEFAULT 0, business_opportunity_score REAL DEFAULT 0, buying_potential_score REAL DEFAULT 0, final_lead_score REAL DEFAULT 0, qualification_level TEXT DEFAULT 'Unqualified', positive_signals TEXT DEFAULT '', negative_signals TEXT DEFAULT '', missing_info TEXT DEFAULT '', main_opportunity TEXT DEFAULT '', main_risk TEXT DEFAULT '', recommended_action TEXT DEFAULT '', scoring_confidence REAL DEFAULT 0, buying_intent_score REAL DEFAULT 0, buying_intent_level TEXT DEFAULT '', buying_intent_category TEXT DEFAULT '', intent_confidence REAL DEFAULT 0, fit_score INTEGER DEFAULT 50, phone_status TEXT DEFAULT 'Unverified',
            FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
        );

CREATE TABLE IF NOT EXISTS tenants(
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        plan TEXT DEFAULT 'FREE',
        credits INTEGER DEFAULT 100,
        created_at TEXT NOT NULL
    );

CREATE TABLE IF NOT EXISTS users(
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
    , email TEXT, hashed_password TEXT, full_name TEXT, company TEXT, workspace_id INTEGER DEFAULT 1, status TEXT DEFAULT 'ACTIVE', is_active INTEGER DEFAULT 1, last_login TEXT, updated_at TEXT);

CREATE TABLE IF NOT EXISTS companies (
            id SERIAL PRIMARY KEY,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            name TEXT NOT NULL,
            domain TEXT,
            normalized_domain TEXT,
            industry TEXT,
            sub_industry TEXT,
            size_range TEXT,
            employee_count INTEGER DEFAULT 0,
            annual_revenue_est REAL DEFAULT 0.0,
            country TEXT,
            state TEXT,
            city TEXT,
            address TEXT,
            postal_code TEXT,
            phone TEXT,
            website TEXT,
            linkedin_url TEXT,
            twitter_url TEXT,
            facebook_url TEXT,
            tech_stack TEXT, -- JSON
            cms TEXT,
            analytics_stack TEXT, -- JSON
            lead_score INTEGER DEFAULT 0,
            icp_score INTEGER DEFAULT 0,
            buying_intent_score INTEGER DEFAULT 0,
            account_tier TEXT DEFAULT 'Tier 3',
            status TEXT DEFAULT 'Prospect',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

CREATE TABLE IF NOT EXISTS contacts (
            id SERIAL PRIMARY KEY,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            company_id INTEGER,
            lead_id INTEGER,
            first_name TEXT,
            last_name TEXT,
            full_name TEXT,
            title TEXT,
            role TEXT,
            seniority TEXT,
            email TEXT,
            email_status TEXT DEFAULT 'Unverified',
            email_confidence REAL DEFAULT 0.0,
            phone TEXT,
            mobile_phone TEXT,
            linkedin_url TEXT,
            twitter_handle TEXT,
            contactability_score INTEGER DEFAULT 0,
            is_decision_maker INTEGER DEFAULT 0,
            do_not_contact INTEGER DEFAULT 0,
            unsubscribed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

CREATE TABLE IF NOT EXISTS email_accounts (
            id SERIAL PRIMARY KEY,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            account_name TEXT NOT NULL,
            sender_name TEXT NOT NULL,
            sender_email TEXT NOT NULL,
            provider_type TEXT NOT NULL DEFAULT 'SMTP', -- Gmail_OAuth, Outlook_OAuth, SMTP
            host TEXT,
            port INTEGER,
            username TEXT,
            encrypted_password TEXT,
            oauth_token_json TEXT, -- Masked/Encrypted
            daily_limit INTEGER DEFAULT 150,
            sent_today INTEGER DEFAULT 0,
            last_sent_at TEXT,
            is_active INTEGER DEFAULT 1,
            health_status TEXT DEFAULT 'Healthy', -- Healthy, Warning, Action Required, Degraded
            spf_status TEXT DEFAULT 'Unknown',
            dkim_status TEXT DEFAULT 'Unknown',
            dmarc_status TEXT DEFAULT 'Unknown',
            mx_status TEXT DEFAULT 'Unknown',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

CREATE TABLE IF NOT EXISTS email_campaigns (
            id SERIAL PRIMARY KEY,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            name TEXT NOT NULL,
            status TEXT DEFAULT 'Draft', -- Draft, Review, Approved, Scheduled, Active, Paused, Completed, Archived
            email_account_id INTEGER,
            audience_filter TEXT, -- JSON criteria
            total_recipients INTEGER DEFAULT 0,
            sent_count INTEGER DEFAULT 0,
            delivered_count INTEGER DEFAULT 0,
            opened_count INTEGER DEFAULT 0,
            replied_count INTEGER DEFAULT 0,
            bounced_count INTEGER DEFAULT 0,
            unsubscribed_count INTEGER DEFAULT 0,
            stop_on_reply INTEGER DEFAULT 1,
            stop_on_bounce INTEGER DEFAULT 1,
            stop_on_unsubscribe INTEGER DEFAULT 1,
            schedule_start TEXT,
            schedule_end TEXT,
            business_hours_only INTEGER DEFAULT 1,
            daily_limit INTEGER DEFAULT 50,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

CREATE TABLE IF NOT EXISTS whatsapp_templates (
            id SERIAL PRIMARY KEY,
            account_id INTEGER NOT NULL,
            template_name TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'MARKETING', -- MARKETING, UTILITY, AUTHENTICATION
            language TEXT NOT NULL DEFAULT 'en_US',
            status TEXT DEFAULT 'APPROVED', -- APPROVED, PENDING, REJECTED
            header_text TEXT,
            body_text TEXT NOT NULL,
            footer_text TEXT,
            variable_count INTEGER DEFAULT 0,
            sample_variables TEXT, -- JSON
            created_at TEXT NOT NULL
        );

CREATE TABLE IF NOT EXISTS whatsapp_suppressions (
            id SERIAL PRIMARY KEY,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            phone_number TEXT UNIQUE NOT NULL,
            reason TEXT DEFAULT 'User Opt-Out',
            created_at TEXT NOT NULL
        , business_name TEXT);

CREATE TABLE IF NOT EXISTS crm_deals (
            id SERIAL PRIMARY KEY,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            title TEXT NOT NULL,
            company_id INTEGER,
            lead_id INTEGER,
            contact_id INTEGER,
            stage TEXT NOT NULL DEFAULT 'Lead', 
            -- Stages: Lead, Qualified, Contacted, Engaged, Meeting, Proposal, Negotiation, Won, Lost, Nurture
            amount REAL DEFAULT 0.0,
            currency TEXT DEFAULT 'USD',
            probability INTEGER DEFAULT 10,
            expected_value REAL DEFAULT 0.0,
            expected_close_date TEXT,
            owner TEXT DEFAULT 'Sales Lead',
            source TEXT DEFAULT 'Outreach',
            loss_reason TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

CREATE TABLE IF NOT EXISTS account_audit_logs (
            id SERIAL PRIMARY KEY,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            actor TEXT NOT NULL DEFAULT 'User',
            account_id INTEGER,
            action TEXT NOT NULL,                  -- 'connected', 'disconnected', 'updated', 'enabled', 'disabled', 'test_sent', 'campaign_sent', 'token_refreshed', 'auth_failed'
            result TEXT NOT NULL,                  -- 'SUCCESS', 'FAILED', 'WARNING'
            details TEXT,                          -- Safe sanitized JSON summary
            timestamp TEXT NOT NULL
        );

CREATE TABLE IF NOT EXISTS user_activity_logs (
            id SERIAL PRIMARY KEY,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            user_id INTEGER,
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id TEXT,
            details TEXT,
            ip_address TEXT,
            created_at TEXT NOT NULL
        );

CREATE TABLE IF NOT EXISTS system_notifications (
            id SERIAL PRIMARY KEY,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
            category TEXT DEFAULT 'system',
            is_read INTEGER DEFAULT 0,
            link TEXT,
            created_at TEXT NOT NULL
        );
