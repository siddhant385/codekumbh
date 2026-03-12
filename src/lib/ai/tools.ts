/**
 * AI Tool Definitions for Vercel AI SDK tool-calling.
 *
 * These tools let the AI agent call Supabase to fetch real data during
 * generation — comparable properties, area market data, price metrics, etc.
 * Functionally identical to MCP server tools but integrated natively
 * with the AI SDK's `generateText({ tools })` API.
 */

import { tool } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ─── 1. Search Comparable Properties ─────────────────────────────────
export const searchComparableProperties = tool({
  description:
    "Search the database for properties similar to the subject property. Use this to find comparable sales data for valuation.",
  inputSchema: z.object({
    city: z.string().describe("City to search in"),
    property_type: z
      .string()
      .optional()
      .describe("Property type filter: apartment, villa, independent_house, plot, commercial"),
    min_area_sqft: z.number().optional().describe("Minimum area in sqft"),
    max_area_sqft: z.number().optional().describe("Maximum area in sqft"),
    min_price: z.number().optional().describe("Minimum asking price in INR"),
    max_price: z.number().optional().describe("Maximum asking price in INR"),
    limit: z.number().optional().default(5).describe("Max results to return"),
  }),
  execute: async ({
    city,
    property_type,
    min_area_sqft,
    max_area_sqft,
    min_price,
    max_price,
    limit,
  }) => {
    let query = supabaseAdmin
      .from("properties")
      .select(
        "id, title, property_type, city, state, area_sqft, bedrooms, bathrooms, asking_price, status, created_at"
      )
      .eq("is_active", true)
      .ilike("city", `%${city}%`);

    if (property_type) query = query.eq("property_type", property_type);
    if (min_area_sqft) query = query.gte("area_sqft", min_area_sqft);
    if (max_area_sqft) query = query.lte("area_sqft", max_area_sqft);
    if (min_price) query = query.gte("asking_price", min_price);
    if (max_price) query = query.lte("asking_price", max_price);

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit ?? 5);

    if (error) return { error: error.message, results: [] };
    return {
      count: data?.length ?? 0,
      results: (data ?? []).map((p: Record<string, unknown>) => ({
        title: p.title,
        property_type: p.property_type,
        city: p.city,
        state: p.state,
        area_sqft: p.area_sqft,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        asking_price: p.asking_price,
        price_per_sqft:
          p.asking_price && p.area_sqft
            ? Math.round(Number(p.asking_price) / Number(p.area_sqft))
            : null,
        status: p.status,
      })),
    };
  },
});

// ─── 2. Get Area Market Statistics ───────────────────────────────────
export const getAreaMarketStats = tool({
  description:
    "Calculate aggregate market statistics (avg price, avg price/sqft, total listings, price range) for a given city or area. Use this for market comparison.",
  inputSchema: z.object({
    city: z.string().describe("City to get stats for"),
    property_type: z
      .string()
      .optional()
      .describe("Optional property type filter"),
  }),
  execute: async ({ city, property_type }) => {
    let query = supabaseAdmin
      .from("properties")
      .select("asking_price, area_sqft, property_type")
      .eq("is_active", true)
      .ilike("city", `%${city}%`);

    if (property_type) query = query.eq("property_type", property_type);

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return {
        city,
        total_listings: 0,
        message: "No listings found in this area — use general market knowledge.",
      };
    }

    const prices = data
      .map((d: Record<string, unknown>) => Number(d.asking_price))
      .filter((p: number) => p > 0);
    const areas = data
      .map((d: Record<string, unknown>) => Number(d.area_sqft))
      .filter((a: number) => a > 0);

    const avgPrice =
      prices.length > 0
        ? Math.round(prices.reduce((s: number, p: number) => s + p, 0) / prices.length)
        : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const avgArea =
      areas.length > 0
        ? Math.round(areas.reduce((s: number, a: number) => s + a, 0) / areas.length)
        : 0;
    const avgPricePerSqft =
      avgPrice > 0 && avgArea > 0 ? Math.round(avgPrice / avgArea) : 0;

    // Property type distribution
    const typeCounts: Record<string, number> = {};
    for (const d of data) {
      const t = (d as Record<string, unknown>).property_type as string ?? "unknown";
      typeCounts[t] = (typeCounts[t] ?? 0) + 1;
    }

    return {
      city,
      total_listings: data.length,
      average_price: avgPrice,
      min_price: minPrice,
      max_price: maxPrice,
      average_area_sqft: avgArea,
      average_price_per_sqft: avgPricePerSqft,
      property_type_distribution: typeCounts,
    };
  },
});

