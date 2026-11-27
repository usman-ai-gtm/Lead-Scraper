export interface CurrencyMetadata {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  countries: string[];
  popular?: boolean;
  note?: string;
}

export const POPULAR_CURRENCY_CODES = [
  "USD",
  "PKR",
  "EUR",
  "GBP",
  "AED",
  "SAR",
  "INR",
  "CAD",
  "AUD",
  "USDT",
] as const;

export const GLOBAL_CURRENCIES: CurrencyMetadata[] = [
  { code: "USD", name: "US Dollar", symbol: "$", decimals: 2, countries: ["United States", "USA", "Global", "Ecuador", "Panama"], popular: true },
  { code: "PKR", name: "Pakistani Rupee", symbol: "Rs ", decimals: 0, countries: ["Pakistan"], popular: true },
  { code: "EUR", name: "Euro", symbol: "€", decimals: 2, countries: ["Eurozone", "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium", "Austria", "Ireland", "Portugal", "Finland", "Greece"], popular: true },
  { code: "GBP", name: "British Pound Sterling", symbol: "£", decimals: 2, countries: ["United Kingdom", "UK", "England", "Scotland", "Wales"], popular: true },
  { code: "AED", name: "UAE Dirham", symbol: "AED ", decimals: 2, countries: ["United Arab Emirates", "UAE", "Dubai", "Abu Dhabi"], popular: true },
  { code: "SAR", name: "Saudi Riyal", symbol: "SAR ", decimals: 2, countries: ["Saudi Arabia", "KSA", "Riyadh", "Jeddah"], popular: true },
  { code: "INR", name: "Indian Rupee", symbol: "₹", decimals: 0, countries: ["India"], popular: true },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$", decimals: 2, countries: ["Canada"], popular: true },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", decimals: 2, countries: ["Australia"], popular: true },
  { code: "USDT", name: "Tether USD (TRC20 Network Only)", symbol: "USDT ", decimals: 2, countries: ["Crypto", "Binance", "Global", "TRC20"], popular: true, note: "TRC20 Network Only" },

  { code: "AFN", name: "Afghan Afghani", symbol: "AFN ", decimals: 0, countries: ["Afghanistan"] },
  { code: "ALL", name: "Albanian Lek", symbol: "ALL ", decimals: 0, countries: ["Albania"] },
  { code: "AMD", name: "Armenian Dram", symbol: "AMD ", decimals: 0, countries: ["Armenia"] },
  { code: "ARS", name: "Argentine Peso", symbol: "ARS ", decimals: 2, countries: ["Argentina"] },
  { code: "AZN", name: "Azerbaijani Manat", symbol: "AZN ", decimals: 2, countries: ["Azerbaijan"] },
  { code: "BAM", name: "Bosnia Convertible Mark", symbol: "KM ", decimals: 2, countries: ["Bosnia and Herzegovina"] },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", decimals: 0, countries: ["Bangladesh"] },
  { code: "BGN", name: "Bulgarian Lev", symbol: "BGN ", decimals: 2, countries: ["Bulgaria"] },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BHD ", decimals: 3, countries: ["Bahrain"] },
  { code: "BND", name: "Brunei Dollar", symbol: "B$", decimals: 2, countries: ["Brunei"] },
  { code: "BOB", name: "Bolivian Boliviano", symbol: "Bs ", decimals: 2, countries: ["Bolivia"] },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", decimals: 2, countries: ["Brazil"] },
  { code: "BWP", name: "Botswana Pula", symbol: "P ", decimals: 2, countries: ["Botswana"] },
  { code: "BYN", name: "Belarusian Ruble", symbol: "Br ", decimals: 2, countries: ["Belarus"] },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF ", decimals: 2, countries: ["Switzerland", "Liechtenstein"] },
  { code: "CLP", name: "Chilean Peso", symbol: "CLP ", decimals: 0, countries: ["Chile"] },
  { code: "CNY", name: "Chinese Yuan Renminbi", symbol: "¥", decimals: 2, countries: ["China", "PRC"] },
  { code: "COP", name: "Colombian Peso", symbol: "COP ", decimals: 0, countries: ["Colombia"] },
  { code: "CRC", name: "Costa Rican Colon", symbol: "₡", decimals: 0, countries: ["Costa Rica"] },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč ", decimals: 2, countries: ["Czech Republic", "Czechia"] },
  { code: "DKK", name: "Danish Krone", symbol: "kr ", decimals: 2, countries: ["Denmark", "Greenland"] },
  { code: "DOP", name: "Dominican Peso", symbol: "RD$", decimals: 2, countries: ["Dominican Republic"] },
  { code: "DZD", name: "Algerian Dinar", symbol: "DZD ", decimals: 2, countries: ["Algeria"] },
  { code: "EGP", name: "Egyptian Pound", symbol: "EGP ", decimals: 2, countries: ["Egypt"] },
  { code: "ETB", name: "Ethiopian Birr", symbol: "ETB ", decimals: 2, countries: ["Ethiopia"] },
  { code: "GEL", name: "Georgian Lari", symbol: "₾", decimals: 2, countries: ["Georgia"] },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "GHS ", decimals: 2, countries: ["Ghana"] },
  { code: "GTQ", name: "Guatemalan Quetzal", symbol: "Q ", decimals: 2, countries: ["Guatemala"] },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", decimals: 2, countries: ["Hong Kong"] },
  { code: "HNL", name: "Honduran Lempira", symbol: "L ", decimals: 2, countries: ["Honduras"] },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft ", decimals: 0, countries: ["Hungary"] },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp ", decimals: 0, countries: ["Indonesia"] },
  { code: "ILS", name: "Israeli New Shekel", symbol: "₪", decimals: 2, countries: ["Israel"] },
  { code: "IQD", name: "Iraqi Dinar", symbol: "IQD ", decimals: 0, countries: ["Iraq"] },
  { code: "IRR", name: "Iranian Rial", symbol: "IRR ", decimals: 0, countries: ["Iran"] },
  { code: "ISK", name: "Icelandic Krona", symbol: "ISK ", decimals: 0, countries: ["Iceland"] },
  { code: "JMD", name: "Jamaican Dollar", symbol: "J$", decimals: 2, countries: ["Jamaica"] },
  { code: "JOD", name: "Jordanian Dinar", symbol: "JOD ", decimals: 3, countries: ["Jordan"] },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", decimals: 0, countries: ["Japan"] },
  { code: "KES", name: "Kenyan Shilling", symbol: "KES ", decimals: 0, countries: ["Kenya"] },
  { code: "KGS", name: "Kyrgyzstani Som", symbol: "KGS ", decimals: 2, countries: ["Kyrgyzstan"] },
  { code: "KHR", name: "Cambodian Riel", symbol: "KHR ", decimals: 0, countries: ["Cambodia"] },
  { code: "KRW", name: "South Korean Won", symbol: "₩", decimals: 0, countries: ["South Korea", "Korea"] },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KWD ", decimals: 3, countries: ["Kuwait"] },
  { code: "KZT", name: "Kazakhstani Tenge", symbol: "₸", decimals: 0, countries: ["Kazakhstan"] },
  { code: "LBP", name: "Lebanese Pound", symbol: "LBP ", decimals: 0, countries: ["Lebanon"] },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "LKR ", decimals: 2, countries: ["Sri Lanka"] },
  { code: "MAD", name: "Moroccan Dirham", symbol: "MAD ", decimals: 2, countries: ["Morocco"] },
  { code: "MDL", name: "Moldovan Leu", symbol: "MDL ", decimals: 2, countries: ["Moldova"] },
  { code: "MKD", name: "Macedonian Denar", symbol: "MKD ", decimals: 2, countries: ["North Macedonia"] },
  { code: "MMK", name: "Myanmar Kyat", symbol: "MMK ", decimals: 0, countries: ["Myanmar"] },
  { code: "MNT", name: "Mongolian Tugrik", symbol: "MNT ", decimals: 0, countries: ["Mongolia"] },
  { code: "MUR", name: "Mauritian Rupee", symbol: "MUR ", decimals: 2, countries: ["Mauritius"] },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$", decimals: 2, countries: ["Mexico"] },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM ", decimals: 2, countries: ["Malaysia"] },
  { code: "MZN", name: "Mozambican Metical", symbol: "MZN ", decimals: 2, countries: ["Mozambique"] },
  { code: "NAD", name: "Namibian Dollar", symbol: "N$", decimals: 2, countries: ["Namibia"] },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", decimals: 0, countries: ["Nigeria"] },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr ", decimals: 2, countries: ["Norway"] },
  { code: "NPR", name: "Nepalese Rupee", symbol: "NPR ", decimals: 2, countries: ["Nepal"] },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", decimals: 2, countries: ["New Zealand"] },
  { code: "OMR", name: "Omani Rial", symbol: "OMR ", decimals: 3, countries: ["Oman"] },
  { code: "PAB", name: "Panamanian Balboa", symbol: "B/.", decimals: 2, countries: ["Panama"] },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/", decimals: 2, countries: ["Peru"] },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", decimals: 2, countries: ["Philippines"] },
  { code: "PLN", name: "Polish Zloty", symbol: "zł ", decimals: 2, countries: ["Poland"] },
  { code: "PYG", name: "Paraguayan Guarani", symbol: "PYG ", decimals: 0, countries: ["Paraguay"] },
  { code: "QAR", name: "Qatari Riyal", symbol: "QAR ", decimals: 2, countries: ["Qatar"] },
  { code: "RON", name: "Romanian Leu", symbol: "RON ", decimals: 2, countries: ["Romania"] },
  { code: "RSD", name: "Serbian Dinar", symbol: "RSD ", decimals: 0, countries: ["Serbia"] },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", decimals: 2, countries: ["Russia"] },
  { code: "RWF", name: "Rwandan Franc", symbol: "RWF ", decimals: 0, countries: ["Rwanda"] },
  { code: "SEK", name: "Swedish Krona", symbol: "kr ", decimals: 2, countries: ["Sweden"] },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", decimals: 2, countries: ["Singapore"] },
  { code: "THB", name: "Thai Baht", symbol: "฿", decimals: 2, countries: ["Thailand"] },
  { code: "TND", name: "Tunisian Dinar", symbol: "TND ", decimals: 3, countries: ["Tunisia"] },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", decimals: 2, countries: ["Turkey", "Türkiye"] },
  { code: "TTD", name: "Trinidad & Tobago Dollar", symbol: "TT$", decimals: 2, countries: ["Trinidad and Tobago"] },
  { code: "TWD", name: "New Taiwan Dollar", symbol: "NT$", decimals: 0, countries: ["Taiwan"] },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TZS ", decimals: 0, countries: ["Tanzania"] },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "₴", decimals: 2, countries: ["Ukraine"] },
  { code: "UGX", name: "Ugandan Shilling", symbol: "UGX ", decimals: 0, countries: ["Uganda"] },
  { code: "UYU", name: "Uruguayan Peso", symbol: "$U ", decimals: 2, countries: ["Uruguay"] },
  { code: "UZS", name: "Uzbekistani Som", symbol: "UZS ", decimals: 0, countries: ["Uzbekistan"] },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", decimals: 0, countries: ["Vietnam"] },
  { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA ", decimals: 0, countries: ["Cameroon", "Gabon", "Chad", "Congo"] },
  { code: "XOF", name: "West African CFA Franc", symbol: "CFA ", decimals: 0, countries: ["Senegal", "Ivory Coast", "Mali", "Benin"] },
  { code: "ZAR", name: "South African Rand", symbol: "R ", decimals: 2, countries: ["South Africa"] },
  { code: "ZMW", name: "Zambian Kwacha", symbol: "ZMW ", decimals: 2, countries: ["Zambia"] },
];

