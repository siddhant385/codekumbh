"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Bot,
  Loader2,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  IndianRupee,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestValuation } from "@/actions/property/property";
import { useRouter } from "next/navigation";
import type { Valuation } from "@/lib/schema/property.schema";

interface StructuredFactors {
  price_per_sqft?: number;
  market_comparison?: string;
  location_analysis?: string;
  investment_score?: number;
  investment_reasoning?: string;
  risk_factors?: string[];
  positive_factors?: string[];
  recommendation?: string;
  recommendation_detail?: string;
  price_trend?: string;
  roi_estimate_3yr?: string;
  comparable_properties?: string;
}

interface Props {
  propertyId: string;
  askingPrice: number | null;
  valuation: Valuation | null;
}

export function AIValuationCard({
  propertyId,
  askingPrice,
  valuation,
}: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await requestValuation(propertyId);
      if ("error" in result) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      toast.success("AI valuation started! Refreshing in a few seconds...");
      // Poll for completion — wait then refresh
      setTimeout(() => {
        router.refresh();
        setLoading(false);
      }, 12000);
    } catch {
      toast.error("Failed to start valuation");
      setLoading(false);
    }
  }

  // No valuation yet — show CTA
  if (!valuation) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Valuation</h3>
            <p className="text-xs text-muted-foreground">Powered by Gemini 2.5 Flash</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Get an AI-powered valuation report with market analysis, investment scoring, risk assessment, and price recommendation.
        </p>
        <Button onClick={handleGenerate} disabled={loading} className="w-full">
          {loading ? (
            <Loader2 size={16} className="animate-spin mr-2" />
          ) : (
            <Sparkles size={16} className="mr-2" />
          )}
          {loading ? "Generating Report..." : "Generate AI Valuation"}
        </Button>
      </div>
    );
  }

  // Existing valuation — render report
  const sf = (valuation.structured_factors ?? {}) as StructuredFactors;
  const recColor =
    sf.recommendation === "BUY"
      ? "text-green-600 bg-green-100"
      : sf.recommendation === "OVERPRICED"
      ? "text-red-600 bg-red-100"
      : "text-amber-600 bg-amber-100";

  const trendIcon =
    sf.price_trend === "APPRECIATING" ? "📈" : sf.price_trend === "DEPRECIATING" ? "📉" : "➡️";

  const priceDiff =
    askingPrice && valuation.predicted_price
      ? ((Number(askingPrice) - Number(valuation.predicted_price)) / Number(valuation.predicted_price)) * 100
      : null;

  const confidencePct = valuation.confidence_score
    ? `${Math.round(Number(valuation.confidence_score) * 100)}%`
    : "—";

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/5 px-5 py-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Valuation Report</h3>
            <p className="text-[10px] text-muted-foreground">
              {valuation.model_name ?? "gemini-2.5-flash"} · Generated {new Date(valuation.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        </Button>
      </div>

      <div className="p-5 space-y-5">
        {/* Estimated Value */}
        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Estimated Market Value
          </p>
          <p className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
            <IndianRupee size={20} />
            {valuation.predicted_price
              ? Number(valuation.predicted_price).toLocaleString("en-IN")
              : "—"}
          </p>
          {valuation.price_range_low && valuation.price_range_high && (
            <p className="text-xs text-muted-foreground">
              Range: ₹{Number(valuation.price_range_low).toLocaleString("en-IN")} – ₹{Number(valuation.price_range_high).toLocaleString("en-IN")}
            </p>
          )}
          {priceDiff !== null && (
            <p className={`text-xs font-medium ${priceDiff > 5 ? "text-red-600" : priceDiff < -5 ? "text-green-600" : "text-muted-foreground"}`}>
              {priceDiff > 0 ? `${priceDiff.toFixed(1)}% above` : `${Math.abs(priceDiff).toFixed(1)}% below`} estimated value
            </p>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <MetricBox
            label="Confidence"
            value={confidencePct}
            icon={<ShieldAlert size={14} />}
          />
          <MetricBox
            label="Investment"
            value={sf.investment_score ? `${sf.investment_score}/10` : "—"}
            icon={<BarChart3 size={14} />}
          />
          <MetricBox
            label="₹/sqft"
            value={sf.price_per_sqft ? `₹${Number(sf.price_per_sqft).toLocaleString("en-IN")}` : "—"}
            icon={<TrendingUp size={14} />}
          />
        </div>

        {/* Recommendation Badge */}
        {sf.recommendation && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
            <div>
              <p className="text-xs text-muted-foreground">Recommendation</p>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full mt-1 ${recColor}`}>
                {sf.recommendation}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Trend {trendIcon}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                3yr ROI: <strong className="text-foreground">{sf.roi_estimate_3yr ?? "N/A"}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Reasoning */}
        {valuation.reasoning && (
          <AnalysisSection title="AI Reasoning" text={valuation.reasoning} />
        )}

        {/* Analysis from structured_factors */}
        {sf.market_comparison && (
          <AnalysisSection title="Market Comparison" text={sf.market_comparison} />
        )}
        {sf.location_analysis && (
          <AnalysisSection title="Location Analysis" text={sf.location_analysis} />
        )}
        {sf.recommendation_detail && (
          <AnalysisSection title="Detailed Reasoning" text={sf.recommendation_detail} />
        )}
        {sf.investment_reasoning && (
          <AnalysisSection title="Investment Outlook" text={sf.investment_reasoning} />
        )}
        {sf.comparable_properties && (
          <AnalysisSection title="Comparable Properties" text={sf.comparable_properties} />
        )}

        {/* Factors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sf.positive_factors && sf.positive_factors.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-green-700 flex items-center gap-1">
                <CheckCircle2 size={12} /> Positive Factors
              </p>
              <ul className="space-y-1">
                {sf.positive_factors.map((f, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">+</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {sf.risk_factors && sf.risk_factors.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-red-700 flex items-center gap-1">
                <AlertTriangle size={12} /> Risk Factors
              </p>
              <ul className="space-y-1">
                {sf.risk_factors.map((f, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-red-500 mt-0.5">!</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────── */

function MetricBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-2.5 text-center">
      <div className="flex justify-center text-muted-foreground mb-1">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground capitalize">{value}</p>
    </div>
  );
}

function AnalysisSection({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        {title}
      </p>
      <p className="text-sm text-foreground leading-relaxed">{text}</p>
    </div>
  );
}
