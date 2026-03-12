"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, CircleDot, Archive, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updatePropertyStatus } from "@/actions/property/property";

const STATUS_OPTIONS = [
  { value: "active" as const, label: "Active", icon: CheckCircle2, color: "text-green-700 border-green-200 hover:bg-green-50 bg-green-50/50", activeColor: "bg-green-100 text-green-800 border-green-300" },
  { value: "draft" as const, label: "Draft", icon: CircleDot, color: "text-muted-foreground border-border hover:bg-muted", activeColor: "bg-muted text-foreground border-border" },
  { value: "sold" as const, label: "Sold", icon: Home, color: "text-blue-700 border-blue-200 hover:bg-blue-50 bg-blue-50/50", activeColor: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "rented" as const, label: "Rented", icon: Archive, color: "text-purple-700 border-purple-200 hover:bg-purple-50 bg-purple-50/50", activeColor: "bg-purple-100 text-purple-800 border-purple-300" },
] as const;

interface PropertyStatusManagerProps {
  propertyId: string;
  currentStatus: string;
}

export function PropertyStatusManager({ propertyId, currentStatus }: PropertyStatusManagerProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function handleStatusChange(status: "draft" | "active" | "sold" | "rented") {
    if (status === currentStatus) return;
    setLoading(status);

    const result = await updatePropertyStatus(propertyId, status);
    setLoading(null);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(`Property status changed to ${status}`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Property Status</h3>
      <div className="grid grid-cols-2 gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = currentStatus === opt.value;
          const isLoading = loading === opt.value;
          return (
            <Button
              key={opt.value}
              variant="outline"
              size="sm"
              className={`h-9 text-xs justify-start gap-1.5 ${
                isActive ? opt.activeColor : opt.color
              } ${isActive ? "ring-1 ring-offset-1" : ""}`}
              disabled={loading !== null || isActive}
              onClick={() => handleStatusChange(opt.value)}
            >
              {isLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Icon size={13} />
              )}
              {opt.label}
              {isActive && <span className="ml-auto text-[9px] opacity-60">current</span>}
            </Button>
          );
        })}
      </div>
      {currentStatus === "sold" && (
        <p className="text-[10px] text-muted-foreground">
          Marking as sold hides this listing from public search.
        </p>
      )}
    </div>
  );
}
