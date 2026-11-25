import { Country } from "country-state-city";

export const ALL_193_COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czechia", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador",
  "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland",
  "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait",
  "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru",
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan",
  "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

const COUNTRY_NAME_TO_ISO_OVERRIDE: Record<string, string> = {
  "bahamas": "BS",
  "bolivia": "BO",
  "brunei": "BN",
  "cabo verde": "CV",
  "congo (congo-brazzaville)": "CG",
  "czechia": "CZ",
  "democratic republic of the congo": "CD",
  "eswatini": "SZ",
  "gambia": "GM",
  "iran": "IR",
  "ivory coast": "CI",
  "laos": "LA",
  "micronesia": "FM",
  "moldova": "MD",
  "myanmar": "MM",
  "north korea": "KP",
  "north macedonia": "MK",
  "palestine": "PS",
  "russia": "RU",
  "saint kitts and nevis": "KN",
  "saint lucia": "LC",
  "saint vincent and the grenadines": "VC",
  "sao tome and principe": "ST",
  "south korea": "KR",
  "syria": "SY",
  "tanzania": "TZ",
  "timor-leste": "TL",
  "turkey": "TR",
  "vatican city": "VA",
  "venezuela": "VE",
  "vietnam": "VN",
};

/**
 * Filter countries by search term (case-insensitive substring match).
 */
export function searchCountries(query?: string): string[] {
  if (!query || !query.trim()) return ALL_193_COUNTRIES;
  const q = query.trim().toLowerCase();
  return ALL_193_COUNTRIES.filter((c) => c.toLowerCase().includes(q));
}

/**
 * Normalizes input country string against recognized names.
 */
export function normalizeCountryName(raw?: string): string {
  if (!raw || !raw.trim()) return "Global";
  const clean = raw.trim().toLowerCase();
  if (clean === "usa" || clean === "us" || clean === "u.s." || clean === "u.s.a." || clean === "america") {
    return "United States";
  }
  if (clean === "uk" || clean === "u.k." || clean === "great britain" || clean === "england" || clean === "britain") {
    return "United Kingdom";
  }
  if (clean === "uae" || clean === "u.a.e." || clean === "emirates" || clean === "dubai") {
    return "United Arab Emirates";
  }
  if (clean === "pk" || clean === "pak") return "Pakistan";
  if (clean === "in" || clean === "ind") return "India";
  if (clean === "ca" || clean === "can") return "Canada";
  if (clean === "au" || clean === "aus") return "Australia";
  if (clean === "ksa") return "Saudi Arabia";
  if (clean === "de" || clean === "deutschland") return "Germany";
  if (clean === "türkiye" || clean === "turkiye") return "Turkey";

  const matched = ALL_193_COUNTRIES.find((c) => c.toLowerCase() === clean);
  return matched || raw.trim();
}

/**
 * Resolves the lowercase ISO-3166-1 alpha-2 code used by search providers (e.g. Serper `gl`)
 * and `country-state-city` city lookups.
 */
export function getCountryIsoCode(countryName?: string): string | undefined {
  if (!countryName) return undefined;
  const normalized = normalizeCountryName(countryName);
  const lower = normalized.toLowerCase();

  if (COUNTRY_NAME_TO_ISO_OVERRIDE[lower]) {
    return COUNTRY_NAME_TO_ISO_OVERRIDE[lower];
  }

  const allCountries = Country.getAllCountries();
  const exact = allCountries.find((c) => c.name.toLowerCase() === lower);
  if (exact) return exact.isoCode;

  const partial = allCountries.find(
    (c) => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase())
  );
  return partial?.isoCode;
}

export function getCountryGlCode(countryName?: string): string | undefined {
  const iso = getCountryIsoCode(countryName);
  return iso ? iso.toLowerCase() : undefined;
}

/**
 * Checks if a country is in the supported countries list.
 */
export function isSupportedCountry(country: string): boolean {
  const norm = normalizeCountryName(country);
  return ALL_193_COUNTRIES.includes(norm) || Boolean(getCountryIsoCode(norm));
}