const CURRENCY_BY_CODE = new Map<string, CurrencyMetadata>(
  GLOBAL_CURRENCIES.map((c) => [c.code.toUpperCase(), c])
);

export function findCurrencyMeta(codeInput: string | null | undefined): CurrencyMetadata {
  const code = String(codeInput || "USD").trim().toUpperCase().replace(/[^A-Z0-9]/g, "") || "USD";
  const found = CURRENCY_BY_CODE.get(code);
  if (found) return found;
  if (/^[A-Z]{3,5}$/.test(code)) {
    return {
      code,
      name: `${code} Currency`,
      symbol: `${code} `,
      decimals: 2,
      countries: ["International"],
    };
  }
  return CURRENCY_BY_CODE.get("USD")!;
}

export function searchGlobalCurrencies(query: string): CurrencyMetadata[] {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return GLOBAL_CURRENCIES;
  return GLOBAL_CURRENCIES.filter((c) => {
    if (c.code.toLowerCase().includes(q)) return true;
    if (c.name.toLowerCase().includes(q)) return true;
    return c.countries.some((country) => country.toLowerCase().includes(q));
  });
}

export function extractMethodSupportedCodes(method: {
  currency?: string | null;
  name?: string | null;
  bank_details?: Record<string, any> | null;
}): string[] {
  const rawParts: string[] = [];
  if (method.currency) rawParts.push(String(method.currency));
  const bd = method.bank_details || {};
  if (bd.supported_currency) rawParts.push(String(bd.supported_currency));
  if (bd.network) rawParts.push(String(bd.network));
  if (method.name) rawParts.push(String(method.name));

  const joined = rawParts.join(" ").toUpperCase();
  const found = new Set<string>();

  if (joined.includes("MULTI-CURRENCY") || joined.includes("MULTI CURRENCY")) {
    for (const c of ["USD", "EUR", "GBP", "CAD", "AUD", "AED", "SGD"]) {
      found.add(c);
    }
  }
  if (joined.includes("USDT") || joined.includes("TRC20")) {
    found.add("USDT");
  }

  const tokens = joined.match(/\b[A-Z]{3,4}\b/g) || [];
  for (const tok of tokens) {
    if (CURRENCY_BY_CODE.has(tok) || tok === "USDT") {
      found.add(tok);
    }
  }
  return Array.from(found);
}

export function doesMethodSupportCurrency(
  method: {
    currency?: string | null;
    name?: string | null;
    bank_details?: Record<string, any> | null;
  },
  selectedCurrency: string
): boolean {
  const target = String(selectedCurrency || "USD").trim().toUpperCase();
  const codes = extractMethodSupportedCodes(method);
  if (codes.length === 0) return target === "USD";
  if (codes.includes("ALL")) return true;
  return codes.includes(target);
}
