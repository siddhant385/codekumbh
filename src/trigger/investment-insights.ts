import { logger, task } from "@trigger.dev/sdk/v3";
import { runBackgroundAgent } from "@/lib/ai/config";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Auto-generates investment insights for a newly listed property.
 * Fills the ai_investment_insights table, visible on the user dashboard.
 * Triggered automatically when a property is created.
 */
export const generateInvestmentInsights = task({
  id: "generate-investment-insights",
  maxDuration: 120,
  run: async (payload: {
    propertyId: string;
    userId: string;
    propertyData: {
      title: string;
      property_type: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      area_sqft: number | null;
      bedrooms: number | null;
      bathrooms: number | null;
      asking_price: number | null;
    };
  }) => {
    const { propertyId, userId, propertyData } = payload;
    logger.log("Starting investment insights generation", { propertyId, userId });

    const prompt = `You are an expert Indian real estate investment analyst AI. Analyze this property and provide a comprehensive investment insight report.

Property: ${propertyData.title}
Type: ${propertyData.property_type ?? "Unknown"}
Location: ${propertyData.address ?? ""}, ${propertyData.city ?? ""}, ${propertyData.state ?? ""}, ${propertyData.country ?? "India"}
Area: ${propertyData.area_sqft ?? "Unknown"} sqft
Bedrooms: ${propertyData.bedrooms ?? "N/A"}
Bathrooms: ${propertyData.bathrooms ?? "N/A"}
Asking Price: ₹${propertyData.asking_price ? Number(propertyData.asking_price).toLocaleString("en-IN") : "N/A"}

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "investment_budget": <number — the asking price as the investment amount>,
  "risk_tolerance": "<LOW | MEDIUM | HIGH — based on property type and location>",
  "recommended_properties": [
    {
      "type": "<property type suggestion>",
      "city": "<city>",
      "reason": "<why this is a good alternative or complement>",
      "estimated_price": <number>
    }
  ],
  "allocation_strategy": {
    "property_investment_pct": <number 0-100>,
    "liquid_reserve_pct": <number 0-100>,
    "renovation_budget_pct": <number 0-100>,
    "reasoning": "<2-3 sentences explaining the allocation>"
  },
  "projected_roi": <number — projected 3-year ROI as percentage like 15.5>,
  "risk_analysis": "<detailed 3-5 sentence risk analysis covering market risk, location risk, liquidity risk, and regulatory risk for this specific property and location>",
  "confidence_score": <number 0.0 to 1.0>
}

Be specific to the Indian market. Use realistic numbers based on the city and property type.`;

    const systemPrompt = `You are a senior Indian real estate investment analyst. Provide data-driven, specific investment insights. Always respond in valid JSON only.`;

    try {
      const result = await runBackgroundAgent(prompt, systemPrompt);

      const cleaned = result
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);

      const { error } = await supabaseAdmin.from("ai_investment_insights").insert({
        user_id: userId,
        investment_budget: parsed.investment_budget ?? propertyData.asking_price ?? 0,
        risk_tolerance: parsed.risk_tolerance ?? "MEDIUM",
        recommended_properties: parsed.recommended_properties ?? [],
        allocation_strategy: parsed.allocation_strategy ?? {},
        projected_roi: parsed.projected_roi ?? null,
        risk_analysis: parsed.risk_analysis ?? null,
        confidence_score: parsed.confidence_score ?? null,
        raw_prompt: { prompt },
        raw_response: { text: result },
      });

      if (error) {
        logger.error("Failed to save investment insights", { error });
        return { success: false, error: error.message };
      }

      logger.log("Investment insights saved", { propertyId, userId });
      return { success: true, propertyId, insights: parsed };
    } catch (error) {
      logger.error("Investment insights generation failed", { propertyId, error });
      return { success: false, error: String(error) };
    }
  },
});
