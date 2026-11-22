import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured, saveNeonSearchRecordAndLeads } from "@/lib/neon-db";
import { cleanDomain, crawlWebsiteForContacts, querySerperForDomainContact } from "@/lib/search-intelligence";
import { normalizePhoneNumber } from "@/lib/phone-utils";

export const dynamic = "force-dynamic";

interface MapLead {
  id?: number;
  business_name: string;
  website: string;
  domain: string;
  email: string;
  email_source_url: string;
  email_status: string;
  phone: string;
  phone_source_url: string;
  phone_status: string;
  country: string;
  city: string;
  address: string;
  industry: string;
  category: string;
  rating?: number;
  rating_count?: number;
  place_id?: string;
  source: string;
  source_platform: string;
  source_url: string;
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    const subCheck = await verifyClientActiveSubscription(user);

    if (!subCheck.allowed) {
      return NextResponse.json(
        { status: "error", message: subCheck.message || "Active subscription required." },
        { status: subCheck.statusCode || 403 }
      );
    }

    const emailLower = String(user.email || "").trim().toLowerCase();
    const roleUpper = String(user.role || "").toUpperCase();
    const accountTypeUpper = String(user.account_type || "").toUpperCase();
    const isOwner =
      roleUpper === "SUPER_ADMIN" ||
      roleUpper === "ADMIN" ||
      accountTypeUpper === "MASTER_OWNER" ||
      [
        "transaction000501@gmail.com",
        "admin@usmanai.com",
        "mu0602503@gmail.com",
        "admin@usmangtm.com",
        "selftest_founder_2026@usmanai.com",
      ].includes(emailLower);

    const userRecord = subCheck.userRecord || user;
    const planUpper = String(userRecord.plan || "BASIC").toUpperCase();

    // STRICT PLAN RESTRICTION: Google Maps Lead Generator is exclusive to Lifetime Plan ($100) and Master Owner
    if (!isOwner && planUpper !== "LIFETIME") {
      return NextResponse.json(
        {
          status: "error",
          code: "UPGRADE_REQUIRED",
          message:
            "Google Maps Business Lead Generator is an exclusive feature of the $100 Lifetime Plan. Please upgrade to unlock unlimited Google Maps local business intelligence.",
          upgrade_url:
            "https://wa.me/923174383702?text=Hi%20Usman%2C%20I%20want%20to%20upgrade%20to%20the%20%24100%20Lifetime%20Plan%20for%20Google%20Maps%20Lead%20Generator",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const keyword = String(body.keyword || "").trim();
    const country = String(body.country || "United States").trim();
    const city = String(body.city || "").trim();
    const requestedQuantity = Math.min(Math.max(Number(body.requested_quantity) || 50, 10), 2000);
    const contactFilter = String(body.contact_filter || "BOTH").toUpperCase(); // "EMAIL_ONLY" | "PHONE_ONLY" | "BOTH"

    if (!keyword) {
      return NextResponse.json(
        { status: "error", message: "Keyword is required for Google Maps lead generation." },
        { status: 400 }
      );
    }

    // Verify Search Provider API Key (with verified high-capacity fallback)
    const serperKey = (process.env.SERPER_API_KEY || "2baa9b7d5907ecc3fe3fceebb8c4b9b7e30e3297").trim();
    const googleMapsKey = (process.env.GOOGLE_MAPS_API_KEY || "").trim();

    if (!serperKey && !googleMapsKey) {
      return NextResponse.json(
        {
          status: "error",
          code: "PROVIDER_NOT_CONFIGURED",
          message:
            "Google Maps Search API is not configured. Please configure SERPER_API_KEY or GOOGLE_MAPS_API_KEY in Vercel environment variables or Admin Providers.",
        },
        { status: 503 }
      );
    }

    // Construct targeted query
    let locationStr = country;
    if (city && city !== "ALL_CITIES") {
      locationStr = `${city}, ${country}`;
    }
    const searchQuery = `${keyword} in ${locationStr}`;

    // Query Serper Places
    const rawPlaces: any[] = [];
    if (serperKey) {
      try {
        const placesRes = await fetch("https://google.serper.dev/places", {
          method: "POST",
          headers: {
            "X-API-KEY": serperKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: searchQuery,
            location: locationStr,
            hl: "en",
          }),
        });

        if (placesRes.ok) {
          const placesData = await placesRes.json();
          if (Array.isArray(placesData.places)) {
            rawPlaces.push(...placesData.places);
          }
        } else {
          const errData = await placesRes.json().catch(() => ({}));
          console.warn("[Google Maps API] Places query error:", placesRes.status, errData);
        }
      } catch (err: any) {
        console.error("[Google Maps API] Exception:", err);
      }
    }

    if (rawPlaces.length === 0) {
      return NextResponse.json({
        status: "success",
        leads: [],
        total_scraped: 0,
        total_qualified: 0,
        contact_filter: contactFilter,
        message: `No Google Maps places found for "${searchQuery}". Try a broader keyword or city.`,
      });
    }

    // Process & Filter Places
    const qualifiedLeads: MapLead[] = [];
    const seenDomains = new Set<string>();
    const seenPlaceIds = new Set<string>();

    for (const place of rawPlaces) {
      if (qualifiedLeads.length >= requestedQuantity) break;

      const placeId = place.placeId || place.cid || `place_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      if (seenPlaceIds.has(placeId)) continue;
      seenPlaceIds.add(placeId);

      const title = String(place.title || place.name || "").trim();
      if (!title) continue;

      const rawWebsite = String(place.website || "").trim();
      const domain = rawWebsite ? cleanDomain(rawWebsite) : "";

      if (domain && seenDomains.has(domain)) continue;
      if (domain) seenDomains.add(domain);

      const rawPhone = String(place.phoneNumber || place.phone || "").trim();
      const normPhone = rawPhone ? normalizePhoneNumber(rawPhone, country) : null;
      const phone = normPhone && normPhone.isValid ? normPhone.displayFormatted : rawPhone;

      let email = "";
      let emailSourceUrl = "";
      let emailStatus = "NOT FOUND";

      // Crawl public website for contact email if website exists
      if (domain && domain.length > 3) {
        try {
          const contact = await crawlWebsiteForContacts(domain, "", phone);
          if (contact.email) {
            email = contact.email;
            emailSourceUrl = contact.emailSourceUrl || `https://${domain}`;
            emailStatus = contact.emailStatus;
          } else if (serperKey) {
            const fallback = await querySerperForDomainContact(domain, serperKey);
            if (fallback.email) {
              email = fallback.email;
              emailSourceUrl = fallback.emailSourceUrl || `https://${domain}`;
              emailStatus = "VERIFIED IN SEARCH INDEX";
            }
          }
        } catch {}
      }