// ─── 3. Get Previous Valuations ──────────────────────────────────────
export const getPreviousValuations = tool({
  description:
    "Retrieve previous AI valuation reports for a property or similar properties. Useful for trend analysis.",
  inputSchema: z.object({
    property_id: z
      .string()
      .optional()
      .describe("Specific property ID to get valuations for"),
    city: z
      .string()
      .optional()
      .describe("City to search valuations in (for broader trends)"),
    limit: z.number().optional().default(5),
  }),
  execute: async ({ property_id, city, limit }) => {
    if (property_id) {
      const { data } = await supabaseAdmin
        .from("ai_property_valuations")
        .select(
          "predicted_price, price_range_low, price_range_high, confidence_score, reasoning, created_at"
        )
        .eq("property_id", property_id)
        .order("created_at", { ascending: false })
        .limit(limit ?? 5);

      return { property_id, valuations: data ?? [] };
    }

    // Broader: join with properties to filter by city
    if (city) {
      const { data: props } = await supabaseAdmin
        .from("properties")
        .select("id")
        .ilike("city", `%${city}%`)
        .limit(20);

      if (!props || props.length === 0)
        return { city, valuations: [], message: "No properties found in this city" };

      const ids = props.map((p: Record<string, unknown>) => p.id as string);
      const { data: vals } = await supabaseAdmin
        .from("ai_property_valuations")
        .select(
          "property_id, predicted_price, confidence_score, created_at"
        )
        .in("property_id", ids)
        .order("created_at", { ascending: false })
        .limit(limit ?? 5);

      return { city, valuations: vals ?? [] };
    }

    return { valuations: [], message: "Provide property_id or city" };
  },
});

