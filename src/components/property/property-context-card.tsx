"use client";

import {
  TrainFront,
  GraduationCap,
  Stethoscope,
  ShieldAlert,
  Wind,
  Wifi,
  TrendingUp,
  Home,
  BarChart3,
  Loader2,
} from "lucide-react";

interface PropertyContext {
  id: string;
  property_id: string;
  distance_to_metro: number | null;
  distance_to_school: number | null;
  distance_to_hospital: number | null;
  crime_index: number | null;
  pollution_index: number | null;
  connectivity_score: number | null;
  future_development_score: number | null;
  rental_yield_estimate: number | null;
  neighborhood_growth_rate: number | null;
  created_at: string;
}

interface Props {
  context: PropertyContext | null;
}

export function PropertyContextCard({ context }: Props) {
  if (!context) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <BarChart3 size={16} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Neighbourhood Intelligence
            </h3>
            <p className="text-xs text-muted-foreground">
              AI-generated location data
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
          <Loader2 size={14} className="animate-spin" />
          <span>Generating neighbourhood data...</span>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      icon: <TrainFront size={14} />,
      label: "Metro",
      value: context.distance_to_metro != null ? `${context.distance_to_metro} km` : "—",
      color: "text-blue-500",
    },
    {
      icon: <GraduationCap size={14} />,
      label: "School",
      value: context.distance_to_school != null ? `${context.distance_to_school} km` : "—",
      color: "text-green-500",
    },
    {
      icon: <Stethoscope size={14} />,
      label: "Hospital",
      value: context.distance_to_hospital != null ? `${context.distance_to_hospital} km` : "—",
      color: "text-red-500",
    },
    {
      icon: <ShieldAlert size={14} />,
      label: "Crime Index",
      value: context.crime_index != null ? `${context.crime_index}/100` : "—",
      color: "text-amber-500",
    },
    {
      icon: <Wind size={14} />,
      label: "Pollution",
      value: context.pollution_index != null ? `${context.pollution_index}/100` : "—",
      color: "text-gray-500",
    },
    {
      icon: <Wifi size={14} />,
      label: "Connectivity",
      value: context.connectivity_score != null ? `${context.connectivity_score}/10` : "—",
      color: "text-indigo-500",
    },
    {
      icon: <TrendingUp size={14} />,
      label: "Future Dev",
      value: context.future_development_score != null ? `${context.future_development_score}/10` : "—",
      color: "text-purple-500",
    },
    {
      icon: <Home size={14} />,
      label: "Rental Yield",
      value: context.rental_yield_estimate != null ? `${context.rental_yield_estimate}%` : "—",
      color: "text-teal-500",
    },
    {
      icon: <BarChart3 size={14} />,
      label: "Growth Rate",
      value: context.neighborhood_growth_rate != null ? `${context.neighborhood_growth_rate}%/yr` : "—",
      color: "text-emerald-500",
    },
  ];

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500/5 to-indigo-500/5 px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <BarChart3 size={14} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Neighbourhood Intelligence
            </h3>
            <p className="text-[10px] text-muted-foreground">
              AI-enriched · Generated{" "}
              {new Date(context.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2.5">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="bg-muted/40 rounded-lg p-2.5 text-center space-y-0.5"
            >
              <div className={`flex justify-center ${m.color}`}>{m.icon}</div>
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
              <p className="text-xs font-semibold text-foreground">{m.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
