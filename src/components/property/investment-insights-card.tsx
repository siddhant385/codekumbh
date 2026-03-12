"use client";

import {
  Lightbulb,
  IndianRupee,
  ShieldAlert,
  TrendingUp,
  PieChart,
  Loader2,
} from "lucide-react";

interface RecommendedProperty {
  type: string;
  city: string;
  reason: string;
  estimated_price: number;
}

interface AllocationStrategy {
  property_investment_pct?: number;
  liquid_reserve_pct?: number;
  renovation_budget_pct?: number;
  reasoning?: string;
}

interface InvestmentInsight {
  id: string;
  user_id: string;
  investment_budget: number | null;
  risk_tolerance: string | null;
  recommended_properties: RecommendedProperty[] | null;
  allocation_strategy: AllocationStrategy | null;
  projected_roi: number | null;
  risk_analysis: string | null;
  confidence_score: number | null;
  created_at: string;
}

interface Props {
  insight: InvestmentInsight | null;
}

export function InvestmentInsightsCard({ insight }: Props) {
  if (!insight) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Lightbulb size={16} className="text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Investment Insights
            </h3>
            <p className="text-xs text-muted-foreground">AI-generated analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
          <Loader2 size={14} className="animate-spin" />
          <span>Generating investment insights...</span>
        </div>
      </div>
    );
  }

  const riskColor =
    insight.risk_tolerance === "LOW"
      ? "bg-green-100 text-green-700"
      : insight.risk_tolerance === "HIGH"
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700";

  const alloc = insight.allocation_strategy;
  const recommendations = insight.recommended_properties ?? [];

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Lightbulb size={14} className="text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Investment Insights
            </h3>
            <p className="text-[10px] text-muted-foreground">
              AI-generated ·{" "}
              {new Date(insight.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
            <div className="flex justify-center text-muted-foreground mb-1">
              <TrendingUp size={14} />
            </div>
            <p className="text-[10px] text-muted-foreground">Projected ROI</p>
            <p className="text-sm font-semibold text-foreground">
              {insight.projected_roi != null ? `${insight.projected_roi}%` : "—"}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
            <div className="flex justify-center text-muted-foreground mb-1">
              <ShieldAlert size={14} />
            </div>
            <p className="text-[10px] text-muted-foreground">Risk Level</p>
            <span
              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${riskColor}`}
            >
              {insight.risk_tolerance ?? "—"}
            </span>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
            <div className="flex justify-center text-muted-foreground mb-1">
              <IndianRupee size={14} />
            </div>
            <p className="text-[10px] text-muted-foreground">Confidence</p>
            <p className="text-sm font-semibold text-foreground">
              {insight.confidence_score != null
                ? `${Math.round(Number(insight.confidence_score) * 100)}%`
                : "—"}
            </p>
          </div>
        </div>

        {/* Allocation Strategy */}
        {alloc && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <PieChart size={11} /> Allocation Strategy
            </p>
            <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-2">
              {alloc.property_investment_pct != null && alloc.property_investment_pct > 0 && (
                <div
                  className="bg-primary rounded-l-full"
                  style={{ width: `${alloc.property_investment_pct}%` }}
                  title={`Property: ${alloc.property_investment_pct}%`}
                />
              )}
              {alloc.liquid_reserve_pct != null && alloc.liquid_reserve_pct > 0 && (
                <div
                  className="bg-blue-400"
                  style={{ width: `${alloc.liquid_reserve_pct}%` }}
                  title={`Reserve: ${alloc.liquid_reserve_pct}%`}
                />
              )}
              {alloc.renovation_budget_pct != null && alloc.renovation_budget_pct > 0 && (
                <div
                  className="bg-amber-400 rounded-r-full"
                  style={{ width: `${alloc.renovation_budget_pct}%` }}
                  title={`Renovation: ${alloc.renovation_budget_pct}%`}
                />
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Property {alloc.property_investment_pct ?? 0}%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                Reserve {alloc.liquid_reserve_pct ?? 0}%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Renovation {alloc.renovation_budget_pct ?? 0}%
              </span>
            </div>
            {alloc.reasoning && (
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {alloc.reasoning}
              </p>
            )}
          </div>
        )}

        {/* Risk Analysis */}
        {insight.risk_analysis && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Risk Analysis
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {insight.risk_analysis}
            </p>
          </div>
        )}

        {/* Recommended Properties */}
        {recommendations.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Alternative Investments
            </p>
            <div className="space-y-2">
              {recommendations.slice(0, 3).map((rec, i) => (
                <div
                  key={i}
                  className="bg-muted/40 rounded-lg p-2.5 flex items-start justify-between gap-2"
                >
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {rec.type} in {rec.city}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {rec.reason}
                    </p>
                  </div>
                  {rec.estimated_price > 0 && (
                    <p className="text-xs font-semibold text-foreground whitespace-nowrap">
                      ₹{Number(rec.estimated_price).toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