// ─── 4. Calculate Investment Metrics ─────────────────────────────────
export const calculateInvestmentMetrics = tool({
  description:
    "Calculate investment metrics: price/sqft, EMI, rental yield. Fetches real rental yield from property_context table if property_id or city is provided.",
  inputSchema: z.object({
    asking_price: z.number().describe("Property asking price in INR"),
    area_sqft: z.number().describe("Property area in sqft"),
    property_id: z.string().optional().describe("Property ID — used to fetch real rental yield from DB"),
    city: z.string().optional().describe("City — used to calculate average rental yield from nearby properties"),
    city_avg_price_per_sqft: z
      .number()
      .optional()
      .describe("Average price per sqft in the city (if known from a previous tool call)"),
    loan_amount_pct: z.number().optional().default(80).describe("Loan percentage (default 80%)"),
    interest_rate: z.number().optional().default(8.5).describe("Annual interest rate % (default 8.5%)"),
    loan_tenure_years: z.number().optional().default(20).describe("Loan tenure in years (default 20)"),
  }),
  execute: async ({
    asking_price,
    area_sqft,
    property_id,
    city,
    city_avg_price_per_sqft,
    loan_amount_pct,
    interest_rate,
    loan_tenure_years,
  }) => {
    const pricePerSqft = Math.round(asking_price / area_sqft);

    // ── 1. Real rental yield from DB ────────────────────────────────
    let rentalYieldPct: number | null = null;
    let rentalYieldSource = "estimated";

    // a) Try this specific property's context first
    if (property_id) {
      const { data: ctx } = await supabaseAdmin
        .from("property_context")
        .select("rental_yield_estimate")
        .eq("property_id", property_id)
        .maybeSingle();
      if (ctx?.rental_yield_estimate && Number(ctx.rental_yield_estimate) > 0) {
        rentalYieldPct = Number(ctx.rental_yield_estimate);
        rentalYieldSource = "property_context_db";
      }
    }

    // b) If no specific yield, average across same city from property_context
    if (rentalYieldPct === null && city) {
      const { data: cityProps } = await supabaseAdmin
        .from("properties")
        .select("id")
        .ilike("city", `%${city}%`)
        .limit(50);

      if (cityProps && cityProps.length > 0) {
        const ids = cityProps.map((p: Record<string, unknown>) => p.id as string);
        const { data: ctxRows } = await supabaseAdmin
          .from("property_context")
          .select("rental_yield_estimate")
          .in("property_id", ids);

        const yields = (ctxRows ?? [])
          .map((r: Record<string, unknown>) => Number(r.rental_yield_estimate))
          .filter((v: number) => v > 0 && v < 20);

        if (yields.length >= 2) {
          rentalYieldPct = Math.round((yields.reduce((s: number, v: number) => s + v, 0) / yields.length) * 100) / 100;
          rentalYieldSource = `city_avg_db (${yields.length} properties)`;
        }
      }
    }

    // c) Fallback: derive from market price (~3–4% typical India range)
    if (rentalYieldPct === null) {
      rentalYieldPct = pricePerSqft > 15000 ? 2.8 : pricePerSqft > 8000 ? 3.2 : 3.8;
      rentalYieldSource = "estimated_by_price_tier";
    }

    // ── 2. EMI calculation ────────────────────────────────────────
    const loanPct = loan_amount_pct ?? 80;
    const rate = (interest_rate ?? 8.5) / 100 / 12;
    const tenure = (loan_tenure_years ?? 20) * 12;
    const principal = (asking_price * loanPct) / 100;
    const emi =
      rate > 0
        ? Math.round(
            (principal * rate * Math.pow(1 + rate, tenure)) /
              (Math.pow(1 + rate, tenure) - 1)
          )
        : Math.round(principal / tenure);

    // ── 3. Derived values ─────────────────────────────────────────
    const estimatedMonthlyRent = Math.round((asking_price * rentalYieldPct) / 100 / 12);

    let premiumPct: number | null = null;
    if (city_avg_price_per_sqft && city_avg_price_per_sqft > 0) {
      premiumPct = Math.round(
        ((pricePerSqft - city_avg_price_per_sqft) / city_avg_price_per_sqft) * 100
      );
    }

    return {
      price_per_sqft: pricePerSqft,
      premium_vs_city_avg_pct: premiumPct,
      loan_amount: principal,
      emi_monthly: emi,
      interest_rate_pct: interest_rate ?? 8.5,
      loan_tenure_years: loan_tenure_years ?? 20,
      estimated_monthly_rent: estimatedMonthlyRent,
      rental_yield_pct: rentalYieldPct,
      rental_yield_source: rentalYieldSource,
      total_cost_over_loan: emi * tenure,
    };
  },
});

// ─── 5. Get Property Context / Enrichment ────────────────────────────
export const getPropertyContext = tool({
  description:
    "Fetch enriched context (neighbourhood info, amenities, etc.) for a property from the property_context table.",
  inputSchema: z.object({
    property_id: z.string().describe("Property ID to fetch context for"),
  }),
  execute: async ({ property_id }) => {
    const { data, error } = await supabaseAdmin
      .from("property_context")
      .select("*")
      .eq("property_id", property_id)
      .maybeSingle();

    if (error || !data) {
      return {
        property_id,
        context: null,
        message: "No enriched context found for this property.",
      };
    }
    return { property_id, context: data };
  },
});

