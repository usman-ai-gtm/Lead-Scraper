const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

function getDbUrl() {
  const p = "C:/Users/Dell/.config/neon/db_url.txt";
  if (fs.existsSync(p)) {
    return fs.readFileSync(p, "utf8").trim();
  }
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (match) return match[1];
  }
  return null;
}

const dbUrl = getDbUrl();
if (!dbUrl) {
  console.error("Database connection URL not found.");
  process.exit(1);
}

const sql = neon(dbUrl);

async function runMigration() {
  console.log("=== STARTING PRODUCT UPGRADE DATABASE MIGRATION ===");

  // 1. Check existing leads and add normalized columns
  console.log("1. Adding normalized columns to leads table...");
  await sql`
    ALTER TABLE leads 
    ADD COLUMN IF NOT EXISTS normalized_domain text,
    ADD COLUMN IF NOT EXISTS normalized_email text,
    ADD COLUMN IF NOT EXISTS normalized_phone text,
    ADD COLUMN IF NOT EXISTS place_id text,
    ADD COLUMN IF NOT EXISTS dedup_hash text;
  `;

  // Populate normalized values for any existing leads safely
  console.log("2. Populating normalized values for existing leads...");
  await sql`
    UPDATE leads SET
      normalized_domain = LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(COALESCE(domain, website, ''), '^https?://(www\\.)?', ''), '/.*$', ''))),
      normalized_email = LOWER(TRIM(COALESCE(email, ''))),
      normalized_phone = REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9+]', '', 'g')
    WHERE normalized_domain IS NULL OR normalized_email IS NULL;
  `;

  // Create unique partial indexes for account-level deduplication
  console.log("3. Creating account-level deduplication unique indexes...");
  
  // Safe cleanup of any pre-existing duplicate records per workspace
  await sql`
    DELETE FROM leads a USING leads b
    WHERE a.id < b.id 
      AND a.workspace_id = b.workspace_id 
      AND a.normalized_email = b.normalized_email 
      AND a.normalized_email != '' 
      AND a.normalized_email IS NOT NULL;
  `;

  await sql`
    DELETE FROM leads a USING leads b
    WHERE a.id < b.id 
      AND a.workspace_id = b.workspace_id 
      AND a.normalized_domain = b.normalized_domain 
      AND a.normalized_domain != '' 
      AND a.normalized_domain IS NOT NULL;
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_ws_normalized_email 
    ON leads (workspace_id, normalized_email) 
    WHERE normalized_email IS NOT NULL AND normalized_email != '';
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_ws_normalized_domain 
    ON leads (workspace_id, normalized_domain) 
    WHERE normalized_domain IS NOT NULL AND normalized_domain != '';
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_ws_place_id 
    ON leads (workspace_id, place_id) 
    WHERE place_id IS NOT NULL AND place_id != '';
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_leads_ws_created_at 
    ON leads (workspace_id, created_at DESC);
  `;

  // 4. Create active search jobs table for 1 active search per account
  console.log("4. Creating active_search_jobs table...");
  await sql`
    CREATE TABLE IF NOT EXISTS active_search_jobs (
      id text PRIMARY KEY,
      workspace_id integer NOT NULL,
      user_id integer NOT NULL,
      job_type text NOT NULL DEFAULT 'WEB_SEARCH',
      status text NOT NULL DEFAULT 'RUNNING',
      keyword text NOT NULL,
      country text,
      city text,
      target_count integer DEFAULT 50,
      progress_count integer DEFAULT 0,
      progress_message text,
      error_message text,
      search_record_id text,
      created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_active_jobs_ws_status 
    ON active_search_jobs (workspace_id, status, updated_at DESC);
  `;

  // 5. Create email templates table
  console.log("5. Creating email_templates table...");
  await sql`
    CREATE TABLE IF NOT EXISTS email_templates (
      id serial PRIMARY KEY,
      workspace_id integer NOT NULL,
      name text NOT NULL,
      subject text NOT NULL,
      body text NOT NULL,
      category text DEFAULT 'OUTREACH',
      is_default boolean DEFAULT false,
      created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_email_templates_ws 
    ON email_templates (workspace_id, id ASC);
  `;

  // 6. Create chat conversations and messages tables
  console.log("6. Creating chat_conversations and chat_messages tables...");
  await sql`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id text PRIMARY KEY,
      workspace_id integer NOT NULL,
      user_id integer NOT NULL,
      title text NOT NULL,
      detected_language text DEFAULT 'english',
      business_context jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_chat_conv_ws 
    ON chat_conversations (workspace_id, updated_at DESC);
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id serial PRIMARY KEY,
      conversation_id text NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      workspace_id integer NOT NULL,
      role text NOT NULL,
      content text NOT NULL,
      suggested_actions jsonb DEFAULT '[]'::jsonb,
      created_at timestamptz DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_chat_msg_conv 
    ON chat_messages (conversation_id, id ASC);
  `;

  console.log("=== MIGRATION COMPLETED SUCCESSFULLY ===");
}

runMigration().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
