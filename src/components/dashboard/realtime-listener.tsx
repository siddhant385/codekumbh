"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRealtimeSubscription } from "@/lib/supabase/realtime";

interface Props {
  /** IDs of properties owned by the current user — used to filter offers */
  myPropertyIds: string[];
  /** Current user ID — used to filter offers the user made */
  userId: string;
}

/**
 * Listens for offer events scoped to the current user:
 * - INSERT on offers where property_id is one of my properties (I received an offer)
 * - UPDATE on offers where buyer_id is me (my offer status changed)
 */
export function DashboardRealtimeListener({ myPropertyIds, userId }: Props) {
  const router = useRouter();

  // Listen for new offers on ANY of the offers table, then filter client-side
  useRealtimeSubscription({
    table: "offers",
    event: "INSERT",
    onEvent: (payload) => {
      const newOffer = payload.new as Record<string, unknown> | undefined;
      if (!newOffer) return;

      // Only toast if this offer is on one of MY properties
      const propertyId = newOffer.property_id as string | undefined;
      if (!propertyId || !myPropertyIds.includes(propertyId)) return;

      const price = newOffer.offer_price
        ? `₹${Number(newOffer.offer_price).toLocaleString("en-IN")}`
        : "";
      toast.info(`New offer received${price ? `: ${price}` : ""}`, {
        action: {
          label: "View",
          onClick: () => router.push("/dashboard/offers"),
        },
      });
      router.refresh();
    },
  });

  // Listen for offer status changes (my sent offers being accepted/rejected)
  useRealtimeSubscription({
    table: "offers",
    event: "UPDATE",
    onEvent: (payload) => {
      const updated = payload.new as Record<string, unknown> | undefined;
      if (!updated) return;

      // Only toast for offers I made OR offers on my properties
      const buyerId = updated.buyer_id as string | undefined;
      const propertyId = updated.property_id as string | undefined;
      const isMine = buyerId === userId || (propertyId && myPropertyIds.includes(propertyId));
      if (!isMine) return;

      const status = updated.status as string | undefined;
      if (status === "accepted") {
        toast.success("An offer was accepted!");
      } else if (status === "rejected") {
        toast.info("An offer was rejected.");
      }
      router.refresh();
    },
  });

  return null;
}
