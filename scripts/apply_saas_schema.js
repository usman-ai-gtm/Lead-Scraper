const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const sql = neon(dbUrl);

async function migrate() {
  console.log('--- Applying Safe SaaS Subscription & Inquiry Schema ---');

  // 1. Add subscription columns to users table
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'BASIC';`;
  console.log('✔ users.plan added');

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMP WITH TIME ZONE;`;
  console.log('✔ users.subscription_start added');

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;`;
  console.log('✔ users.subscription_expires_at added');

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'LOCKED';`;
  console.log('✔ users.subscription_status added');

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_notes TEXT;`;
  console.log('✔ users.subscription_notes added');

  // 2. Set default values for existing users
  // Owner accounts get LIFETIME & ACTIVE
  await sql`
    UPDATE users 
    SET plan = 'LIFETIME', 
        status = 'ACTIVE', 
        subscription_status = 'ACTIVE',
        subscription_start = COALESCE(subscription_start, NOW())
    WHERE role = 'ADMIN' OR email IN ('admin@usmanai.com', 'mu0602503@gmail.com');
  `;
  console.log('✔ Owner accounts set to LIFETIME ACTIVE');

  // Existing CLIENT accounts default plan to BASIC if null, sync status
  await sql`
    UPDATE users 
    SET plan = COALESCE(plan, 'BASIC'),
        subscription_status = COALESCE(status, 'LOCKED')
    WHERE role = 'CLIENT' AND plan IS NULL;
  `;
  console.log('✔ Existing CLIENT accounts initialized');

  // 3. Create subscription_inquiries table
  await sql`
    CREATE TABLE IF NOT EXISTS subscription_inquiries (
      id SERIAL PRIMARY KEY,
      customer_name VARCHAR(255) NOT NULL,
      contact_info VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      plan VARCHAR(50) NOT NULL DEFAULT 'BASIC',
      message TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'NEW',
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  console.log('✔ subscription_inquiries table verified/created');

  // 4. Create email_suppressions table
  await sql`
    CREATE TABLE IF NOT EXISTS email_suppressions (
      id SERIAL PRIMARY KEY,
      workspace_id INTEGER NOT NULL,
      email VARCHAR(255) NOT NULL,
      reason VARCHAR(255) DEFAULT 'UNSUBSCRIBED',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  console.log('✔ email_suppressions table verified/created');

  // 5. Verify email_accounts can have multiple accounts per workspace
  // Check index on email_accounts
  await sql`
    CREATE INDEX IF NOT EXISTS idx_email_accounts_workspace_id ON email_accounts(workspace_id);
  `;
  console.log('✔ idx_email_accounts_workspace_id index verified');

  console.log('\nMigration complete successfully!');
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