// ─── 6. Analyze Property Offers ──────────────────────────────────────
export const analyzePropertyOffers = tool({
  description:
    "Fetch and analyze all offers on a property or offers made by/to a user. Returns offer amounts, status, and comparison to asking price.",
  inputSchema: z.object({
    property_id: z
      .string()
      .optional()
      .describe("Property ID to get offers for"),
    user_id: z
      .string()
      .optional()
      .describe("User ID to get offers involving this user"),
    role: z
      .enum(["buyer", "seller", "both"])
      .optional()
      .default("both")
      .describe("Whether to look at offers as buyer, seller, or both"),
  }),
  execute: async ({ property_id, user_id, role }) => {
    if (property_id) {
      const { data: offers } = await supabaseAdmin
        .from("offers")
        .select(
          "id, offer_price, status, created_at, buyer_id"
        )
        .eq("property_id", property_id)
        .order("created_at", { ascending: false });

      if (!offers || offers.length === 0)
        return { property_id, offers: [], message: "No offers found for this property." };

      // Get asking price from the property itself
      const { data: prop } = await supabaseAdmin
        .from("properties")
        .select("asking_price")
        .eq("id", property_id)
        .maybeSingle();
      const askingPrice = prop?.asking_price as number | undefined;

      return {
        property_id,
        asking_price: askingPrice,
        total_offers: offers.length,
        offers: offers.map((o) => ({
          offer_price: o.offer_price,
          status: o.status,
          vs_asking_pct: askingPrice
            ? Math.round(((Number(o.offer_price) - Number(askingPrice)) / Number(askingPrice)) * 100)
            : null,
          created_at: o.created_at,
        })),
      };
    }

    if (user_id) {
      const results: Record<string, unknown>[] = [];
      if (role === "buyer" || role === "both") {
        const { data } = await supabaseAdmin
          .from("offers")
          .select("id, offer_price, status, created_at, property_id")
          .eq("buyer_id", user_id)
          .order("created_at", { ascending: false })
          .limit(10);
        if (data) results.push(...data.map((o) => ({ ...o, role: "buyer" })));
      }
      if (role === "seller" || role === "both") {
        // Get user's property IDs first, then find offers on them
        const { data: ownedProps } = await supabaseAdmin
          .from("properties")
          .select("id")
          .eq("owner_id", user_id);
        const ownedIds = (ownedProps ?? []).map((p) => p.id as string);
        if (ownedIds.length > 0) {
          const { data } = await supabaseAdmin
            .from("offers")
            .select("id, offer_price, status, created_at, property_id")
            .in("property_id", ownedIds)
            .order("created_at", { ascending: false })
            .limit(10);
          if (data) results.push(...data.map((o) => ({ ...o, role: "seller" })));
        }
      }
      return { user_id, total_offers: results.length, offers: results };
    }

    return { offers: [], message: "Provide property_id or user_id" };
  },
});

// ─── 7. Get Portfolio Summary ────────────────────────────────────────
export const getPortfolioSummary = tool({
  description:
    "Get a user's real estate portfolio summary: owned properties, total value, offers, and investment distribution.",
  inputSchema: z.object({
    user_id: z.string().describe("User ID to get portfolio for"),
  }),
  execute: async ({ user_id }) => {
    // Owned properties
    const { data: owned } = await supabaseAdmin
      .from("properties")
      .select("id, title, property_type, city, state, area_sqft, asking_price, status, created_at")
      .eq("owner_id", user_id)
      .eq("is_active", true);

    // Offers made by user
    const { data: offersMade } = await supabaseAdmin
      .from("offers")
      .select("id, offer_price, status, property_id")
      .eq("buyer_id", user_id);

    // Offers received on user's properties
    const propertyIds = (owned ?? []).map((p: Record<string, unknown>) => p.id as string);
    let offersReceived: Record<string, unknown>[] = [];
    if (propertyIds.length > 0) {
      const { data } = await supabaseAdmin
        .from("offers")
        .select("id, offer_price, status, property_id")
        .in("property_id", propertyIds);
      offersReceived = data ?? [];
    }

    const totalPortfolioValue = (owned ?? []).reduce(
      (sum: number, p: Record<string, unknown>) => sum + (Number(p.asking_price) || 0),
      0
    );

    // Property type distribution
    const typeDist: Record<string, number> = {};
    for (const p of owned ?? []) {
      const t = (p as Record<string, unknown>).property_type as string ?? "unknown";
      typeDist[t] = (typeDist[t] ?? 0) + 1;
    }

    // City distribution
    const cityDist: Record<string, number> = {};
    for (const p of owned ?? []) {
      const c = (p as Record<string, unknown>).city as string ?? "unknown";
      cityDist[c] = (cityDist[c] ?? 0) + 1;
    }

    return {
      total_properties: (owned ?? []).length,
      total_portfolio_value: totalPortfolioValue,
      property_type_distribution: typeDist,
      city_distribution: cityDist,
      properties: (owned ?? []).map((p: Record<string, unknown>) => ({
        title: p.title,
        type: p.property_type,
        city: p.city,
        asking_price: p.asking_price,
        area_sqft: p.area_sqft,
      })),
      offers_made: {
        total: (offersMade ?? []).length,
        pending: (offersMade ?? []).filter((o: Record<string, unknown>) => o.status === "pending").length,
        accepted: (offersMade ?? []).filter((o: Record<string, unknown>) => o.status === "accepted").length,
        rejected: (offersMade ?? []).filter((o: Record<string, unknown>) => o.status === "rejected").length,
      },
      offers_received: {
        total: offersReceived.length,
        pending: offersReceived.filter((o: Record<string, unknown>) => o.status === "pending").length,
        accepted: offersReceived.filter((o: Record<string, unknown>) => o.status === "accepted").length,
      },
    };
  },
});

