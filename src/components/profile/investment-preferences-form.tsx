"use client";

import { useActionState, useState } from "react";
import { updateInvestmentPreferences } from "@/actions/profile/profile";
import type { Profile } from "@/lib/schema/profile.schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Edit3, X, Check, Loader2, TrendingUp } from "lucide-react";

type ActionState = { error: string } | { success: true } | null;

function investmentAction(_prev: ActionState, formData: FormData) {
  return updateInvestmentPreferences(formData) as Promise<ActionState>;
}

const RISK_OPTIONS: { value: "low" | "medium" | "high"; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  { value: "high", label: "High", color: "bg-red-100 text-red-700 border-red-300" },
];

export function InvestmentPreferencesForm({ profile }: { profile: Profile }) {
  const [editing, setEditing] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<"low" | "medium" | "high">(
    profile.risk_tolerance ?? "medium"
  );
  const [state, formAction, isPending] = useActionState(investmentAction, null);

  const wasSuccess = state !== null && "success" in state;
  if (wasSuccess && editing) setEditing(false);

  const formatBudget = (n: number | null) =>
    n != null
      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
      : "Not set";

  const riskBadge = RISK_OPTIONS.find((r) => r.value === profile.risk_tolerance);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Investment Preferences
        </h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <Edit3 size={12} /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <form action={formAction} className="space-y-4">
          {/* Hidden risk_tolerance field driven by the button group */}
          <input type="hidden" name="risk_tolerance" value={selectedRisk} />

          <div className="space-y-1.5">
            <Label htmlFor="investment_budget">Investment Budget (₹)</Label>
            <Input
              id="investment_budget"
              name="investment_budget"
              type="number"
              min={1}
              step={1}
              defaultValue={profile.investment_budget ?? ""}
              required
              placeholder="e.g. 5000000"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Risk Tolerance</Label>
            <div className="flex gap-2">
              {RISK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedRisk(opt.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    selectedRisk === opt.value
                      ? opt.color + " ring-2 ring-offset-1 ring-blue-400"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {state && "error" in state && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(false)}
              disabled={isPending}
            >
              <X size={14} className="mr-1" /> Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <Check size={14} className="mr-1" />
              )}
              Save
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              <TrendingUp size={16} className="text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Investment Budget</p>
              <p className="text-sm text-gray-800 font-medium">
                {formatBudget(profile.investment_budget)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              <TrendingUp size={16} className="text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Risk Tolerance</p>
              {riskBadge ? (
                <span
                  className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${riskBadge.color}`}
                >
                  {riskBadge.label}
                </span>
              ) : (
                <p className="text-sm text-gray-400 italic">Not set</p>
              )}
            </div>
          </div>

          {!profile.onboarding_completed && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              ⚠ Complete your investment preferences to unlock AI-powered investment insights.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
