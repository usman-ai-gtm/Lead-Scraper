import { City } from "country-state-city";
import { getCountryIsoCode, normalizeCountryName } from "./countries";

/**
 * Prioritized commercial hubs per major market so primary business centers
 * appear first in searchable city pickers before alphabetical country cities.
 * Never returns fabricated placeholder city labels.
 */
export const PRIORITY_HUBS_BY_COUNTRY: Record<string, string[]> = {
  "United States": [
    "New York", "Los Angeles", "Chicago", "Houston", "Phoenix",
    "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose",
    "Austin", "Jacksonville", "San Francisco", "Charlotte", "Indianapolis",
    "Seattle", "Denver", "Boston", "Miami", "Atlanta",
  ],
  "United Kingdom": [
    "London", "Manchester", "Birmingham", "Leeds", "Glasgow",
    "Liverpool", "Newcastle upon Tyne", "Sheffield", "Bristol", "Edinburgh",
    "Leicester", "Belfast", "Nottingham", "Southampton", "Cardiff",
    "Coventry", "Cambridge", "Oxford", "Reading", "Aberdeen",
  ],
  "United Arab Emirates": [
    "Dubai", "Abu Dhabi", "Sharjah", "Al Ain", "Ajman",
    "Ras Al Khaimah", "Fujairah", "Umm Al Quwain", "Khor Fakkan",
  ],
  "Canada": [
    "Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton",
    "Ottawa", "Winnipeg", "Quebec City", "Hamilton", "Kitchener",
    "London", "Victoria", "Halifax", "Oshawa", "Windsor",
  ],
  "Australia": [
    "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide",
    "Gold Coast", "Newcastle", "Canberra", "Sunshine Coast", "Wollongong",
    "Geelong", "Hobart", "Townsville", "Cairns", "Darwin",
  ],
  "Germany": [
    "Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt am Main",
    "Stuttgart", "Düsseldorf", "Leipzig", "Dortmund", "Essen",
    "Bremen", "Dresden", "Hannover", "Nuremberg", "Bonn",
  ],
  "Pakistan": [
    "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad",
    "Multan", "Gujranwala", "Peshawar", "Quetta", "Sialkot",
    "Hyderabad", "Abbottabad", "Bahawalpur", "Sargodha", "Sukkur",
    "Gujrat", "Sheikhupura", "Jhang", "Mardan", "Kasur",
    "Rahim Yar Khan", "Sahiwal", "Okara", "Wah Cantonment", "Mirpur",
  ],
  "Saudi Arabia": [
    "Riyadh", "Jeddah", "Dammam", "Khobar", "Mecca",
    "Medina", "Jubail", "Tabuk", "Abha", "Taif",
    "Buraidah", "Hofuf", "Yanbu", "Najran", "Hail",
  ],
  "India": [
    "Mumbai", "Delhi", "New Delhi", "Bengaluru", "Hyderabad",
    "Ahmedabad", "Chennai", "Kolkata", "Surat", "Pune",
    "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore",
    "Gurugram", "Noida", "Chandigarh", "Kochi", "Coimbatore",
  ],
  "France": [
    "Paris", "Marseille", "Lyon", "Toulouse", "Nice",
    "Nantes", "Montpellier", "Strasbourg", "Bordeaux", "Lille",
  ],
  "Netherlands": [
    "Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven",
    "Tilburg", "Groningen", "Almere", "Breda", "Nijmegen",
  ],
  "Turkey": [
    "Istanbul", "Ankara", "Izmir", "Bursa", "Antalya",
    "Adana", "Konya", "Gaziantep", "Mersin", "Kayseri",
  ],
  "Malaysia": [
    "Kuala Lumpur", "George Town", "Johor Bahru", "Ipoh", "Shah Alam",
    "Petaling Jaya", "Kota Kinabalu", "Kuching", "Malacca", "Subang Jaya",
  ],
  "Singapore": [
    "Singapore", "Central Area", "Jurong East", "Tampines", "Woodlands",
  ],
};

const countryCityCache = new Map<string, string[]>();

/**
 * Returns real cities belonging strictly to the specified country using the
 * ISO country-state-city dataset, prioritized with commercial hubs first.
 * Returns an empty array if the country has no city entries in the dataset.
 */
export function getCitiesForCountry(countryName: string, searchQuery?: string): string[] {
  const normalized = normalizeCountryName(countryName);
  let allForCountry = countryCityCache.get(normalized);

  if (!allForCountry) {
    const priority = PRIORITY_HUBS_BY_COUNTRY[normalized] || [];
    const iso = getCountryIsoCode(normalized);
    const datasetCities = iso ? City.getCitiesOfCountry(iso) || [] : [];

    const uniqueNames = new Set<string>();
    const ordered: string[] = [];

    for (const p of priority) {
      const key = p.trim();
      if (key && !uniqueNames.has(key.toLowerCase())) {
        uniqueNames.add(key.toLowerCase());
        ordered.push(key);
      }
    }

    const rest = datasetCities
      .map((c) => c.name.trim())
      .filter((name) => Boolean(name) && !uniqueNames.has(name.toLowerCase()))
      .sort((a, b) => a.localeCompare(b));

    for (const r of rest) {
      if (!uniqueNames.has(r.toLowerCase())) {
        uniqueNames.add(r.toLowerCase());
        ordered.push(r);
      }
    }

    allForCountry = ordered;
    countryCityCache.set(normalized, ordered);
  }

  if (!searchQuery || !searchQuery.trim()) {
    return allForCountry;
  }

  const q = searchQuery.trim().toLowerCase();
  const startsWith: string[] = [];
  const contains: string[] = [];

  for (const city of allForCountry) {
    const lower = city.toLowerCase();
    if (lower.startsWith(q)) startsWith.push(city);
    else if (lower.includes(q)) contains.push(city);
  }

  return [...startsWith, ...contains];
}

export interface CountryCityOption {
  country: string;
  city: string;
  key: string; // `${city}||${country}`
}

/**
 * Returns city options scoped strictly to the selected countries list.
 * Supports multi-country search without leaking cities from unselected nations.
 */
export function getCityOptionsForCountries(
  countries: string[],
  searchQuery?: string,
  limitPerCountry: number = 150
): CountryCityOption[] {
  const normalizedCountries = Array.from(
    new Set(countries.map((c) => normalizeCountryName(c)).filter((c) => c && c !== "Global"))
  );

  const results: CountryCityOption[] = [];
  for (const country of normalizedCountries) {
    const matches = getCitiesForCountry(country, searchQuery).slice(0, limitPerCountry);
    for (const city of matches) {
      results.push({
        country,
        city,
        key: `${city}||${country}`,
      });
    }
  }
  return results;
}

/**
 * Backward-compatible alias for single-country callers.
 * Never invents fake placeholder cities like "Commercial Business Center".
 */
export function getSuggestedCitiesForCountry(country: string): string[] {
  return getCitiesForCountry(country).slice(0, 60);
}
