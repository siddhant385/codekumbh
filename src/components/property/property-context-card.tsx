"use client";

import { useState } from "react";
import {
  TrainFront, GraduationCap, Stethoscope, ShieldAlert, Wind,
  Wifi, TrendingUp, Home, BarChart3, Sparkles, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────── */

interface PropertyContext {
  id?: string;
  property_id?: string;
  distance_to_metro: number | null;
  distance_to_school: number | null;
  distance_to_hospital: number | null;
  crime_index: number | null;
  pollution_index: number | null;
  connectivity_score: number | null;
  future_development_score: number | null;
  rental_yield_estimate: number | null;
  neighborhood_growth_rate: number | null;
  created_at?: string;
}

interface Props {
  context: PropertyContext | null;
  city?: string | null;
  propertyType?: string | null;
}

/* ─────────────────────────────────────────────────────────────────────────── */

const LOADING_STEPS = [
  "Scanning nearby infrastructure…",
  "Analysing crime & pollution data…",
  "Computing connectivity scores…",
  "Calculating investment metrics…",
];

function getDummyContext(city: string | null): PropertyContext {
  return {
    distance_to_metro:         0.8,
    distance_to_school:        1.2,
    distance_to_hospital:      2.1,
    crime_index:               18,
    pollution_index:           34,
    connectivity_score:        8.6,
    future_development_score:  9.1,
    rental_yield_estimate:     4.2,
    neighborhood_growth_rate:  11.8,
    created_at:                new Date().toISOString(),
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */

function ScoreBar({ value, max, good = "high" }: {
  value: number; max: number; good?: "high" | "low";
}) {
  const pct = Math.min((value / max) * 100, 100);
  // For "low is good" (crime, pollution), invert color logic
  const isGood = good === "high" ? pct > 60 : pct < 40;
  const isMid  = good === "high" ? pct >= 40 && pct <= 60 : pct >= 40 && pct <= 60;
  return (
    <div className="h-1 w-full rounded-full bg-muted overflow-hidden mt-1">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-700",
          isGood ? "bg-emerald-500" : isMid ? "bg-amber-500" : "bg-red-400",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

export function PropertyContextCard({ context: dbContext, city, propertyType }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">(
    dbContext ? "done" : "idle",
  );
  const [step, setStep]       = useState(0);
  const [context, setContext] = useState<PropertyContext | null>(dbContext);

  function handleGenerate() {
    setStatus("loading");
    setStep(0);
    let s = 0;
    const iv = setInterval(() => {
      s++;
      if (s < LOADING_STEPS.length) {
        setStep(s);
      } else {
        clearInterval(iv);
        setContext(getDummyContext(city ?? null));
        setStatus("done");
      }
    }, 700);
  }

  const metrics = context
    ? [
        {
          icon: <TrainFront size={13} />,
          label: "Metro",
          value: context.distance_to_metro != null ? `${context.distance_to_metro} km` : "—",
          sub: context.distance_to_metro != null
            ? context.distance_to_metro <= 1 ? "Walking distance" : context.distance_to_metro <= 3 ? "Short commute" : "Far"
            : null,
          bar: context.distance_to_metro != null
            ? { value: Math.max(0, 5 - context.distance_to_metro), max: 5, good: "high" as const }
            : null,
          color: "text-blue-500", bg: "bg-blue-500/10",
        },
        {
          icon: <GraduationCap size={13} />,
          label: "School",
          value: context.distance_to_school != null ? `${context.distance_to_school} km` : "—",
          sub: context.distance_to_school != null
            ? context.distance_to_school <= 1 ? "Very close" : context.distance_to_school <= 2 ? "Nearby" : "Moderate"
            : null,
          bar: context.distance_to_school != null
            ? { value: Math.max(0, 5 - context.distance_to_school), max: 5, good: "high" as const }
            : null,
          color: "text-green-500", bg: "bg-green-500/10",
        },
        {
          icon: <Stethoscope size={13} />,
          label: "Hospital",
          value: context.distance_to_hospital != null ? `${context.distance_to_hospital} km` : "—",
          sub: context.distance_to_hospital != null
            ? context.distance_to_hospital <= 2 ? "Quick access" : "Accessible"
            : null,
          bar: context.distance_to_hospital != null
            ? { value: Math.max(0, 5 - context.distance_to_hospital), max: 5, good: "high" as const }
            : null,
          color: "text-red-500", bg: "bg-red-500/10",
        },
        {
          icon: <ShieldAlert size={13} />,
          label: "Crime Index",
          value: context.crime_index != null ? `${context.crime_index}/100` : "—",
          sub: context.crime_index != null
            ? context.crime_index < 25 ? "Very safe" : context.crime_index < 50 ? "Safe" : "Caution"
            : null,
          bar: context.crime_index != null
            ? { value: context.crime_index, max: 100, good: "low" as const }
            : null,
          color: "text-amber-500", bg: "bg-amber-500/10",
        },
        {
          icon: <Wind size={13} />,
          label: "Pollution",
          value: context.pollution_index != null ? `${context.pollution_index}/100` : "—",
          sub: context.pollution_index != null
            ? context.pollution_index < 30 ? "Clean air" : context.pollution_index < 60 ? "Moderate" : "High"
            : null,
          bar: context.pollution_index != null
            ? { value: context.pollution_index, max: 100, good: "low" as const }
            : null,
          color: "text-gray-500", bg: "bg-gray-500/10",
        },
        {
          icon: <Wifi size={13} />,
          label: "Connectivity",
          value: context.connectivity_score != null ? `${context.connectivity_score}/10` : "—",
          sub: context.connectivity_score != null
            ? context.connectivity_score >= 8 ? "Excellent" : context.connectivity_score >= 6 ? "Good" : "Average"
            : null,
          bar: context.connectivity_score != null
            ? { value: context.connectivity_score, max: 10, good: "high" as const }
            : null,
          color: "text-indigo-500", bg: "bg-indigo-500/10",
        },
        {
          icon: <TrendingUp size={13} />,
          label: "Future Dev",
          value: context.future_development_score != null ? `${context.future_development_score}/10` : "—",
          sub: context.future_development_score != null
            ? context.future_development_score >= 8 ? "High potential" : "Moderate"
            : null,
          bar: context.future_development_score != null
            ? { value: context.future_development_score, max: 10, good: "high" as const }
            : null,
          color: "text-purple-500", bg: "bg-purple-500/10",
        },
        {
          icon: <Home size={13} />,
          label: "Rental Yield",
          value: context.rental_yield_estimate != null ? `${context.rental_yield_estimate}%` : "—",
          sub: context.rental_yield_estimate != null
            ? context.rental_yield_estimate >= 4 ? "Strong yield" : "Stable"
            : null,
          bar: context.rental_yield_estimate != null
            ? { value: context.rental_yield_estimate, max: 8, good: "high" as const }
            : null,
          color: "text-teal-500", bg: "bg-teal-500/10",
        },
        {
          icon: <BarChart3 size={13} />,
          label: "Growth Rate",
          value: context.neighborhood_growth_rate != null ? `${context.neighborhood_growth_rate}%/yr` : "—",
          sub: context.neighborhood_growth_rate != null
            ? context.neighborhood_growth_rate >= 10 ? "High growth" : "Stable"
            : null,
          bar: context.neighborhood_growth_rate != null
            ? { value: context.neighborhood_growth_rate, max: 20, good: "high" as const }
            : null,
          color: "text-emerald-500", bg: "bg-emerald-500/10",
        },
      ]
    : [];

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
          <BarChart3 size={13} className="text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Neighbourhood Intelligence</p>
          <p className="text-[11px] text-muted-foreground">
            {status === "done" && context?.created_at
              ? `AI-enriched · ${new Date(context.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
              : "AI-powered location analysis"}
          </p>
        </div>
        {status === "done" && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
            LIVE
          </span>
        )}
      </div>

      <div className="p-5">
        {/* ── Idle ── */}
        {status === "idle" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Get AI-powered insights on metro access, safety scores, connectivity,
              rental yield, and neighbourhood growth potential.
            </p>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-opacity"
            >
              <Sparkles size={14} /> Analyse Neighbourhood
            </button>
          </div>
        )}

        {/* ── Loading ── */}
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-blue-200 dark:border-blue-800" />
              <div className="absolute inset-0 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
              <BarChart3 size={16} className="text-blue-600" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">
                {LOADING_STEPS[step]}
              </p>
              <div className="flex items-center justify-center gap-1">
                {LOADING_STEPS.map((_, i) => (
                  <div key={i} className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    i <= step ? "bg-blue-600" : "bg-border",
                  )} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Result ── */}
        {status === "done" && context && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {metrics.map((m) => (
                <div
                  key={m.label}
                  className="bg-muted/40 rounded-lg p-2.5 space-y-0.5"
                >
                  <div className={cn("flex items-center gap-1", m.color)}>
                    <div className={cn("w-5 h-5 rounded flex items-center justify-center shrink-0", m.bg)}>
                      {m.icon}
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate">{m.label}</span>
                  </div>
                  <p className="text-xs font-bold text-foreground">{m.value}</p>
                  {m.sub && (
                    <p className="text-[9px] text-muted-foreground leading-tight">{m.sub}</p>
                  )}
                  {m.bar && (
                    <ScoreBar value={m.bar.value} max={m.bar.max} good={m.bar.good} />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => { setStatus("idle"); setContext(null); }}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
            >
              Re-analyse
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
