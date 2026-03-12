"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createPropertySchema,
  makeOfferSchema,
  type Property,
  type Offer,
} from "@/lib/schema/property.schema";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, userId: null };
  return { supabase, userId: user.id };
}

// ---------------------------------------------------------------------------
// 1. CREATE PROPERTY
// ---------------------------------------------------------------------------

export async function createProperty(
  formData: FormData
): Promise<{ data: Property } | { error: string }> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  const parsed = createPropertySchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    property_type: formData.get("property_type"),
    address: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
    country: formData.get("country") || "India",
    area_sqft: Number(formData.get("area_sqft")),
    bedrooms: formData.get("bedrooms") ? Number(formData.get("bedrooms")) : undefined,
    bathrooms: formData.get("bathrooms") ? Number(formData.get("bathrooms")) : undefined,
    year_built: formData.get("year_built") ? Number(formData.get("year_built")) : undefined,
    lot_size: formData.get("lot_size") ? Number(formData.get("lot_size")) : undefined,
    asking_price: Number(formData.get("asking_price")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data, error } = await supabase
    .from("properties")
    .insert({
      owner_id: userId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      property_type: parsed.data.property_type,
      status: "active",
      address: parsed.data.address,
      city: parsed.data.city,
      state: parsed.data.state,
      country: parsed.data.country,
      area_sqft: parsed.data.area_sqft,
      bedrooms: parsed.data.bedrooms ?? null,
      bathrooms: parsed.data.bathrooms ?? null,
      year_built: parsed.data.year_built ?? null,
      lot_size: parsed.data.lot_size ?? null,
      asking_price: parsed.data.asking_price,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };
  return { data: data as Property };
}

// ---------------------------------------------------------------------------
// 2. GET ALL ACTIVE PROPERTIES (browse)
// ---------------------------------------------------------------------------

export async function getActiveProperties(): Promise<
  { data: Property[] } | { error: string }
> {
  const { supabase } = await getAuthenticatedUser();
  if (!supabase) return { error: "UNAUTHORIZED" };

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("is_active", true)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: (data ?? []) as Property[] };
}

// ---------------------------------------------------------------------------
// 3. GET MY PROPERTIES (seller view)
// ---------------------------------------------------------------------------

export async function getMyProperties(): Promise<
  { data: Property[] } | { error: string }
> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: (data ?? []) as Property[] };
}

// ---------------------------------------------------------------------------
// 4. GET SINGLE PROPERTY
// ---------------------------------------------------------------------------

export async function getProperty(
  propertyId: string
): Promise<{ data: Property } | { error: string }> {
  const { supabase } = await getAuthenticatedUser();
  if (!supabase) return { error: "UNAUTHORIZED" };

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .single();

  if (error) return { error: error.message };
  return { data: data as Property };
}

// ---------------------------------------------------------------------------
// 5. MAKE OFFER
// ---------------------------------------------------------------------------

export async function makeOffer(
  formData: FormData
): Promise<{ data: Offer } | { error: string }> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  const parsed = makeOfferSchema.safeParse({
    property_id: formData.get("property_id"),
    offer_price: Number(formData.get("offer_price")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data, error } = await supabase
    .from("offers")
    .insert({
      property_id: parsed.data.property_id,
      buyer_id: userId,
      offer_price: parsed.data.offer_price,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) return { error: error.message };
  return { data: data as Offer };
}

// ---------------------------------------------------------------------------
// 6. GET OFFERS FOR A PROPERTY (seller view)
// ---------------------------------------------------------------------------

export async function getPropertyOffers(
  propertyId: string
): Promise<{ data: Offer[] } | { error: string }> {
  const { supabase } = await getAuthenticatedUser();
  if (!supabase) return { error: "UNAUTHORIZED" };

  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: (data ?? []) as Offer[] };
}

// ---------------------------------------------------------------------------
// 7. REQUEST AI VALUATION
// ---------------------------------------------------------------------------

export async function requestValuation(
  propertyId: string
): Promise<{ success: true; runId: string; publicToken: string } | { error: string }> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  // Fetch property
  const { data: property, error: fetchErr } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .single();
  if (fetchErr || !property) return { error: "Property not found" };

  // Import trigger deps dynamically
  const { auth, tasks } = await import("@trigger.dev/sdk/v3");
  const { generatePropertyValuation } = await import("@/trigger/property-valuation");

  const handle = await tasks.trigger<typeof generatePropertyValuation>(
    "generate-property-valuation",
    {
      propertyId,
      userId,
      propertyData: {
        title: property.title,
        property_type: property.property_type,
        address: property.address,
        city: property.city,
        state: property.state,
        country: property.country,
        area_sqft: property.area_sqft,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        year_built: property.year_built,
        lot_size: property.lot_size,
        asking_price: property.asking_price,
        description: property.description,
      },
    }
  );

  const publicToken = await auth.createPublicToken({
    scopes: { read: { runs: [handle.id] } },
  });

  return { success: true, runId: handle.id, publicToken };
}

// ---------------------------------------------------------------------------
// 8. SEARCH PROPERTIES
// ---------------------------------------------------------------------------

export async function searchProperties(
  query: string
): Promise<{ data: Property[] } | { error: string }> {
  const { supabase } = await getAuthenticatedUser();
  if (!supabase) return { error: "UNAUTHORIZED" };

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("is_active", true)
    .eq("status", "active")
    .or(
      `title.ilike.%${query}%,city.ilike.%${query}%,state.ilike.%${query}%,address.ilike.%${query}%,property_type.ilike.%${query}%`
    )
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { error: error.message };
  return { data: (data ?? []) as Property[] };
}