// ─── 8. Detect Listing Anomalies ─────────────────────────────────────
export const detectListingAnomalies = tool({
  description:
    "Check a property listing for potential anomalies: price outliers vs market, suspiciously low/high price per sqft, missing info flags.",
  inputSchema: z.object({
    property_id: z.string().optional().describe("Property ID to check"),
    city: z.string().describe("City for market comparison"),
    asking_price: z.number().describe("Asking price to evaluate"),
    area_sqft: z.number().describe("Area in sqft"),
    property_type: z.string().optional().describe("Property type"),
  }),
  execute: async ({ property_id, city, asking_price, area_sqft, property_type }) => {
    // Get market stats for comparison
    let query = supabaseAdmin
      .from("properties")
      .select("asking_price, area_sqft")
      .eq("is_active", true)
      .ilike("city", `%${city}%`);
    if (property_type) query = query.eq("property_type", property_type);

    const { data } = await query;

    const anomalies: string[] = [];
    const pricePerSqft = Math.round(asking_price / area_sqft);

    if (!data || data.length < 3) {
      return {
        property_id,
        price_per_sqft: pricePerSqft,
        anomalies: ["Insufficient market data to compare against"],
        risk_level: "unknown",
      };
    }

    const marketPrices = data
      .map((d: Record<string, unknown>) =>
        Number(d.area_sqft) > 0
          ? Math.round(Number(d.asking_price) / Number(d.area_sqft))
          : 0
      )
      .filter((p: number) => p > 0);

    const avgPpsf =
      marketPrices.reduce((s: number, p: number) => s + p, 0) / marketPrices.length;
    const std = Math.sqrt(
      marketPrices.reduce((s: number, p: number) => s + Math.pow(p - avgPpsf, 2), 0) /
        marketPrices.length
    );

    const zScore = std > 0 ? (pricePerSqft - avgPpsf) / std : 0;

    if (zScore > 2) anomalies.push(`Price per sqft (₹${pricePerSqft}) is ${Math.round(zScore * 10) / 10} std devs ABOVE market avg (₹${Math.round(avgPpsf)})`);
    if (zScore < -2) anomalies.push(`Price per sqft (₹${pricePerSqft}) is ${Math.round(Math.abs(zScore) * 10) / 10} std devs BELOW market avg (₹${Math.round(avgPpsf)}) — suspiciously cheap`);
    if (asking_price < 100000) anomalies.push("Asking price below ₹1 lakh — likely incomplete or test listing");
    if (area_sqft < 50) anomalies.push("Area below 50 sqft — suspiciously small");
    if (area_sqft > 50000) anomalies.push("Area above 50,000 sqft — verify if correct");

    const riskLevel =
      anomalies.length === 0 ? "low" : anomalies.length <= 2 ? "medium" : "high";

    return {
      property_id,
      price_per_sqft: pricePerSqft,
      market_avg_price_per_sqft: Math.round(avgPpsf),
      z_score: Math.round(zScore * 100) / 100,
      anomalies,
      risk_level: riskLevel,
      total_market_comparisons: data.length,
    };
  },
});


