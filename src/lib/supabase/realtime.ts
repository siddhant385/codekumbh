"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type EventType = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeOptions<T extends Record<string, unknown>> {
  /** Supabase table name to subscribe to */
  table: string;
  /** Schema (default: "public") */
  schema?: string;
  /** Event type to listen for */
  event?: EventType;
  /** Column filter (e.g., "property_id" for eq filter) */
  filterColumn?: string;
  /** Value to filter on */
  filterValue?: string;
  /** Callback when an event is received */
  onEvent: (payload: RealtimePostgresChangesPayload<T>) => void;
  /** Whether the subscription is enabled (default: true) */
  enabled?: boolean;
}

/**
 * React hook for Supabase Realtime Postgres Changes.
 *
 * Usage:
 * ```ts
 * useRealtimeSubscription({
 *   table: "ai_property_valuations",
 *   event: "INSERT",
 *   filterColumn: "property_id",
 *   filterValue: propertyId,
 *   onEvent: (payload) => { router.refresh(); },
 * });
 * ```
 */
export function useRealtimeSubscription<T extends Record<string, unknown>>({
  table,
  schema = "public",
  event = "*",
  filterColumn,
  filterValue,
  onEvent,
  enabled = true,
}: UseRealtimeOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }

    const supabase = createClient();

    const filter =
      filterColumn && filterValue
        ? `${filterColumn}=eq.${filterValue}`
        : undefined;

    const channelName = `${table}-${event}-${filterColumn ?? "all"}-${filterValue ?? "all"}-${Date.now()}`;

    // Build the subscription config
    const subscribeConfig: {
      event: EventType;
      schema: string;
      table: string;
      filter?: string;
    } = {
      event,
      schema,
      table,
    };
    if (filter) subscribeConfig.filter = filter;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as never,
        subscribeConfig as never,
        (payload: RealtimePostgresChangesPayload<T>) => {
          callbackRef.current(payload);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return cleanup;
  }, [table, schema, event, filterColumn, filterValue, enabled, cleanup]);

  return { unsubscribe: cleanup };
}

/**
 * Simpler hook that just refreshes the page on any change to a table/filter.
 */
export function useRealtimeRefresh(
  table: string,
  filterColumn?: string,
  filterValue?: string,
  options?: { event?: EventType; enabled?: boolean }
) {
  const [refreshKey, setRefreshKey] = useStateCompat(0);

  useRealtimeSubscription({
    table,
    event: options?.event ?? "INSERT",
    filterColumn,
    filterValue,
    enabled: options?.enabled ?? true,
    onEvent: () => {
      setRefreshKey((k) => k + 1);
    },
  });

  return refreshKey;
}

// We need useState from react — import at top is fine since this is "use client"
import { useState as useStateCompat } from "react";
