import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  IndianRupee,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
} from "lucide-react";
import type { Offer, Property } from "@/lib/schema/property.schema";

export default async function ReceivedOffersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Get my properties
  const { data: myProperties } = await supabase
    .from("properties")
    .select("*")
    .eq("owner_id", user.id);
  const properties = (myProperties ?? []) as Property[];
  const propertyIds = properties.map((p) => p.id);

  // Get all offers on my properties
  let offers: (Offer & { property_title: string; property_type: string | null })[] = [];
  if (propertyIds.length > 0) {
    const { data } = await supabase
      .from("offers")
      .select("*")
      .in("property_id", propertyIds)
      .order("created_at", { ascending: false });

    offers = ((data ?? []) as Offer[]).map((o) => {
      const prop = properties.find((p) => p.id === o.property_id);
      return {
        ...o,
        property_title: prop?.title ?? "Unknown",
        property_type: prop?.property_type ?? null,
      };
    });
  }

  const pending = offers.filter((o) => o.status === "pending");
  const others = offers.filter((o) => o.status !== "pending");

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Offers Received</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {offers.length} total offer{offers.length !== 1 && "s"} across {properties.length} propert{properties.length !== 1 ? "ies" : "y"}
          </p>
        </div>

        {offers.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Building2 size={32} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No offers received yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending first */}
            {pending.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">
                  Pending ({pending.length})
                </h2>
                <OfferList offers={pending} />
              </div>
            )}
            {others.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Past Offers ({others.length})
                </h2>
                <OfferList offers={others} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OfferList({ offers }: { offers: (Offer & { property_title: string; property_type: string | null })[] }) {
  return (
    <div className="space-y-3">
      {offers.map((o) => (
        <Link
          key={o.id}
          href={`/properties/${o.property_id}`}
          className="flex items-center gap-4 bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-accent flex items-center justify-center flex-shrink-0">
            <span className="text-lg">
              {o.property_type === "apartment" ? "🏢" : o.property_type === "villa" ? "🏡" : o.property_type === "plot" ? "🌳" : o.property_type === "commercial" ? "🏪" : "🏠"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{o.property_title}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock size={11} /> {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-foreground flex items-center justify-end gap-0.5">
              <IndianRupee size={12} />
              {Number(o.offer_price).toLocaleString("en-IN")}
            </p>
            <StatusBadge status={o.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { icon: React.ReactNode; cls: string }> = {
    pending: { icon: <Clock size={10} />, cls: "bg-amber-100 text-amber-700" },
    accepted: { icon: <CheckCircle2 size={10} />, cls: "bg-green-100 text-green-700" },
    rejected: { icon: <XCircle size={10} />, cls: "bg-red-100 text-red-700" },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize mt-1 ${c.cls}`}>
      {c.icon} {status}
    </span>
  );
}
