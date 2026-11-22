const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const sql = neon(dbUrl);

function createJwtToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + 7 * 24 * 60 * 60,
    })
  ).toString("base64url");
  return `${header}.${body}.mock_signature`;
}

function verifyJwtToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

function computeAuthoritativeUserStatus(user) {
  const roleUpper = (user.role || "").toUpperCase();
  if (roleUpper === "ADMIN") {
    return {
      status: "ACTIVE",
      isLocked: false,
      plan: "LIFETIME",
      isExpired: false,
      daysRemaining: "Permanent (Owner)",
    };
  }

  const statusUpper = (user.status || "LOCKED").toUpperCase();

  if (statusUpper === "REVOKED" || statusUpper === "SUSPENDED" || statusUpper === "LOCKED" || statusUpper === "PENDING") {
    return {
      status: statusUpper === "PENDING" ? "LOCKED" : statusUpper,
      isLocked: true,
      plan: (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC",
      isExpired: false,
      daysRemaining: 0,
    };
  }

  const planUpper = (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC";
  if (planUpper === "LIFETIME") {
    return {
      status: "ACTIVE",
      isLocked: false,
      plan: "LIFETIME",
      isExpired: false,
      daysRemaining: "Lifetime Access — No Expiry",
    };
  }

  if (!user.subscription_expires_at) {
    return {
      status: "LOCKED",
      isLocked: true,
      plan: "BASIC",
      isExpired: true,
      daysRemaining: 0,
    };
  }

  const expTime = new Date(user.subscription_expires_at).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return {
      status: "EXPIRED",
      isLocked: true,
      plan: "BASIC",
      isExpired: true,
      daysRemaining: 0,
    };
  }

  return {
    status: "ACTIVE",
    isLocked: false,
    plan: "BASIC",
    isExpired: false,
    daysRemaining: diffDays,
  };
}

async function testClientMe() {
  const u = await sql`SELECT * FROM users WHERE id = 58`;
  console.log("Client 58 in DB:", u[0]);

  const token = createJwtToken({
    sub: String(u[0].id),
    email: u[0].email,
    full_name: u[0].full_name,
    role: u[0].role,
    workspace_id: u[0].workspace_id,
    status: u[0].status,
    plan: u[0].plan,
  });

  const payload = verifyJwtToken(token);
  const userId = Number(payload.sub);
  const dbUsers = await sql`
    SELECT id, email, full_name, role, workspace_id, status, plan, subscription_start, subscription_expires_at, subscription_status
    FROM users
    WHERE id = ${userId}
    LIMIT 1;
  `;
  const authoritative = computeAuthoritativeUserStatus(dbUsers[0]);
  console.log("Authoritative status from /api/auth/me logic:", authoritative);
}

testClientMe().catch(console.error);
