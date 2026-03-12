"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRealtimeSubscription } from "@/lib/supabase/realtime";

/**
 * Invisible component that subscribes to Supabase Realtime
 * for new AI valuations on a specific property.
 * When a new valuation is inserted, it auto-refreshes the page.
 */
export function RealtimeValuationListener({ propertyId }: { propertyId: string }) {
  const router = useRouter();

  useRealtimeSubscription({
    table: "ai_property_valuations",
    event: "INSERT",
    filterColumn: "property_id",
    filterValue: propertyId,
    onEvent: () => {
      toast.success("AI Valuation report is ready!");
      router.refresh();
    },
  });

  return null;
}

/**
 * Invisible component that subscribes to Supabase Realtime
 * for new offers on a specific property.
 * When a new offer arrives, it auto-refreshes the page and shows a toast.
 */
export function RealtimeOfferListener({ propertyId }: { propertyId: string }) {
  const router = useRouter();

  useRealtimeSubscription({
    table: "offers",
    event: "INSERT",
    filterColumn: "property_id",
    filterValue: propertyId,
    onEvent: (payload) => {
      const newOffer = payload.new as Record<string, unknown> | undefined;
      const price = newOffer?.offer_price
        ? `₹${Number(newOffer.offer_price).toLocaleString("en-IN")}`
        : "";
      toast.info(`New offer received${price ? `: ${price}` : ""}!`);
      router.refresh();
    },
  });

  return null;
}

/**
 * Listens for new property_context entries (neighbourhood data enrichment).
 */
export function RealtimeContextListener({ propertyId }: { propertyId: string }) {
  const router = useRouter();

  useRealtimeSubscription({
    table: "property_context",
    event: "INSERT",
    filterColumn: "property_id",
    filterValue: propertyId,
    onEvent: () => {
      toast.success("Neighbourhood intelligence is ready!");
      router.refresh();
    },
  });

  return null;
}

/**
 * Listens for new investment insights.
 */
export function RealtimeInsightsListener({ userId }: { userId: string }) {
  const router = useRouter();

  useRealtimeSubscription({
    table: "ai_investment_insights",
    event: "INSERT",
    filterColumn: "user_id",
    filterValue: userId,
    onEvent: () => {
      toast.success("Investment insights are ready!");
      router.refresh();
    },
  });

  return null;
}
