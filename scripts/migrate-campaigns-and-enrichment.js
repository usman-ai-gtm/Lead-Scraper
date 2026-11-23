const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

function getDbUrl() {
  const p = "C:/Users/Dell/.config/neon/db_url.txt";
  if (fs.existsSync(p)) {
    return fs.readFileSync(p, "utf8").trim().replace('&channel_binding=require', '');
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
  console.log("=== STARTING CAMPAIGNS & LEAD ENRICHMENT MIGRATION ===");

  // 1. Add social and enrichment columns to leads
  console.log("1. Adding social, enrichment & quality score columns to leads...");
  await sql`
    ALTER TABLE leads 
    ADD COLUMN IF NOT EXISTS instagram text,
    ADD COLUMN IF NOT EXISTS facebook text,
    ADD COLUMN IF NOT EXISTS linkedin text,
    ADD COLUMN IF NOT EXISTS twitter text,
    ADD COLUMN IF NOT EXISTS youtube text,
    ADD COLUMN IF NOT EXISTS tiktok text,
    ADD COLUMN IF NOT EXISTS quality_score integer DEFAULT 50,
    ADD COLUMN IF NOT EXISTS quality_category text DEFAULT 'Fair',
    ADD COLUMN IF NOT EXISTS quality_reasons jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS contact_requirement text DEFAULT 'EMAIL_AND_PHONE',
    ADD COLUMN IF NOT EXISTS is_enriched boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS enriched_at timestamptz,
    ADD COLUMN IF NOT EXISTS enrichment_data jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS campaign_id text;
  `;

  // 2. Create campaigns table
  console.log("2. Creating campaigns table...");
  await sql`
    CREATE TABLE IF NOT EXISTS campaigns (
      id text PRIMARY KEY,
      workspace_id integer NOT NULL,
      name text NOT NULL,
      campaign_type text NOT NULL DEFAULT 'FIND_LEADS',
      keyword text NOT NULL,
      countries jsonb NOT NULL DEFAULT '[]'::jsonb,
      target_quantity integer NOT NULL DEFAULT 50,
      contact_requirement text NOT NULL DEFAULT 'EMAIL_AND_PHONE',
      search_mode text DEFAULT 'STANDARD',
      status text NOT NULL DEFAULT 'PENDING',
      current_country text,
      candidates_processed integer DEFAULT 0,
      eligible_leads_count integer DEFAULT 0,
      duplicates_skipped integer DEFAULT 0,
      missing_contact_count integer DEFAULT 0,
      errors_count integer DEFAULT 0,
      progress_percent integer DEFAULT 0,
      search_variations jsonb DEFAULT '[]'::jsonb,
      country_stats jsonb DEFAULT '{}'::jsonb,
      error_message text,
      created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
      completed_at timestamptz
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_campaigns_ws_updated 
    ON campaigns (workspace_id, updated_at DESC);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_campaigns_status 
    ON campaigns (workspace_id, status);
  `;

  // 3. Create lead_enrichment_logs table
  console.log("3. Creating lead_enrichment_logs table...");
  await sql`
    CREATE TABLE IF NOT EXISTS lead_enrichment_logs (
      id serial PRIMARY KEY,
      workspace_id integer NOT NULL,
      lead_id integer NOT NULL,
      changes jsonb NOT NULL,
      source text,
      created_at timestamptz DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_lead_enrich_logs 
    ON lead_enrichment_logs (workspace_id, lead_id, created_at DESC);
  `;

  console.log("=== MIGRATION COMPLETED SUCCESSFULLY ===");
}

runMigration().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
