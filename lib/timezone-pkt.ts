/**
 * Shared Asia/Karachi (PKT) timestamp formatter for Owner Dashboard & Client Intelligence.
 * Strictly formats actual UTC database timestamps — never fabricates missing historical records.
 */

export function formatPktTimestamp(val?: string | null): string | null {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Karachi",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
    const day = get("day");
    const month = get("month");
    const year = get("year");
    const hour = get("hour");
    const minute = get("minute");
    const period = get("dayPeriod").toUpperCase();
    return `${day} ${month} ${year} — ${hour}:${minute} ${period} PKT`;
  } catch {
    return d.toISOString();
  }
}

export function resolveGoogleSignInDisplay(userRow: {
  first_google_signin_at?: string | null;
  last_google_signin_at?: string | null;
  last_login?: string | null;
  created_at?: string | null;
}) {
  const firstGooglePkt = formatPktTimestamp(userRow.first_google_signin_at);
  const latestSource = userRow.last_google_signin_at || userRow.last_login || null;
  const latestSignInPkt = formatPktTimestamp(latestSource);
  const createdPkt = formatPktTimestamp(userRow.created_at);

  return {
    firstSignInDisplay: firstGooglePkt || "Historical timestamp unavailable",
    firstSignInRecorded: Boolean(firstGooglePkt),
    latestSignInDisplay: latestSignInPkt || "No sign-in recorded",
    latestSignInRecorded: Boolean(latestSignInPkt),
    createdDisplay: createdPkt || "Unavailable",
  };
}
