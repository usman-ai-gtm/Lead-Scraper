# USMAN AI GTM — REST API Reference (v1)

Base URL: `http://localhost:8000/api` (Development) / `https://api.usmanai.com/api` (Production)  
Interactive OpenAPI Swagger Docs: `http://localhost:8000/docs`

---

## 1. Authentication (`/api/auth`)
### `POST /api/auth/login`
- **Description:** Authenticates user credentials using PBKDF2-HMAC-SHA256 password verification and issues a signed JWT token.
- **Request Body:**
  ```json
  {
    "email": "admin@usmanai.com",
    "password": "UsmanGTM@2026!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "email": "admin@usmanai.com",
      "full_name": "Administrator",
      "role": "ADMIN",
      "workspace_id": 1
    }
  }
  ```

### `POST /api/auth/signup`
- **Description:** Creates a new tenant, workspace, and admin user with hashed password.

### `GET /api/auth/me`
- **Headers:** `Authorization: Bearer <token>`
- **Description:** Returns profile and workspace metadata for the active token.

---

## 2. Lead Discovery & Intelligence (`/api/leads`)
### `GET /api/leads`
- **Query Parameters:** `page`, `page_size`, `keyword`, `country`, `min_score`
- **Description:** Returns paginated, normalized leads from the enterprise database.

### `POST /api/leads/search`
- **Request Body:** `{"keyword": "Digital Agencies", "country": "United States", "limit": 25}`
- **Description:** Triggers background discovery across configured search providers (Serper, SerpApi, Tavily).

### `POST /api/leads/enrich`
- **Request Body:** `{"lead_ids": [1, 2, 3]}`
- **Description:** Enriches leads with tech stack, company size, and executive classification.

### `GET /api/leads/export`
- **Description:** Generates and streams a CSV export of active leads.

---

## 3. CRM & Pipeline (`/api/crm`)
### `GET /api/crm/pipeline`
- **Description:** Returns complete 9-stage Kanban board with deals grouped by stage and revenue summaries.
- **Stages:** `NEW`, `QUALIFIED`, `CONTACTED`, `REPLIED`, `MEETING`, `PROPOSAL`, `NEGOTIATION`, `WON`, `LOST`.

### `POST /api/crm/deals`
- **Request Body:** `{"title": "Enterprise Contract", "stage": "PROPOSAL", "amount": 45000.0, "probability": 75}`

---

## 4. Universal Feature Execution (`/api/features`)
### `GET /api/features/catalog`
- **Description:** Returns metadata for all 600 features across tiers 1–600.

### `POST /api/features/{feature_id}/execute`
- **Path Parameter:** `feature_id` (1–600)
- **Request Body:**
  ```json
  {
    "workspace_id": 1,
    "lead_id": 10,
    "context": {"custom_param": "value"},
    "mode": "QUALITY MODE",
    "dry_run": false
  }
  ```
- **Description:** Dispatches dynamically to the underlying Python engine in `app.py` and logs the run to `feature_execution_logs`.

---

## 5. Multi-AI Providers (`/api/providers`)
### `GET /api/providers/health`
- **Description:** Returns status, masked keys (`sk-••••••••`), priority, and live latency for all 29 AI & Search providers.

---

## 6. AI Sales Copilot (`/api/copilot`)
### `POST /api/copilot/chat`
- **Request Body:** `{"message": "Summarize my current sales pipeline"}`
- **Description:** Returns conversational intelligence and recommended action buttons (`action_suggested`, `action_payload`).
