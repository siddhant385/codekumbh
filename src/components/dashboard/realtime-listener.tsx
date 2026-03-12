"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRealtimeSubscription } from "@/lib/supabase/realtime";

/**
 * Listens for new offers on ANY of the user's properties.
 * Since we can't easily filter by "owner" at the Realtime level,
 * we listen for all offer INSERTs and let the server-rendered
 * page handle filtering. The toast + refresh keeps the dashboard live.
 */
export function DashboardRealtimeListener() {
  const router = useRouter();

  // Listen for new offers (any insert on offers table)
  useRealtimeSubscription({
    table: "offers",
    event: "INSERT",
    onEvent: (payload) => {
      const newOffer = payload.new as Record<string, unknown> | undefined;
      const price = newOffer?.offer_price
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

  // Listen for offer status changes (accepted/rejected)
  useRealtimeSubscription({
    table: "offers",
    event: "UPDATE",
    onEvent: (payload) => {
      const updated = payload.new as Record<string, unknown> | undefined;
      const status = updated?.status as string | undefined;
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
