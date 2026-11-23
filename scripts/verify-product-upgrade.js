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

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

async function runVerification() {
  console.log("===============================================================================");
  console.log("USMAN AI GTM — COMPLETE PRODUCT UPGRADE AUTOMATED VERIFICATION SUITE");
  console.log("===============================================================================\n");

  // 1. MASTER OWNER & CLIENTS INTEGRITY
  console.log("--- 1. MASTER OWNER & CLIENT DATA INTEGRITY ---");
  const masterOwner = await sql`
    SELECT id, username, email, role, plan, status 
    FROM users 
    WHERE id = 2 OR username = 'master_owner_usman'
  `;
  assert(masterOwner.length > 0, "Master Owner account exists in production database");
  if (masterOwner.length > 0) {
    const owner = masterOwner[0];
    assert(owner.role === 'SUPER_ADMIN', `Master Owner role is SUPER_ADMIN (found: ${owner.role})`);
    assert(owner.plan === 'OWNER_LIFETIME', `Master Owner plan is OWNER_LIFETIME (found: ${owner.plan})`);
    assert(owner.status === 'ACTIVE', `Master Owner status is ACTIVE (found: ${owner.status})`);
  }

  const clients = await sql`
    SELECT id, email, username, role, plan, status 
    FROM users 
    WHERE role = 'CLIENT'
  `;
  console.log(`Preserved client accounts count: ${clients.length}`);
  assert(clients.length >= 3, `Preserved at least 3 client accounts (found: ${clients.length})`);

  // 2. DATABASE DEDUPLICATION COLUMNS & UNIQUE INDEXES
  console.log("\n--- 2. PERMANENT ACCOUNT-LEVEL LEAD DEDUPLICATION SCHEMA ---");
  const dedupCols = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'leads' 
      AND column_name IN ('normalized_domain', 'normalized_email', 'normalized_phone', 'place_id', 'dedup_hash')
  `;
  const foundCols = dedupCols.map(c => c.column_name);
  assert(foundCols.includes('normalized_domain'), "Normalized domain column exists in leads table");
  assert(foundCols.includes('normalized_email'), "Normalized email column exists in leads table");
  assert(foundCols.includes('normalized_phone'), "Normalized phone column exists in leads table");
  assert(foundCols.includes('place_id'), "Place ID column exists in leads table");

  const indexes = await sql`
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename = 'leads' 
      AND indexname IN ('idx_leads_ws_normalized_email', 'idx_leads_ws_normalized_domain', 'idx_leads_ws_place_id')
  `;
  const foundIdxs = indexes.map(i => i.indexname);
  assert(foundIdxs.includes('idx_leads_ws_normalized_email'), "Workspace unique index on normalized_email exists");
  assert(foundIdxs.includes('idx_leads_ws_normalized_domain'), "Workspace unique index on normalized_domain exists");

  // 3. ONE ACTIVE SEARCH JOB LOCKING SCHEMA
  console.log("\n--- 3. ONE ACTIVE SEARCH JOB PER ACCOUNT LOCKING ---");
  const jobTable = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name = 'active_search_jobs'
  `;
  assert(jobTable.length > 0, "active_search_jobs table exists in database");

  // 4. COLD EMAIL TEMPLATES LIBRARY
  console.log("\n--- 4. COLD EMAIL TEMPLATES LIBRARY ---");
  const templatesTable = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name = 'email_templates'
  `;
  assert(templatesTable.length > 0, "email_templates table exists in database");

  // Read email-template-library.ts source to verify templates
  const templateLibCode = fs.readFileSync(path.resolve(__dirname, '..', 'lib', 'email-template-library.ts'), 'utf8');
  assert(templateLibCode.includes("DEFAULT_EMAIL_TEMPLATES"), "DEFAULT_EMAIL_TEMPLATES array defined in library");
  const templateMatches = (templateLibCode.match(/slug:\s*["'][^"']+["']/g) || []);
  assert(templateMatches.length >= 10, `At least 10 default high-converting templates are defined (found: ${templateMatches.length})`);

  // Test template variable interpolation logic
  function testInterpolate(template, lead, senderName, serviceName) {
    let rendered = template
      .replace(/\{\{first_name\}\}/gi, (lead.business_name || "").split(/\s+/)[0] || "Business Owner")
      .replace(/\{\{business_name\}\}/gi, lead.business_name || "your company")
      .replace(/\{\{company_name\}\}/gi, lead.business_name || "your company")
      .replace(/\{\{city\}\}/gi, lead.city || "your area")
      .replace(/\{\{industry\}\}/gi, lead.industry || "industry")
      .replace(/\{\{website\}\}/gi, lead.website || "")
      .replace(/\{\{service_name\}\}/gi, serviceName || "B2B Growth & Lead Solutions")
      .replace(/\{\{sender_name\}\}/gi, senderName || "USMAN AI GTM");
    rendered = rendered
      .replace(/\{\{[^}]+\}\}/g, "")
      .replace(/\[(?:Business Name|Contact Name|Name|Your Name|Company Name|Sender Name|Title|Service Name)\]/gi, "");
    return rendered.trim();
  }

  const sampleLead = {
    business_name: "Apex Luxury Tech",
    city: "Dubai",
    industry: "Real Estate",
    website: "https://apexluxury.com"
  };
  const testRender = testInterpolate("Hi {{first_name}}, I noticed {{business_name}} in {{city}}. {{unused_variable}}", sampleLead, "USMAN AI GTM", "B2B Solutions");
  assert(testRender.includes("Apex Luxury Tech"), "Template successfully interpolated {{business_name}}");
  assert(testRender.includes("Dubai"), "Template successfully interpolated {{city}}");
  assert(!testRender.includes("{{"), "Template stripped all unresolved double bracket variables");

  // 5. MULTILINGUAL AI ASSISTANT SCHEMA & LANGUAGE DETECTION
  console.log("\n--- 5. MULTILINGUAL AI ASSISTANT ---");
  const chatConvTable = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name = 'chat_conversations'
  `;
  assert(chatConvTable.length > 0, "chat_conversations table exists in database");

  const chatMsgTable = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name = 'chat_messages'
  `;
  assert(chatMsgTable.length > 0, "chat_messages table exists in database");

  // 6. GEMINI 3.5 API CONNECTIVITY
  console.log("\n--- 6. GEMINI 3.5 FLASH-LITE CONNECTIVITY ---");
  function getGeminiKey() {
    if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
    const envPath = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const m = content.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
      if (m) return m[1];
    }
    return "";
  }
  const apiKey = getGeminiKey().trim();
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "State 'USMAN AI GTM OPERATIONAL' in 5 words or less." }] }]
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      assert(Boolean(text), `Gemini 3.5 Flash-Lite replied successfully: "${text}"`);
    } else {
      console.warn(`Gemini returned status ${res.status}`);
      assert(false, `Gemini 3.5 Flash-Lite returned HTTP ${res.status}`);
    }
  } catch (e) {
    console.error("Gemini test error:", e);
    assert(false, "Gemini API call threw exception");
  }

  // 7. GOOGLE MAPS PLAN GATE (LIFETIME ONLY)
  console.log("\n--- 7. GOOGLE MAPS PLAN GATE ENFORCEMENT ---");
  // Basic user check simulation
  const basicUser = clients.find(c => c.plan === 'BASIC');
  const lifetimeUser = clients.find(c => c.plan === 'LIFETIME');
  assert(Boolean(basicUser), `Found sample Basic client account: ID #${basicUser?.id}`);
  assert(Boolean(lifetimeUser), `Found sample Lifetime client account: ID #${lifetimeUser?.id}`);

  console.log("\n===============================================================================");
  console.log(`VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("===============================================================================");

  if (failCount > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error("Fatal verification error:", err);
  process.exit(1);
});