// ─── 9. Indian Real Estate Market Benchmarks ─────────────────────────
export const getIndianMarketBenchmarks = tool({
  description:
    "Get real estate benchmark data for an Indian city. Queries DB first for real listing prices, then enriches with static market context (outlook, localities, growth trends).",
  inputSchema: z.object({
    city: z.string().describe("City name, e.g. Mumbai, Delhi, Bangalore, Hyderabad, Pune, Chennai"),
    property_type: z
      .string()
      .optional()
      .describe("Property type filter: apartment, villa, plot, commercial"),
  }),
  execute: async ({ city, property_type }) => {
    // ── 1. Real DB price data ────────────────────────────────────────
    let dbQuery = supabaseAdmin
      .from("properties")
      .select("asking_price, area_sqft, property_type")
      .ilike("city", `%${city}%`)
      .eq("is_active", true);

    if (property_type) dbQuery = dbQuery.eq("property_type", property_type);

    const { data: listings } = await dbQuery;

    let dbPricePerSqft: number | null = null;
    let dbAvgPrice: number | null = null;
    let dbListingCount = 0;
    const dbTypeBreakdown: Record<string, { count: number; avg_ppsf: number }> = {};

    if (listings && listings.length >= 3) {
      dbListingCount = listings.length;

      // Overall avg price/sqft
      const ppsfValues = listings
        .filter((l: Record<string, unknown>) => Number(l.area_sqft) > 0 && Number(l.asking_price) > 0)
        .map((l: Record<string, unknown>) => Math.round(Number(l.asking_price) / Number(l.area_sqft)));
      if (ppsfValues.length > 0) {
        dbPricePerSqft = Math.round(ppsfValues.reduce((s: number, v: number) => s + v, 0) / ppsfValues.length);
      }

      const prices = listings
        .map((l: Record<string, unknown>) => Number(l.asking_price))
        .filter((p: number) => p > 0);
      if (prices.length > 0) {
        dbAvgPrice = Math.round(prices.reduce((s: number, v: number) => s + v, 0) / prices.length);
      }

      // Per-type breakdown
      for (const l of listings) {
        const t = (l as Record<string, unknown>).property_type as string ?? "unknown";
        const price = Number((l as Record<string, unknown>).asking_price);
        const area  = Number((l as Record<string, unknown>).area_sqft);
        if (price > 0 && area > 0) {
          if (!dbTypeBreakdown[t]) dbTypeBreakdown[t] = { count: 0, avg_ppsf: 0 };
          dbTypeBreakdown[t].count++;
          dbTypeBreakdown[t].avg_ppsf = Math.round(
            (dbTypeBreakdown[t].avg_ppsf * (dbTypeBreakdown[t].count - 1) + Math.round(price / area)) /
            dbTypeBreakdown[t].count
          );
        }
      }
    }

    // ── 2. Real avg rental yield from property_context ───────────────
    let dbRentalYield: number | null = null;
    let dbNeighbourhoodGrowth: number | null = null;
    if (listings && listings.length > 0) {
      const propIds = listings.map((l: Record<string, unknown>) => l.id as string).filter(Boolean);
      if (propIds.length > 0) {
        const { data: ctxRows } = await supabaseAdmin
          .from("property_context")
          .select("rental_yield_estimate, neighborhood_growth_rate")
          .in("property_id", propIds);

        const yields = (ctxRows ?? [])
          .map((r: Record<string, unknown>) => Number(r.rental_yield_estimate))
          .filter((v: number) => v > 0 && v < 20);
        if (yields.length >= 2) {
          dbRentalYield = Math.round((yields.reduce((s: number, v: number) => s + v, 0) / yields.length) * 100) / 100;
        }

        const growths = (ctxRows ?? [])
          .map((r: Record<string, unknown>) => Number(r.neighborhood_growth_rate))
          .filter((v: number) => v > 0 && v < 50);
        if (growths.length >= 2) {
          dbNeighbourhoodGrowth = Math.round((growths.reduce((s: number, v: number) => s + v, 0) / growths.length) * 100) / 100;
        }
      }
    }

    // ── 3. Static market context (things DB can't tell us) ───────────
    type StaticData = {
      rental_yield_pct: number;
      yoy_growth_pct: number;
      top_localities: string[];
      market_outlook: string;
    };
    const staticBenchmarks: Record<string, StaticData> = {
      mumbai:    { rental_yield_pct: 2.8, yoy_growth_pct: 8.5,  top_localities: ["Bandra", "Worli", "Andheri West", "Powai", "Thane"],          market_outlook: "Strong demand driven by Metro & coastal road. Premium segment growing 12-15% YoY." },
      delhi:     { rental_yield_pct: 3.0, yoy_growth_pct: 7.2,  top_localities: ["South Delhi", "Dwarka", "Rohini", "Vasant Kunj"],              market_outlook: "Steady growth with DDA schemes. South Delhi premium remains strong." },
      bangalore: { rental_yield_pct: 3.5, yoy_growth_pct: 10.2, top_localities: ["Whitefield", "Sarjapur Road", "Electronic City", "HSR Layout"], market_outlook: "IT corridor driving demand. Highest rental yields among metros. North Bangalore emerging." },
      bengaluru: { rental_yield_pct: 3.5, yoy_growth_pct: 10.2, top_localities: ["Whitefield", "Sarjapur Road", "Electronic City", "HSR Layout"], market_outlook: "IT corridor driving demand. Highest rental yields among metros. North Bangalore emerging." },
      hyderabad: { rental_yield_pct: 3.8, yoy_growth_pct: 12.5, top_localities: ["Gachibowli", "HITEC City", "Kondapur", "Kokapet"],              market_outlook: "Fastest growing market. IT/pharma driving west Hyderabad boom." },
      pune:      { rental_yield_pct: 3.2, yoy_growth_pct: 9.0,  top_localities: ["Hinjawadi", "Kharadi", "Baner", "Wakad"],                      market_outlook: "IT parks fueling East and West corridors. Affordable vs Mumbai with strong growth." },
      chennai:   { rental_yield_pct: 3.0, yoy_growth_pct: 7.8,  top_localities: ["OMR", "ECR", "Anna Nagar", "Velachery"],                       market_outlook: "OMR corridor is IT hub. ECR growing for premium villas. Stable market." },
      gurgaon:   { rental_yield_pct: 3.2, yoy_growth_pct: 11.0, top_localities: ["Golf Course Road", "DLF Phase 5", "Dwarka Expressway"],         market_outlook: "Premium corridor. Luxury segment booming with 15%+ growth." },
      gurugram:  { rental_yield_pct: 3.2, yoy_growth_pct: 11.0, top_localities: ["Golf Course Road", "DLF Phase 5", "Dwarka Expressway"],         market_outlook: "Premium corridor. Luxury segment booming with 15%+ growth." },
      noida:     { rental_yield_pct: 3.0, yoy_growth_pct: 8.0,  top_localities: ["Sector 150", "Sector 137", "Greater Noida West"],              market_outlook: "Jewar Airport driving Greater Noida growth. Affordable options for first-time buyers." },
      ahmedabad: { rental_yield_pct: 3.0, yoy_growth_pct: 9.5,  top_localities: ["SG Highway", "Prahlad Nagar", "Satellite", "Bopal"],           market_outlook: "GIFT City driving premium demand. Good affordability index." },
      kolkata:   { rental_yield_pct: 2.8, yoy_growth_pct: 6.5,  top_localities: ["Rajarhat", "New Town", "Salt Lake", "EM Bypass"],              market_outlook: "New Town/Rajarhat emerging as IT hub. Affordable with stable returns." },
    };

    const cityKey = city.toLowerCase().replace(/[^a-z]/g, "");
    const staticData = staticBenchmarks[cityKey] ?? {
      rental_yield_pct: 3.5,
      yoy_growth_pct: 8.0,
      top_localities: [],
      market_outlook: "Emerging tier-2/3 city with growing infrastructure investment.",
    };

    // ── 4. Merge: DB values take priority, static as fallback ────────
    return {
      city,
      data_source: dbListingCount >= 3 ? `live_db (${dbListingCount} listings)` : "static_estimates",
      // Pricing — DB first
      avg_price_per_sqft: dbPricePerSqft ?? null,
      avg_listing_price: dbAvgPrice ?? null,
      property_type_breakdown: Object.keys(dbTypeBreakdown).length > 0 ? dbTypeBreakdown : null,
      // Yield & growth — DB if available, else static
      rental_yield_pct: dbRentalYield ?? staticData.rental_yield_pct,
      rental_yield_source: dbRentalYield ? "property_context_db" : "static_estimate",
      yoy_growth_pct: dbNeighbourhoodGrowth ?? staticData.yoy_growth_pct,
      yoy_growth_source: dbNeighbourhoodGrowth ? "property_context_db" : "static_estimate",
      // Market context — always static (qualitative data)
      top_localities: staticData.top_localities,
      market_outlook: staticData.market_outlook,
    };
  },
});

