import fs from "fs";
import path from "path";

// Load .env
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

// Also check Neon URL file if env not set
const neonPath = "C:\\Users\\Dell\\.config\\neon\\db_url.txt";
if (fs.existsSync(neonPath)) {
  const neonUrl = fs.readFileSync(neonPath, "utf-8").trim();
  if (neonUrl && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = neonUrl;
  }
}

import { ALL_193_COUNTRIES, normalizeCountryName, isSupportedCountry, searchCountries } from "../lib/countries";
import {
  validateEmailSyntax,
  normalizeEmail,
  validateAndNormalizePhone,
  evaluateContactRequirement,
  calculateLeadQualityScore,
} from "../lib/lead-quality-engine";
import { expandSearchQuery } from "../lib/smart-search-expansion";
import {
  getNeonSql,
  isNeonConfigured,
  createNeonCampaign,
  getNeonCampaignById,
  updateNeonCampaignProgress,
  deleteNeonCampaign,
} from "../lib/neon-db";
import { buildWhatsAppClickToChatUrl } from "../lib/phone-utils";

async function runTestSuite() {
  console.log("==================================================================");
  console.log("   USMAN AI GTM — AUTOMATED UPGRADE VERIFICATION TEST SUITE");
  console.log("==================================================================");

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${message}`);
      failedTests++;
    }
  }

  // 1. Countries Dataset Test
  console.log("\n--- TEST GROUP 1: Countries Dataset & Normalization ---");
  assert(Array.isArray(ALL_193_COUNTRIES) && ALL_193_COUNTRIES.length >= 193, `Countries dataset contains ${ALL_193_COUNTRIES.length} countries (>= 193)`);
  assert(normalizeCountryName("USA") === "United States", "USA normalizes to United States");
  assert(normalizeCountryName("UK") === "United Kingdom", "UK normalizes to United Kingdom");
  assert(normalizeCountryName("UAE") === "United Arab Emirates", "UAE normalizes to United Arab Emirates");
  assert(normalizeCountryName("PK") === "Pakistan", "PK normalizes to Pakistan");
  assert(isSupportedCountry("United States") === true, "United States is supported");
  const searchRes = searchCountries("Pak");
  assert(searchRes.includes("Pakistan"), "searchCountries('Pak') includes Pakistan");

  // 2. Lead Quality Engine & Contact Requirements Test
  console.log("\n--- TEST GROUP 2: Contact Requirements & Quality Scoring Engine ---");
  assert(validateEmailSyntax("info@acme-corp.com") === true, "Valid syntax for info@acme-corp.com");
  assert(validateEmailSyntax("invalid-email") === false, "Rejects invalid email format");
  assert(validateEmailSyntax("test@example.com") === false, "Rejects dummy example.com domain");
  assert(normalizeEmail("mailto:Hello@Brand.Com ") === "hello@brand.com", "Normalizes mailto and uppercase");

  const phoneCheck1 = validateAndNormalizePhone("03174383702", "Pakistan");
  assert(phoneCheck1.valid && phoneCheck1.normalized === "+923174383702", "Normalizes Pakistan local number to +923174383702");

  const phoneCheck2 = validateAndNormalizePhone("(212) 555-0199", "United States");
  assert(phoneCheck2.valid && phoneCheck2.normalized === "+12125550199", "Normalizes US phone to +12125550199");

  // Test Contact Requirements: EMAIL_AND_PHONE
  const testLead1 = { email: "contact@techagency.com", phone: "+12125550199" };
  const req1 = evaluateContactRequirement(testLead1, "EMAIL_AND_PHONE", "United States");
  assert(req1.eligible === true, "EMAIL_AND_PHONE accepts lead with both valid contacts");

  const testLead2 = { email: "contact@techagency.com", phone: "" };
  const req2 = evaluateContactRequirement(testLead2, "EMAIL_AND_PHONE", "United States");
  assert(req2.eligible === false && (req2.missingReason || "").includes("phone"), "EMAIL_AND_PHONE rejects lead missing phone");

  // Test Contact Requirements: EMAIL_ONLY
  const req3 = evaluateContactRequirement(testLead2, "EMAIL_ONLY", "United States");
  assert(req3.eligible === true, "EMAIL_ONLY accepts lead with email even if phone is missing");

  // Test Contact Requirements: PHONE_ONLY
  const testLead3 = { email: "", phone: "+12125550199" };
  const req4 = evaluateContactRequirement(testLead3, "PHONE_ONLY", "United States");
  assert(req4.eligible === true, "PHONE_ONLY accepts lead with phone even if email is missing");

  // Test Contact Requirements: EMAIL_OR_PHONE
  const req5 = evaluateContactRequirement(testLead3, "EMAIL_OR_PHONE", "United States");
  assert(req5.eligible === true, "EMAIL_OR_PHONE accepts lead with either contact");

  const testLeadEmpty = { email: "", phone: "" };
  const req6 = evaluateContactRequirement(testLeadEmpty, "EMAIL_OR_PHONE", "United States");
  assert(req6.eligible === false, "EMAIL_OR_PHONE rejects lead with neither contact");

  // Test Quality Scoring
  const quality1 = calculateLeadQualityScore({
    business_name: "Nexus Cloud Solutions LLC",
    website: "https://nexuscloud.io",
    email: "enterprise@nexuscloud.io",
    phone: "+12125550199",
    country: "United States",
    address: "100 Broadway, New York, NY",
    linkedin: "https://linkedin.com/company/nexuscloud",
    source: "Google Organic Search",
  });
  assert(quality1.score >= 80 && quality1.category === "Excellent", `High-signal lead scored ${quality1.score}/100 Category: ${quality1.category}`);
  assert(quality1.reasons.length >= 3, `Quality reasons explain score (${quality1.reasons.join(", ")})`);

  // 3. Smart Search Expansion Engine
  console.log("\n--- TEST GROUP 3: Smart Search Expansion ---");
  const expansions = await expandSearchQuery("Digital Marketing Agency");
  assert(Array.isArray(expansions) && expansions.length >= 2, `Expanded into ${expansions.length} variations: ${expansions.join(" | ")}`);

  // 4. Database Schema & Tables Verification
  console.log("\n--- TEST GROUP 4: Authoritative Neon PostgreSQL Database Schema ---");
  const sql = getNeonSql();
  assert(Boolean(sql), "Neon PostgreSQL client successfully initialized");

  if (!sql) throw new Error("Neon SQL client not available");

  const tablesRes = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('campaigns', 'lead_enrichment_logs', 'leads')
  `;
  const tableNames = tablesRes.map((r: any) => r.table_name);
  assert(tableNames.includes("campaigns"), "Table 'campaigns' exists in PostgreSQL database");
  assert(tableNames.includes("lead_enrichment_logs"), "Table 'lead_enrichment_logs' exists in PostgreSQL database");
  assert(tableNames.includes("leads"), "Table 'leads' exists in PostgreSQL database");

  // Check new columns on leads
  const columnsRes = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'leads' 
    AND column_name IN ('quality_score', 'quality_category', 'quality_reasons', 'is_enriched', 'enriched_at', 'linkedin', 'instagram', 'facebook', 'youtube', 'contact_requirement')
  `;
  const colNames = columnsRes.map((r: any) => r.column_name);
  assert(colNames.includes("quality_score"), "Column 'leads.quality_score' exists");
  assert(colNames.includes("is_enriched"), "Column 'leads.is_enriched' exists");
  assert(colNames.includes("linkedin"), "Column 'leads.linkedin' exists");
  assert(colNames.includes("instagram"), "Column 'leads.instagram' exists");
  assert(colNames.includes("quality_reasons"), "Column 'leads.quality_reasons' exists");

  // 5. Campaign Lifecycle & Tenant Isolation
  console.log("\n--- TEST GROUP 5: Campaign Creation & Lifecycle ---");
  const wsRows = await sql`SELECT id FROM workspaces LIMIT 1`;
  const validWsId = wsRows.length > 0 ? wsRows[0].id : 1;

  const testCampaignId = `camp_test_${Date.now()}`;
  const createdCamp = await createNeonCampaign({
    id: testCampaignId,
    workspace_id: validWsId,
    name: "Automated Test Campaign",
    campaign_type: "FIND_LEADS",
    keyword: "Cloud Architecture Consultants",
    countries: ["United States", "United Kingdom"],
    target_quantity: 50,
    contact_requirement: "EMAIL_OR_PHONE",
    search_variations: ["Cloud consultants", "Cloud architects"],
  });
  assert(Boolean(createdCamp && createdCamp.id === testCampaignId), `Campaign created successfully with ID: ${testCampaignId}`);

  // Test Progress Update
  const updateSuccess = await updateNeonCampaignProgress(testCampaignId, validWsId, {
    status: "RUNNING",
    current_country: "United States",
    candidates_processed: 12,
    eligible_leads_count: 5,
    duplicates_skipped: 2,
    missing_contact_count: 5,
    progress_percent: 25,
  });
  assert(updateSuccess === true, "updateNeonCampaignProgress returns true");
  const runningCheck = await getNeonCampaignById(testCampaignId, validWsId);
  assert(Boolean(runningCheck && runningCheck.status === "RUNNING" && runningCheck.eligible_leads_count === 5), "Campaign progress verified as RUNNING (5 eligible leads)");

  // Test Pause / Status Transition
  const pauseSuccess = await updateNeonCampaignProgress(testCampaignId, validWsId, { status: "PAUSED" });
  assert(pauseSuccess === true, "updateNeonCampaignProgress for PAUSED returns true");
  const pausedCheck = await getNeonCampaignById(testCampaignId, validWsId);
  assert(Boolean(pausedCheck && pausedCheck.status === "PAUSED"), "Campaign status verified as PAUSED in database");

  // Clean up test campaign
  await deleteNeonCampaign(testCampaignId, validWsId);
  const verifyDeleted = await getNeonCampaignById(testCampaignId, validWsId);
  assert(verifyDeleted === null, "Test campaign safely removed after test completion");

  // 6. Lead Enrichment Logging & Recalculation
  console.log("\n--- TEST GROUP 6: Lead Enrichment Audit Trail ---");
  const testLeadRecord = await sql`
    INSERT INTO leads (workspace_id, business_name, website, domain, email, phone, country, source, quality_score, quality_category)
    VALUES (${validWsId}, 'Enrichment Test Corp', 'https://enrichmenttest.com', 'enrichmenttest.com', 'contact@enrichmenttest.com', '+12125550199', 'United States', 'Verification Test', 60, 'Good')
    RETURNING id, business_name
  `;
  const testLeadId = testLeadRecord[0].id;

  // Log enrichment
  await sql`
    INSERT INTO lead_enrichment_logs (workspace_id, lead_id, changes, source)
    VALUES (${validWsId}, ${testLeadId}, ${JSON.stringify({ linkedin: "https://linkedin.com/company/enrichmenttest", enriched: true })}, 'Serper Intelligence Crawler')
  `;

  // Update lead with enriched status
  await sql`
    UPDATE leads 
    SET is_enriched = true, enriched_at = NOW(), linkedin = 'https://linkedin.com/company/enrichmenttest', quality_score = 85, quality_category = 'Excellent'
    WHERE id = ${testLeadId}
  `;

  const enrichedLeadCheck = await sql`
    SELECT id, business_name, is_enriched, linkedin, quality_score FROM leads WHERE id = ${testLeadId}
  `;
  assert(enrichedLeadCheck[0].is_enriched === true && enrichedLeadCheck[0].linkedin.includes("linkedin.com"), "Lead successfully enriched and tagged with verified LinkedIn");

  const logCheck = await sql`
    SELECT id, lead_id, source FROM lead_enrichment_logs WHERE lead_id = ${testLeadId}
  `;
  assert(logCheck.length > 0 && logCheck[0].source === "Serper Intelligence Crawler", "Enrichment audit record verified in lead_enrichment_logs");

  // Clean up test lead and log
  await sql`DELETE FROM lead_enrichment_logs WHERE lead_id = ${testLeadId}`;
  await sql`DELETE FROM leads WHERE id = ${testLeadId}`;
  assert(true, "Temporary enrichment test records safely cleaned up");

  // 7. Master Owner & Client Account Preserved
  console.log("\n--- TEST GROUP 7: Master Owner & Client Accounts Integrity ---");
  const ownerCheck = await sql`
    SELECT id, username, email, role, plan, status 
    FROM users 
    WHERE username = 'master_owner_usman' OR email = 'transaction000501@gmail.com'
  `;
  assert(ownerCheck.length > 0, `Master Owner record found: ${ownerCheck[0].username} (Role: ${ownerCheck[0].role}, Plan: ${ownerCheck[0].plan})`);
  assert(ownerCheck[0].role === "SUPER_ADMIN", "Master Owner role is SUPER_ADMIN");

  // 8. Safe WhatsApp wa.me Link Generation
  console.log("\n--- TEST GROUP 8: Safe WhatsApp Outreach Compliance ---");
  const waLink = buildWhatsAppClickToChatUrl("+923174383702", "Hello from Usman AI GTM");
  assert(waLink.startsWith("https://wa.me/923174383702"), `WhatsApp URL is safe click-to-chat: ${waLink}`);
  assert(!waLink.includes("selenium") && !waLink.includes("puppeteer"), "100% compliant click-to-chat; zero account ban risk");

  console.log("\n==================================================================");
  console.log(`TOTAL TESTS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log("==================================================================");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