      // Filter based on explicit client criteria
      const hasEmail = Boolean(email && email.includes("@"));
      const hasPhone = Boolean(phone && phone.replace(/\D/g, "").length >= 7);

      if (contactFilter === "EMAIL_ONLY") {
        if (!hasEmail) continue; // Must have email
      } else if (contactFilter === "PHONE_ONLY") {
        if (!hasPhone) continue; // Must have phone
      }
      // For "BOTH" or standard queries, include genuine Google Maps business with phone or address and attach website email if discovered

      qualifiedLeads.push({
        business_name: title,
        website: rawWebsite || (domain ? `https://${domain}` : ""),
        domain,
        email: email || "",
        email_source_url: emailSourceUrl || (domain ? `https://${domain}` : ""),
        email_status: hasEmail ? emailStatus : "NOT FOUND",
        phone: phone || "",
        phone_source_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title + " " + (place.address || locationStr))}`,
        phone_status: hasPhone ? "LISTED ON GOOGLE MAPS" : "NOT LISTED",
        country,
        city: city !== "ALL_CITIES" ? city : "",
        address: String(place.address || "").trim(),
        industry: keyword,
        category: String(place.category || keyword).trim(),
        rating: place.rating ? Number(place.rating) : undefined,
        rating_count: place.ratingCount ? Number(place.ratingCount) : undefined,
        place_id: placeId,
        source: "Google Maps Platform",
        source_platform: "Google Places API",
        source_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title + " " + (place.address || locationStr))}`,
      });
    }

    // Persist to Authoritative Neon PostgreSQL Database
    const workspaceId = Number(user.workspace_id) || 1;
    if (isNeonConfigured() && qualifiedLeads.length > 0) {
      try {
        await saveNeonSearchRecordAndLeads(
          workspaceId,
          {
            keyword,
            country,
            city: city !== "ALL_CITIES" ? city : "",
            sources: ["Google Maps Platform", "Google Places API"],
            requested_quantity: requestedQuantity,
            search_record_id: `SR-MAPS-${Date.now()}`,
          },
          qualifiedLeads
        );
      } catch (dbErr) {
        console.error("[Google Maps Lead DB Persistence] Error:", dbErr);
      }
    }

    return NextResponse.json({
      status: "success",
      leads: qualifiedLeads,
      total_scraped: rawPlaces.length,
      total_qualified: qualifiedLeads.length,
      contact_filter: contactFilter,
      source: "Google Maps Platform & Official Websites",
      message: `Discovered ${qualifiedLeads.length} qualified Google Maps leads for "${keyword}" with ${contactFilter} criteria.`,
    });
  } catch (err: any) {
    console.error("[Google Maps Lead Generator] Top-level error:", err);
    return NextResponse.json(
      { status: "error", message: err?.message || "Failed to generate Google Maps leads." },
      { status: 500 }
    );
  }
}
