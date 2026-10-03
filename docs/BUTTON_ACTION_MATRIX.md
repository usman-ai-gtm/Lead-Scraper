# USMAN AI GTM — Button & Action Contract Matrix

> **Contract Requirement:** Every single button, link, filter, modal, and action in the application MUST map to a real API endpoint, backend service, database mutation, or configuration wizard.

| Page / Surface | Button / Action Label | Action Description | API Endpoint | Backend Service | Database Effect | External API Dependency | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Homepage (/) | **START FREE** | Redirect to Registration | `/signup` | `Client Router` | `None` | `None` | Opens /signup |
| Homepage (/) | **EXPLORE PLATFORM** | Navigate to Features Overview | `/features` | `Client Router` | `None` | `None` | Opens /features |
| Homepage (/) | **LOGIN** | Navigate to Authentication | `/login` | `Client Router` | `None` | `None` | Opens /login |
| Homepage (/) | **LAUNCH PLATFORM** | Authenticate & enter App | `/login` | `Client Router` | `None` | `None` | Enters SaaS Dashboard |
| Navbar | **Features** | View Feature Capabilities | `/features` | `Client Router` | `None` | `None` | Opens /features |
| Navbar | **Solutions** | View Enterprise Solutions | `/solutions` | `Client Router` | `None` | `None` | Opens /solutions |
| Navbar | **Pricing** | View Pricing Plans | `/pricing` | `Client Router` | `None` | `None` | Opens /pricing |
| Navbar | **Resources** | View Playbooks & Docs | `/resources` | `Client Router` | `None` | `None` | Opens /resources |
| Navbar | **About** | View Mission & SOC2 Compliance | `/about` | `Client Router` | `None` | `None` | Opens /about |
| Login Page | **Fill Demo Admin** | Auto-populate demo credentials | `State Fill` | `Client Form` | `None` | `None` | Fills admin@usmanai.com |
| Login Page | **Sign In to Enterprise App** | Authenticate credentials | `/api/auth/login` | `auth.py` | `UPDATE users.last_login` | `None` | Sets JWT & redirects to /app |
| Signup Page | **Create Enterprise Account** | Register new tenant & user | `/api/auth/signup` | `auth.py` | `INSERT INTO users, workspaces` | `None` | Sets JWT & redirects to /app |
| Onboarding | **Next Step / Complete** | Progress 8-step wizard | `/api/workspaces` | `auth.py` | `UPDATE workspaces` | `None` | Enters Command Center |
| App Topbar | **Ctrl + K Command Palette** | Open Universal Search Modal | `/api/copilot/search` | `copilot_service.py` | `SELECT leads, companies` | `None` | Displays live instant search results |
| App Topbar | **Notifications Bell** | Toggle Notifications Popover | `/api/analytics/overview` | `analytics_service.py` | `SELECT system_notifications` | `None` | Displays unread event feed |
| App Topbar | **Logout** | Clear JWT & redirect | `/login` | `auth-context.tsx` | `Session Cleared` | `None` | Redirects to /login |
| Command Center | **Find High Intent Leads** | Filter top scoring leads | `/app/leads?filter=hot` | `lead_service.py` | `SELECT leads WHERE score >= 80` | `None` | Opens Leads table filtered |
| Command Center | **Create Cadence** | Open Campaign Builder | `/app/outreach` | `Client Router` | `None` | `None` | Opens Cadence creation screen |
| Find Leads | **Run Discovery Search** | Search and insert leads | `/api/leads/search` | `lead_service.py` | `INSERT INTO leads` | `Serper/Tavily` | Populates table with fresh accounts |
| Find Leads | **Enrich Selected Leads** | Extract tech stack & contacts | `/api/leads/enrich` | `lead_service.py` | `UPDATE leads.tech_stack` | `Provider Vault` | Enriches table with live data |
| Find Leads | **Validate Data** | Verify syntax & contactability | `/api/leads/validate` | `lead_service.py` | `UPDATE leads.data_confidence` | `None` | Updates validation badges |
| Find Leads | **Score ICP** | Compute 100-point fit score | `/api/leads/score` | `lead_service.py` | `UPDATE leads.lead_score` | `Scoring Engine` | Refreshes animated score rings |
| Find Leads | **Export CSV** | Download filtered lead table | `/api/leads/export` | `lead_service.py` | `None` | `None` | Triggers browser CSV download |
| AI Research | **Analyze Account** | Deep research company | `/api/research` | `research_service.py` | `SELECT evidence, UPDATE lead` | `Multi-AI Provider` | Displays 360 overview & pitch |
| CRM Pipeline | **New Deal** | Open Deal Creation Modal | `/api/crm/deals` | `crm_service.py` | `INSERT INTO crm_deals` | `None` | Adds deal to Kanban column |
| CRM Pipeline | **Drag/Drop Stage Transition** | Update Deal Stage | `/api/crm/deals/{id}/stage` | `crm_service.py` | `UPDATE crm_deals.stage` | `None` | Updates pipeline metrics live |
| Outreach | **Launch Cadence** | Create Multi-Step Campaign | `/api/campaigns` | `campaign_service.py` | `INSERT INTO email_campaigns` | `None` | Queues sequence steps |
| Connected Accounts | **Connect Gmail** | Initiate Google OAuth 2.0 | `/api/campaigns/accounts` | `u401_gmail_oauth_url` | `INSERT INTO connected_accounts` | `Google OAuth` | Redirects to Google Consent |
| Connected Accounts | **Configure Meta WhatsApp** | Open WABA Wizard | `/api/campaigns/whatsapp/setup` | `campaign_service.py` | `UPDATE provider_config` | `Meta Cloud API` | Saves WABA credentials |
| Connected Accounts | **Send Test Message** | Verify inbox deliverability | `/api/campaigns/test-send` | `campaign_service.py` | `INSERT INTO activities` | `SMTP / Google API` | Dispatches verified test ping |
| Universal Features | **Execute Feature (1-600)** | Run feature with context | `/api/features/{id}/execute` | `universal_features_service.py` | `INSERT INTO feature_execution_logs` | `Target Engine` | Displays structured results & evidence |
| Universal Features | **Dry Run Toggle** | Simulate without mutations | `/api/features/{id}/execute` | `universal_features_service.py` | `None` | `Target Engine` | Validates contracts without side-effects |
| Revenue Intelligence | **Simulate Scenarios** | Run Monte Carlo ARR projection | `/api/features-lab/execute` | `features_501_600_service.py` | `SELECT crm_deals` | `None` | Renders ARR probability curves |
| Customer Success | **Generate QBR Deck** | Produce executive slide brief | `/api/features-lab/execute` | `features_501_600_service.py` | `SELECT leads, activities` | `None` | Generates structured QBR payload |
| AI Copilot | **Send Natural Language Prompt** | Execute Copilot command | `/api/copilot/chat` | `copilot_service.py` | `SELECT database entities` | `Multi-AI Engine` | Returns answer & action button |
| Admin Panel | **Update User Role** | Modify RBAC permission | `/api/admin/users/{id}/role` | `admin.py` | `UPDATE users.role` | `None` | Enforces server-side permissions |