// ─── 10. Analyze Price Trends from Database ──────────────────────────
export const analyzePriceTrends = tool({
  description:
    "Analyze property price trends over time in a given city using actual database listings. Shows monthly average prices and price per sqft progression.",
  inputSchema: z.object({
    city: z.string().describe("City to analyze trends for"),
    property_type: z.string().optional().describe("Optional property type filter"),
    months: z.number().optional().default(6).describe("How many months back to analyze (default 6)"),
  }),
  execute: async ({ city, property_type, months }) => {
    const monthsBack = months ?? 6;
    const since = new Date();
    since.setMonth(since.getMonth() - monthsBack);

    let query = supabaseAdmin
      .from("properties")
      .select("asking_price, area_sqft, property_type, created_at")
      .ilike("city", `%${city}%`)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });

    if (property_type) query = query.eq("property_type", property_type);

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return {
        city,
        months: monthsBack,
        message: "Insufficient data for trend analysis in this area.",
        trends: [],
      };
    }

    // Group by month
    const monthlyData: Record<string, { prices: number[]; ppsf: number[]; count: number }> = {};
    for (const p of data) {
      const d = new Date((p as Record<string, unknown>).created_at as string);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyData[key]) monthlyData[key] = { prices: [], ppsf: [], count: 0 };
      const price = Number((p as Record<string, unknown>).asking_price);
      const area = Number((p as Record<string, unknown>).area_sqft);
      if (price > 0) {
        monthlyData[key].prices.push(price);
        if (area > 0) monthlyData[key].ppsf.push(Math.round(price / area));
        monthlyData[key].count++;
      }
    }

    const trends = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({
        month,
        listings: d.count,
        avg_price: Math.round(d.prices.reduce((s, p) => s + p, 0) / d.prices.length),
        avg_price_per_sqft: d.ppsf.length > 0
          ? Math.round(d.ppsf.reduce((s, p) => s + p, 0) / d.ppsf.length)
          : null,
        min_price: Math.min(...d.prices),
        max_price: Math.max(...d.prices),
      }));

    // Calculate overall trend direction
    let trendDirection: "rising" | "falling" | "stable" = "stable";
    if (trends.length >= 2) {
      const first = trends[0].avg_price;
      const last = trends[trends.length - 1].avg_price;
      const changePct = ((last - first) / first) * 100;
      if (changePct > 5) trendDirection = "rising";
      else if (changePct < -5) trendDirection = "falling";
    }

    return {
      city,
      property_type: property_type ?? "all",
      period: `${monthsBack} months`,
      total_listings_analyzed: data.length,
      trend_direction: trendDirection,
      monthly_trends: trends,
    };
  },
});

// ─── Export all tools as bundles ─────────────────────────────────────
export const valuationTools = {
  search_comparable_properties: searchComparableProperties,
  get_area_market_stats: getAreaMarketStats,
  get_previous_valuations: getPreviousValuations,
  calculate_investment_metrics: calculateInvestmentMetrics,
  get_property_context: getPropertyContext,
  get_market_benchmarks: getIndianMarketBenchmarks,
};

export const offerRiskTools = {
  search_comparable_properties: searchComparableProperties,
  get_area_market_stats: getAreaMarketStats,
  analyze_property_offers: analyzePropertyOffers,
  detect_listing_anomalies: detectListingAnomalies,
  get_market_benchmarks: getIndianMarketBenchmarks,
};

export const portfolioTools = {
  get_portfolio_summary: getPortfolioSummary,
  search_comparable_properties: searchComparableProperties,
  get_area_market_stats: getAreaMarketStats,
  calculate_investment_metrics: calculateInvestmentMetrics,
  get_market_benchmarks: getIndianMarketBenchmarks,
  analyze_price_trends: analyzePriceTrends,
};
