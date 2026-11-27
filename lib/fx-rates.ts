import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import {
  GLOBAL_CURRENCIES,
  POPULAR_CURRENCY_CODES,
  findCurrencyMeta,
} from "@/lib/currencies-iso4217";

export interface SupportedCurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: SupportedCurrencyInfo[] = GLOBAL_CURRENCIES.map((c) => ({
  code: c.code,
  symbol: c.symbol,
  name: c.name,
  decimals: c.decimals,
}));

export const SUPPORTED_CURRENCY_CODES = SUPPORTED_CURRENCIES.map((c) => c.code);

export interface FxRateEntry {
  currency: string;
  rateFromUsd: number;
  source: string;
  isManualOverride: boolean;
  updatedAt: string;
}

export interface CurrencyConversionResult {
  available: boolean;
  baseCurrency: "USD";
  targetCurrency: string;
  symbol: string;
  rate: number;
  source: string;
  isManualOverride: boolean;
  originalPriceUsd: number;
  convertedAmount: number;
  formattedAmount: string;
  updatedAt: string;
  fallbackToUsd: boolean;
  message?: string;
}

let inMemoryRateCache: { fetchedAt: number; rates: Record<string, FxRateEntry> } | null = null;
const MEMORY_TTL_MS = 30 * 60 * 1000; // 30 minutes
const DB_STALE_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function ensureExchangeRatesTable() {
  if (!isNeonConfigured()) return;
  const sql = getNeonSql();
  if (!sql) return;
  await sql.query(`
    CREATE TABLE IF NOT EXISTS currency_exchange_rates (
      currency TEXT PRIMARY KEY,
      rate_from_usd NUMERIC NOT NULL,
      source TEXT NOT NULL,
      is_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function fetchLiveUsdRates(): Promise<{ rates: Record<string, number>; sources: string[] } | null> {
  const merged: Record<string, number> = {};
  const sources: string[] = [];

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      method: "GET",
      signal: AbortSignal.timeout(4500),
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.rates && typeof json.rates === "object") {
        for (const [k, v] of Object.entries(json.rates)) {
          if (typeof v === "number" && Number.isFinite(v) && v > 0) {
            merged[k.toUpperCase()] = v;
          }
        }
        sources.push("open.er-api.com");
      }
    }
  } catch {
    // fallback below
  }

  // Also check jsdelivr fawazahmed0 feed when primary is empty OR USDT rate is needed
  if (Object.keys(merged).length === 0 || !merged.USDT) {
    try {
      const res2 = await fetch(
        "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
        {
          method: "GET",
          signal: AbortSignal.timeout(4500),
          cache: "no-store",
        }
      );
      if (res2.ok) {
        const json2 = await res2.json();
        if (json2 && json2.usd && typeof json2.usd === "object") {
          for (const [k, v] of Object.entries(json2.usd)) {
            const upper = k.toUpperCase();
            if (typeof v === "number" && Number.isFinite(v) && v > 0 && !merged[upper]) {
              merged[upper] = v;
            }
          }
          sources.push("currency-api");
        }
      }
    } catch {
      // caller handles missing rates transparently without inventing rates
    }
  }

  if (Object.keys(merged).length === 0) return null;
  return { rates: merged, sources };
}

export async function getAllFxRates(forceRefresh = false): Promise<Record<string, FxRateEntry>> {
  const nowIso = new Date().toISOString();
  const baseUsd: FxRateEntry = {
    currency: "USD",
    rateFromUsd: 1,
    source: "Base Pricing Currency",
    isManualOverride: false,
    updatedAt: nowIso,
  };

  if (!forceRefresh && inMemoryRateCache && Date.now() - inMemoryRateCache.fetchedAt < MEMORY_TTL_MS) {
    return { USD: baseUsd, ...inMemoryRateCache.rates };
  }

  const dbRates: Record<string, FxRateEntry> = {};
  let needsRefresh = forceRefresh;

  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      try {
        await ensureExchangeRatesTable();
        const rows = await sql.query(
          "SELECT currency, rate_from_usd, source, is_manual_override, updated_at FROM currency_exchange_rates"
        );
        for (const r of rows || []) {
          const code = String(r.currency || "").toUpperCase();
          const rate = Number(r.rate_from_usd);
          if (code && Number.isFinite(rate) && rate > 0) {
            dbRates[code] = {
              currency: code,
              rateFromUsd: rate,
              source: String(r.source || "Saved Exchange Rate"),
              isManualOverride: Boolean(r.is_manual_override),
              updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : nowIso,
            };
          }
        }
      } catch (e) {
        console.warn("[FX Rates] DB read failed:", e);
      }
    }
  }

  // Trigger refresh if popular currencies OR broader global catalog (<40 cached) are missing or stale
  if (!needsRefresh && Object.keys(dbRates).length < 40) {
    needsRefresh = true;
  }
  if (!needsRefresh) {
    for (const code of POPULAR_CURRENCY_CODES) {
      if (code === "USD") continue;
      const existing = dbRates[code];
      if (!existing) {
        needsRefresh = true;
        break;
      }
      if (!existing.isManualOverride) {
        const age = Date.now() - new Date(existing.updatedAt).getTime();
        if (!Number.isFinite(age) || age > DB_STALE_MS) {
          needsRefresh = true;
          break;
        }
      }
    }
  }

  if (needsRefresh) {
    const livePayload = await fetchLiveUsdRates();
    if (livePayload) {
      const refreshedAt = new Date().toISOString();
      const sourceLabel = `Live Market FX Estimate (${livePayload.sources.join(", ")})`;
      const codesToSave: string[] = [];
      const ratesToSave: number[] = [];
      const sourcesToSave: string[] = [];

      for (const curMeta of GLOBAL_CURRENCIES) {
        const code = curMeta.code.toUpperCase();
        if (code === "USD") continue;
        if (dbRates[code]?.isManualOverride) continue;
        const rate = Number(livePayload.rates[code]);
        if (Number.isFinite(rate) && rate > 0) {
          dbRates[code] = {
            currency: code,
            rateFromUsd: rate,
            source: sourceLabel,
            isManualOverride: false,
            updatedAt: refreshedAt,
          };
          codesToSave.push(code);
          ratesToSave.push(rate);
          sourcesToSave.push(sourceLabel);
        }
      }

      // Also retain any remaining valid 3-letter ISO rates from live feed in memory & DB batch
      for (const [rawCode, rawRate] of Object.entries(livePayload.rates)) {
        const code = rawCode.toUpperCase();
        if (code === "USD" || !/^[A-Z]{3}$/.test(code)) continue;
        if (dbRates[code]) continue;
        const rate = Number(rawRate);
        if (Number.isFinite(rate) && rate > 0) {
          dbRates[code] = {
            currency: code,
            rateFromUsd: rate,
            source: sourceLabel,
            isManualOverride: false,
            updatedAt: refreshedAt,
          };
          codesToSave.push(code);
          ratesToSave.push(rate);
          sourcesToSave.push(sourceLabel);
        }
      }

      const sql = isNeonConfigured() ? getNeonSql() : null;
      if (sql && codesToSave.length > 0) {
        await sql
          .query(
            `INSERT INTO currency_exchange_rates (currency, rate_from_usd, source, is_manual_override, updated_at)
             SELECT c, r, s, FALSE, NOW()
             FROM UNNEST($1::text[], $2::numeric[], $3::text[]) AS t(c, r, s)
             ON CONFLICT (currency) DO UPDATE
             SET rate_from_usd = CASE WHEN currency_exchange_rates.is_manual_override THEN currency_exchange_rates.rate_from_usd ELSE EXCLUDED.rate_from_usd END,
                 source = CASE WHEN currency_exchange_rates.is_manual_override THEN currency_exchange_rates.source ELSE EXCLUDED.source END,
                 updated_at = CASE WHEN currency_exchange_rates.is_manual_override THEN currency_exchange_rates.updated_at ELSE NOW() END`,
            [codesToSave, ratesToSave, sourcesToSave]
          )
          .catch((err) => {
            console.warn("[FX Rates] Batch upsert failed:", err);
          });
      }
    }
  }

  inMemoryRateCache = { fetchedAt: Date.now(), rates: dbRates };
  return { USD: baseUsd, ...dbRates };
}

export async function setAdminFxRateOverride(input: {
  currency: string;
  rateFromUsd: number | null;
  clearOverride?: boolean;
}) {
  const code = String(input.currency || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{3,5}$/.test(code) || code === "USD") {
    throw new Error(`Unsupported override currency: ${code}`);
  }
  const sql = getNeonSql();
  if (!sql) throw new Error("Database unavailable");
  await ensureExchangeRatesTable();

  if (input.clearOverride) {
    await sql.query("DELETE FROM currency_exchange_rates WHERE currency = $1", [code]);
    inMemoryRateCache = null;
    return getAllFxRates(true);
  }

  const rate = Number(input.rateFromUsd);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Exchange rate must be a positive number.");
  }

  await sql.query(
    `INSERT INTO currency_exchange_rates (currency, rate_from_usd, source, is_manual_override, updated_at)
     VALUES ($1, $2, 'Owner Configured Rate', TRUE, NOW())
     ON CONFLICT (currency) DO UPDATE
     SET rate_from_usd = EXCLUDED.rate_from_usd,
         source = 'Owner Configured Rate',
         is_manual_override = TRUE,
         updated_at = NOW()`,
    [code, rate]
  );
  inMemoryRateCache = null;
  return getAllFxRates(false);
}

export async function convertUsdAmount(
  priceUsd: number,
  targetCurrencyInput: unknown
): Promise<CurrencyConversionResult> {
  const cleanUsd = Number(Number(priceUsd).toFixed(2));
  const code = String(targetCurrencyInput || "USD").trim().toUpperCase().replace(/[^A-Z0-9]/g, "") || "USD";
  const meta = findCurrencyMeta(code);

  if (meta.code === "USD") {
    return {
      available: true,
      baseCurrency: "USD",
      targetCurrency: "USD",
      symbol: "$",
      rate: 1,
      source: "Base Pricing Currency",
      isManualOverride: false,
      originalPriceUsd: cleanUsd,
      convertedAmount: cleanUsd,
      formattedAmount: `$${cleanUsd.toFixed(2)} USD`,
      updatedAt: new Date().toISOString(),
      fallbackToUsd: false,
    };
  }

  const rates = await getAllFxRates(false);
  const entry = rates[meta.code];

  if (!entry || !Number.isFinite(entry.rateFromUsd) || entry.rateFromUsd <= 0) {
    return {
      available: false,
      baseCurrency: "USD",
      targetCurrency: "USD",
      symbol: "$",
      rate: 1,
      source: "Live FX temporarily unavailable — USD fallback",
      isManualOverride: false,
      originalPriceUsd: cleanUsd,
      convertedAmount: cleanUsd,
      formattedAmount: `$${cleanUsd.toFixed(2)} USD`,
      updatedAt: new Date().toISOString(),
      fallbackToUsd: true,
      message: `Live conversion for ${meta.code} is currently unavailable. Please pay $${cleanUsd.toFixed(2)} USD cleanly without estimated rates.`,
    };
  }

  const rawConverted = cleanUsd * entry.rateFromUsd;
  const convertedAmount =
    meta.decimals === 0 ? Math.round(rawConverted) : Number(rawConverted.toFixed(meta.decimals));

  return {
    available: true,
    baseCurrency: "USD",
    targetCurrency: meta.code,
    symbol: meta.symbol,
    rate: Number(entry.rateFromUsd.toFixed(4)),
    source: entry.source,
    isManualOverride: entry.isManualOverride,
    originalPriceUsd: cleanUsd,
    convertedAmount,
    formattedAmount:
      meta.decimals === 0
        ? `${meta.symbol}${convertedAmount.toLocaleString()} ${meta.code}`
        : `${meta.symbol}${convertedAmount.toFixed(meta.decimals)} ${meta.code}`,
    updatedAt: entry.updatedAt,
    fallbackToUsd: false,
  };
}
