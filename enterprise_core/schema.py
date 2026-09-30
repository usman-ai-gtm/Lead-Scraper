"""
USMAN DATA ANALYTICS - ENTERPRISE DATABASE SCHEMA EXTENSION
Ultra Pro Max Additive Database Layer.
Preserves all existing tables and data structures while safely creating enterprise tables.
"""

import sqlite3
import os
import logging
from datetime import datetime

logger = logging.getLogger("USMAN_ENTERPRISE_SCHEMA")

DEFAULT_DB_PATH = os.getenv("USMAN_DB_PATH", "usman_data_analytics.db")

def get_enterprise_db_connection(db_path: str = DEFAULT_DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_enterprise_schema(db_path: str = DEFAULT_DB_PATH):
    """
    Idempotent additive schema initializer for Usman Data Analytics Enterprise Expansion.
    Uses CREATE TABLE IF NOT EXISTS and safe column additions.
    """
    conn = get_enterprise_db_connection(db_path)
    cur = conn.cursor()

    # 1. Accounts & Companies
    cur.execute('''
        CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        )
    ''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(normalized_domain)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_companies_ws ON companies(workspace_id)')

    # 2. Contacts
    cur.execute('''
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        )
    ''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id)')

    # 3. Account Domains & Contact Methods
    cur.execute('''
        CREATE TABLE IF NOT EXISTS account_domains (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            domain TEXT NOT NULL,
            is_primary INTEGER DEFAULT 1,
            verified INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS contact_methods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contact_id INTEGER NOT NULL,
            channel TEXT NOT NULL, -- Email, WhatsApp, Phone, LinkedIn
            value TEXT NOT NULL,
            is_primary INTEGER DEFAULT 1,
            verification_status TEXT DEFAULT 'Pending',
            opt_in_status TEXT DEFAULT 'Unknown',
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS social_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_type TEXT NOT NULL, -- contact or company
            entity_id INTEGER NOT NULL,
            platform TEXT NOT NULL, -- linkedin, twitter, facebook, youtube, reddit
            profile_url TEXT NOT NULL,
            handle TEXT,
            follower_count INTEGER DEFAULT 0,
            verified INTEGER DEFAULT 0,
            metadata_json TEXT,
            last_scraped_at TEXT
        )
    ''')

    # 4. Search Runs, Queries & Sources
    cur.execute('''
        CREATE TABLE IF NOT EXISTS search_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            keyword TEXT NOT NULL,
            mode TEXT NOT NULL DEFAULT 'Standard',
            location TEXT,
            country TEXT,
            industry TEXT,
            total_found INTEGER DEFAULT 0,
            duplicates_removed INTEGER DEFAULT 0,
            valid_leads INTEGER DEFAULT 0,
            enriched_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'Completed',
            duration_seconds REAL DEFAULT 0.0,
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS search_queries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            search_run_id INTEGER NOT NULL,
            query_text TEXT NOT NULL,
            query_type TEXT DEFAULT 'Keyword', -- Synonym, Intent, Geo, Platform
            provider TEXT DEFAULT 'Google',
            results_count INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS search_sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            search_run_id INTEGER NOT NULL,
            source_name TEXT NOT NULL, -- Serper, SerpApi, GoogleMaps, Directory, LinkedIn, Reddit
            source_url TEXT,
            item_count INTEGER DEFAULT 0,
            latency_ms REAL DEFAULT 0.0,
            confidence REAL DEFAULT 1.0,
            created_at TEXT NOT NULL
        )
    ''')

    # 5. Enrichment Runs & Results
    cur.execute('''
        CREATE TABLE IF NOT EXISTS enrichment_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            target_type TEXT NOT NULL DEFAULT 'Lead', -- Lead, Company, Contact
            target_id INTEGER NOT NULL,
            provider TEXT NOT NULL,
            fields_enriched TEXT, -- JSON
            status TEXT DEFAULT 'Success',
            duration_ms REAL DEFAULT 0.0,
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS enrichment_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            enrichment_run_id INTEGER NOT NULL,
            attribute_name TEXT NOT NULL,
            attribute_value TEXT,
            confidence REAL DEFAULT 0.0,
            provenance TEXT, -- Observed, Inferred, ExternalAPI
            created_at TEXT NOT NULL
        )
    ''')

    # 6. Email System: Accounts, Campaigns, Sequences, Queue, Events, Replies
    cur.execute('''
        CREATE TABLE IF NOT EXISTS email_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS email_campaigns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS email_sequences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            total_steps INTEGER DEFAULT 1,
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS email_sequence_steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sequence_id INTEGER NOT NULL,
            step_number INTEGER NOT NULL,
            step_type TEXT DEFAULT 'Initial', -- Initial, Followup_1, Value_Followup, CaseStudy_Followup, Final_Polite
            delay_days INTEGER DEFAULT 2,
            delay_hours INTEGER DEFAULT 0,
            subject_template TEXT NOT NULL,
            body_template TEXT NOT NULL,
            cta_template TEXT,
            ab_variation TEXT DEFAULT 'A', -- A or B
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS email_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER NOT NULL,
            step_id INTEGER,
            contact_id INTEGER,
            lead_id INTEGER,
            recipient_email TEXT NOT NULL,
            recipient_name TEXT,
            rendered_subject TEXT NOT NULL,
            rendered_body TEXT NOT NULL,
            status TEXT DEFAULT 'Queued', -- Queued, Sending, Sent, Failed, Paused, Suppressed, Bounced
            scheduled_for TEXT NOT NULL,
            sent_at TEXT,
            error_message TEXT,
            retry_count INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS email_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER,
            email_account_id INTEGER,
            recipient_email TEXT NOT NULL,
            sender_email TEXT NOT NULL,
            subject TEXT NOT NULL,
            body TEXT NOT NULL,
            message_id TEXT,
            thread_id TEXT,
            status TEXT DEFAULT 'Sent',
            sent_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS email_threads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER,
            contact_id INTEGER,
            recipient_email TEXT NOT NULL,
            thread_id TEXT UNIQUE NOT NULL,
            subject TEXT,
            last_message_at TEXT,
            message_count INTEGER DEFAULT 1,
            reply_detected INTEGER DEFAULT 0
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS email_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER,
            campaign_id INTEGER,
            recipient_email TEXT NOT NULL,
            event_type TEXT NOT NULL, -- Queued, Sent, Delivered, Opened, Clicked, Replied, Bounced, Unsubscribed, Suppressed
            details TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS email_suppressions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            email TEXT UNIQUE NOT NULL,
            domain TEXT,
            reason TEXT NOT NULL, -- Unsubscribe, Hard Bounce, Manual Opt-Out, Complaint
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS email_unsubscribes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER,
            email TEXT NOT NULL,
            ip_address TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS email_bounces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER,
            email TEXT NOT NULL,
            bounce_type TEXT DEFAULT 'Hard', -- Hard, Soft
            diagnostic_code TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS email_replies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER,
            contact_id INTEGER,
            lead_id INTEGER,
            sender_email TEXT NOT NULL,
            subject TEXT,
            body TEXT NOT NULL,
            classification TEXT DEFAULT 'Neutral', -- Interested, Meeting Requested, Question, Objection, Not Now, Pricing Request, Referral, Unsubscribe, Out of Office
            sentiment TEXT DEFAULT 'Neutral', -- Positive, Neutral, Negative
            urgency TEXT DEFAULT 'Normal', -- High, Normal, Low
            ai_summary TEXT,
            suggested_reply TEXT,
            handled INTEGER DEFAULT 0,
            received_at TEXT NOT NULL
        )
    ''')

    # 7. WhatsApp Business Cloud API Layer
    cur.execute('''
        CREATE TABLE IF NOT EXISTS whatsapp_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            account_name TEXT NOT NULL,
            waba_id TEXT NOT NULL, -- WhatsApp Business Account ID
            phone_number_id TEXT NOT NULL,
            display_phone_number TEXT NOT NULL,
            access_token TEXT NOT NULL, -- Masked/Stored securely
            webhook_verify_token TEXT,
            quality_rating TEXT DEFAULT 'GREEN', -- GREEN, YELLOW, RED
            health_status TEXT DEFAULT 'Healthy',
            last_synced_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS whatsapp_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS whatsapp_contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            phone_number TEXT NOT NULL,
            contact_name TEXT,
            business_name TEXT,
            opt_in_status TEXT DEFAULT 'Opted_In', -- Opted_In, Opted_Out, Pending
            opt_in_date TEXT,
            last_inbound_at TEXT,
            last_outbound_at TEXT,
            conversation_state TEXT DEFAULT 'Idle',
            created_at TEXT NOT NULL
        )
    ''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_wa_phone ON whatsapp_contacts(phone_number)')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS whatsapp_conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            contact_phone TEXT NOT NULL,
            contact_name TEXT,
            business_name TEXT,
            last_message_text TEXT,
            last_message_at TEXT NOT NULL,
            unread_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'Open', -- Open, Assigned, Pending, Closed
            assigned_to TEXT,
            ai_sentiment TEXT DEFAULT 'Neutral',
            ai_intent TEXT DEFAULT 'General Inquiry',
            tags TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS whatsapp_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            conversation_id INTEGER,
            direction TEXT NOT NULL DEFAULT 'Outbound', -- Outbound, Inbound
            sender_id TEXT NOT NULL,
            recipient_id TEXT NOT NULL,
            message_type TEXT DEFAULT 'text', -- text, template, image, document
            template_id INTEGER,
            body TEXT NOT NULL,
            wa_message_id TEXT,
            status TEXT DEFAULT 'Sent', -- Queued, Sent, Delivered, Read, Failed
            error_details TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS whatsapp_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER,
            event_type TEXT NOT NULL, -- Sent, Delivered, Read, Failed, Inbound_Reply
            payload_json TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS whatsapp_suppressions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            phone_number TEXT UNIQUE NOT NULL,
            reason TEXT DEFAULT 'User Opt-Out',
            created_at TEXT NOT NULL
        )
    ''')

    # 8. Unified Outreach Campaigns & Tasks
    cur.execute('''
        CREATE TABLE IF NOT EXISTS outreach_campaigns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            title TEXT NOT NULL,
            channels TEXT NOT NULL DEFAULT 'Email', -- Email, WhatsApp, MultiChannel
            status TEXT DEFAULT 'Draft',
            total_targets INTEGER DEFAULT 0,
            converted_count INTEGER DEFAULT 0,
            pipeline_generated REAL DEFAULT 0.0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS outreach_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            entity_type TEXT NOT NULL, -- Lead, Contact, Company
            entity_id INTEGER NOT NULL,
            channel TEXT NOT NULL, -- Email, WhatsApp, Phone, CRM, Web
            event_title TEXT NOT NULL,
            description TEXT,
            sentiment TEXT DEFAULT 'Neutral',
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS outreach_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            title TEXT NOT NULL,
            channel TEXT DEFAULT 'Email',
            due_date TEXT NOT NULL,
            priority TEXT DEFAULT 'High', -- Urgent, High, Medium, Low
            status TEXT DEFAULT 'Pending', -- Pending, In Progress, Completed, Cancelled
            assigned_to TEXT,
            entity_type TEXT,
            entity_id INTEGER,
            notes TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    # 9. Enterprise CRM: Deals, Activities, Tasks, Notes, Stage History
    cur.execute('''
        CREATE TABLE IF NOT EXISTS crm_deals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        )
    ''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_deals_stage ON crm_deals(stage)')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS crm_activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            deal_id INTEGER,
            lead_id INTEGER,
            contact_id INTEGER,
            activity_type TEXT NOT NULL, -- Call, Email, Meeting, WhatsApp, Note, StageChange
            title TEXT NOT NULL,
            description TEXT,
            performed_by TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS crm_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            deal_id INTEGER,
            contact_id INTEGER,
            title TEXT NOT NULL,
            due_date TEXT,
            priority TEXT DEFAULT 'Normal',
            is_completed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS crm_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            deal_id INTEGER,
            lead_id INTEGER,
            contact_id INTEGER,
            author TEXT,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS crm_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            entity_type TEXT NOT NULL,
            entity_id INTEGER NOT NULL,
            tag_name TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS crm_stage_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deal_id INTEGER NOT NULL,
            from_stage TEXT,
            to_stage TEXT NOT NULL,
            changed_by TEXT,
            changed_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS pipeline_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            snapshot_date TEXT NOT NULL,
            total_deals INTEGER DEFAULT 0,
            total_pipeline REAL DEFAULT 0.0,
            weighted_pipeline REAL DEFAULT 0.0,
            stage_distribution TEXT, -- JSON
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS forecast_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            forecast_period TEXT NOT NULL, -- Q1, Q2, Month
            conservative_amount REAL DEFAULT 0.0,
            expected_amount REAL DEFAULT 0.0,
            upside_amount REAL DEFAULT 0.0,
            assumptions TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS revenue_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            deal_id INTEGER,
            event_type TEXT NOT NULL, -- Closed_Won, Upsell, Renewal, Churn
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'USD',
            event_date TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')

    # 10. Customer Success & Retention
    cur.execute('''
        CREATE TABLE IF NOT EXISTS customer_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            company_name TEXT NOT NULL,
            contract_value REAL DEFAULT 0.0,
            start_date TEXT,
            renewal_date TEXT,
            health_score INTEGER DEFAULT 85,
            health_status TEXT DEFAULT 'Good', -- Good, Neutral, At Risk
            csm_owner TEXT,
            churn_risk_percent INTEGER DEFAULT 10,
            onboarding_progress INTEGER DEFAULT 100,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS customer_health_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_account_id INTEGER NOT NULL,
            score INTEGER NOT NULL,
            score_factors TEXT, -- JSON
            calculated_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS renewals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_account_id INTEGER NOT NULL,
            renewal_date TEXT NOT NULL,
            target_arr REAL DEFAULT 0.0,
            status TEXT DEFAULT 'Upcoming', -- Upcoming, Negotiating, Renewed, Churned
            risk_notes TEXT,
            updated_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS support_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_account_id INTEGER NOT NULL,
            ticket_id TEXT,
            subject TEXT NOT NULL,
            sentiment TEXT DEFAULT 'Neutral',
            resolution_status TEXT DEFAULT 'Open',
            created_at TEXT NOT NULL
        )
    ''')

    # 11. Sales Enablement, Battlecards & Playbooks
    cur.execute('''
        CREATE TABLE IF NOT EXISTS enablement_content (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL, -- Battlecard, Playbook, Objection, CaseStudy, PitchDeck
            target_industry TEXT,
            content TEXT NOT NULL,
            tags TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS playbooks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            trigger_scenario TEXT NOT NULL,
            action_steps TEXT NOT NULL, -- JSON
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS experiments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            channel TEXT DEFAULT 'Email',
            variation_a TEXT NOT NULL,
            variation_b TEXT NOT NULL,
            results_a TEXT, -- JSON
            results_b TEXT, -- JSON
            winner TEXT,
            status TEXT DEFAULT 'Running',
            created_at TEXT NOT NULL
        )
    ''')

    # 12. ABM (Account-Based Marketing) & Audiences
    cur.execute('''
        CREATE TABLE IF NOT EXISTS abm_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            company_id INTEGER,
            company_name TEXT NOT NULL,
            tier TEXT DEFAULT 'Tier 1', -- Tier 1, Tier 2, Tier 3
            buying_intent_score INTEGER DEFAULT 0,
            engagement_score INTEGER DEFAULT 0,
            assigned_rep TEXT,
            status TEXT DEFAULT 'Active',
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS audiences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            name TEXT NOT NULL,
            description TEXT,
            filter_definition TEXT NOT NULL, -- JSON
            member_count INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    ''')

    # 13. Sales Automation & Workflows
    cur.execute('''
        CREATE TABLE IF NOT EXISTS workflows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            name TEXT NOT NULL,
            description TEXT,
            trigger_event TEXT NOT NULL, -- Lead_Created, High_Score_Detected, Reply_Received, Deal_Stage_Changed
            conditions_json TEXT, -- Conditions list
            actions_json TEXT, -- Steps/Actions list
            is_active INTEGER DEFAULT 1,
            execution_count INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS automation_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id INTEGER NOT NULL,
            trigger_payload TEXT,
            action_log TEXT,
            status TEXT DEFAULT 'Success', -- Success, Failed, Paused
            error_message TEXT,
            executed_at TEXT NOT NULL
        )
    ''')

    # 14. Webhooks, API Usage & Observability
    cur.execute('''
        CREATE TABLE IF NOT EXISTS webhook_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL, -- WhatsApp, Gmail, Hubspot, Custom
            event_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            status TEXT DEFAULT 'Processed',
            received_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS api_usage_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            status_code INTEGER,
            latency_ms REAL,
            cost_usd REAL DEFAULT 0.0,
            tokens_used INTEGER DEFAULT 0,
            timestamp TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS provider_health_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_name TEXT NOT NULL,
            health_status TEXT NOT NULL, -- Healthy, Degraded, Down
            latency_ms REAL DEFAULT 0.0,
            error_message TEXT,
            checked_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS ai_cost_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_type TEXT NOT NULL,
            model_name TEXT NOT NULL,
            input_tokens INTEGER DEFAULT 0,
            output_tokens INTEGER DEFAULT 0,
            cost_usd REAL DEFAULT 0.0,
            created_at TEXT NOT NULL
        )
    ''')

    # 15. Compliance, Governance & Data Subject Requests
    cur.execute('''
        CREATE TABLE IF NOT EXISTS consent_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contact_identifier TEXT NOT NULL, -- Email or Phone
            identifier_type TEXT NOT NULL, -- Email, WhatsApp, SMS
            consent_type TEXT NOT NULL, -- B2B_Legitimate_Interest, Explicit_OptIn
            consent_source TEXT NOT NULL,
            status TEXT DEFAULT 'Granted', -- Granted, Revoked, Expired
            granted_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS data_subject_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_email TEXT NOT NULL,
            request_type TEXT NOT NULL, -- Access, Erasure, Rectification, Restriction
            status TEXT DEFAULT 'Pending', -- Pending, Completed, Rejected
            details TEXT,
            requested_at TEXT NOT NULL,
            completed_at TEXT
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS compliance_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_category TEXT NOT NULL, -- OptOut, DSR, SuppressionCheck, PolicyCheck
            description TEXT NOT NULL,
            actor TEXT DEFAULT 'System',
            created_at TEXT NOT NULL
        )
    ''')

    # 16. In-App Notifications & Alerts
    cur.execute('''
        CREATE TABLE IF NOT EXISTS notification_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            severity TEXT DEFAULT 'Info', -- Info, Success, Warning, Urgent
            category TEXT DEFAULT 'Outreach', -- Lead, Campaign, System, Compliance, Deal
            is_read INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    ''')

    # 17. System, Workspace & User Settings, Roles & Feature Flags
    cur.execute('''
        CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS workspace_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(workspace_id, key)
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS user_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL DEFAULT 1,
            theme TEXT DEFAULT 'Dark',
            notification_preferences TEXT,
            updated_at TEXT NOT NULL
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS roles_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role_name TEXT NOT NULL, -- Admin, Manager, Operator, Analyst, Viewer
            permission TEXT NOT NULL,
            is_enabled INTEGER DEFAULT 1
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS feature_flags (
            feature_key TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            is_enabled INTEGER DEFAULT 1,
            description TEXT
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS integration_connections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_category TEXT NOT NULL, -- Search, AI, Email, WhatsApp, CRM, Calendar, Webhook
            provider_name TEXT NOT NULL,
            is_connected INTEGER DEFAULT 0,
            credentials_masked TEXT,
            config_json TEXT,
            health_status TEXT DEFAULT 'Not Configured', -- Healthy, Warning, Error, Not Configured
            last_checked_at TEXT,
            last_error TEXT
        )
    ''')

    conn.commit()
    conn.close()
    logger.info("Enterprise database schema successfully initialized (idempotent & additive).")

if __name__ == "__main__":
    init_enterprise_schema()
    print("Enterprise schema initialization completed successfully.")
