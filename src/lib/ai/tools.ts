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
    "Calculate investment metrics like price per sqft premium/discount, rental yield estimate, and EMI estimate for a property.",
  inputSchema: z.object({
    asking_price: z.number().describe("Property asking price in INR"),
    area_sqft: z.number().describe("Property area in sqft"),
    city_avg_price_per_sqft: z
      .number()
      .optional()
      .describe("Average price per sqft in the city (if known)"),
    loan_amount_pct: z
      .number()
      .optional()
      .default(80)
      .describe("Loan percentage (default 80%)"),
    interest_rate: z
      .number()
      .optional()
      .default(8.5)
      .describe("Annual interest rate (default 8.5%)"),
    loan_tenure_years: z
      .number()
      .optional()
      .default(20)
      .describe("Loan duration in years (default 20)"),
  }),
  execute: async ({
    asking_price,
    area_sqft,
    city_avg_price_per_sqft,
    loan_amount_pct,
    interest_rate,
    loan_tenure_years,
  }) => {
    const pricePerSqft = Math.round(asking_price / area_sqft);

    // Premium/discount vs city average
    let premiumPct: number | null = null;
    if (city_avg_price_per_sqft && city_avg_price_per_sqft > 0) {
      premiumPct = Math.round(
        ((pricePerSqft - city_avg_price_per_sqft) / city_avg_price_per_sqft) *
          100
      );
    }

    // EMI calculation
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

    // Rough rental yield estimate (2-4% for India)
    const estimatedMonthlyRent = Math.round(asking_price * 0.003); // ~3.6% annual
    const rentalYieldPct = ((estimatedMonthlyRent * 12) / asking_price) * 100;

    return {
      price_per_sqft: pricePerSqft,
      premium_vs_city_avg_pct: premiumPct,
      loan_amount: principal,
      emi_monthly: emi,
      interest_rate_pct: interest_rate ?? 8.5,
      loan_tenure_years: loan_tenure_years ?? 20,
      estimated_monthly_rent: estimatedMonthlyRent,
      rental_yield_pct: Math.round(rentalYieldPct * 100) / 100,
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

// ─── Export all tools as a bundle ────────────────────────────────────
export const valuationTools = {
  search_comparable_properties: searchComparableProperties,
  get_area_market_stats: getAreaMarketStats,
  get_previous_valuations: getPreviousValuations,
  calculate_investment_metrics: calculateInvestmentMetrics,
  get_property_context: getPropertyContext,
};

export const agentTools = {
  search_comparable_properties: searchComparableProperties,
  get_area_market_stats: getAreaMarketStats,
  calculate_investment_metrics: calculateInvestmentMetrics,
};
