import { logger, task } from "@trigger.dev/sdk/v3";
import { runBackgroundAgent } from "@/lib/ai/config";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Auto-enriches property_context table with AI-generated location/neighbourhood data.
 * Triggered automatically when a property is created.
 */
export const enrichPropertyContext = task({
  id: "enrich-property-context",
  maxDuration: 120,
  run: async (payload: {
    propertyId: string;
    propertyData: {
      title: string;
      property_type: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      area_sqft: number | null;
      asking_price: number | null;
    };
  }) => {
    const { propertyId, propertyData } = payload;
    logger.log("Starting property context enrichment", { propertyId });

    const prompt = `You are an Indian real estate data enrichment AI. Given a property listing, estimate realistic neighbourhood/location metrics.

Property: ${propertyData.title}
Type: ${propertyData.property_type ?? "Unknown"}
Address: ${propertyData.address ?? "N/A"}
City: ${propertyData.city ?? "Unknown"}
State: ${propertyData.state ?? "Unknown"}
Country: ${propertyData.country ?? "India"}
Area: ${propertyData.area_sqft ?? "Unknown"} sqft
Asking Price: ₹${propertyData.asking_price ? Number(propertyData.asking_price).toLocaleString("en-IN") : "N/A"}

Based on general knowledge of Indian cities and the location described, provide REALISTIC estimates for these metrics. Respond with ONLY valid JSON (no markdown, no fences):

{
  "distance_to_metro": <number in km — nearest metro station distance. If no metro in city, use 50>,
  "distance_to_school": <number in km — nearest school>,
  "distance_to_hospital": <number in km — nearest hospital>,
  "crime_index": <number 0-100 — higher means more crime. Use city-level data>,
  "pollution_index": <number 0-100 — higher means more pollution. Delhi=80, Shimla=20 etc>,
  "connectivity_score": <number 0-10 — public transport, road access, airport proximity>,
  "future_development_score": <number 0-10 — upcoming infra projects, metro expansion, IT parks>,
  "rental_yield_estimate": <number — estimated annual rental yield percentage like 2.5, 3.8>,
  "neighborhood_growth_rate": <number — estimated annual property price growth % like 5, 8, 12>
}

Be realistic based on the city and area. For example:
- Bangalore Whitefield: metro ~3km, school ~1km, hospital ~2km, crime 35, pollution 55, connectivity 7, future_dev 8, rental 3.2, growth 8
- Mumbai Andheri: metro ~0.5km, school ~0.5km, hospital ~1km, crime 40, pollution 65, connectivity 9, future_dev 6, rental 2.8, growth 5
- Small town: metro ~50km, school ~2km, hospital ~5km, crime 20, pollution 30, connectivity 3, future_dev 2, rental 4, growth 3`;

    try {
      const result = await runBackgroundAgent(prompt);

      // Parse JSON
      const cleaned = result
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);

      // Insert into property_context
      const { error } = await supabaseAdmin.from("property_context").insert({
        property_id: propertyId,
        distance_to_metro: parsed.distance_to_metro ?? null,
        distance_to_school: parsed.distance_to_school ?? null,
        distance_to_hospital: parsed.distance_to_hospital ?? null,
        crime_index: parsed.crime_index ?? null,
        pollution_index: parsed.pollution_index ?? null,
        connectivity_score: parsed.connectivity_score ?? null,
        future_development_score: parsed.future_development_score ?? null,
        rental_yield_estimate: parsed.rental_yield_estimate ?? null,
        neighborhood_growth_rate: parsed.neighborhood_growth_rate ?? null,
      });

      if (error) {
        logger.error("Failed to save property context", { error });
        return { success: false, error: error.message };
      }

      logger.log("Property context enriched successfully", { propertyId });
      return { success: true, propertyId, context: parsed };
    } catch (error) {
      logger.error("Property context enrichment failed", { propertyId, error });
      return { success: false, error: String(error) };
    }
  },
});
