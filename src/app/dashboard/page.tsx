import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  IndianRupee,
  TrendingUp,
  Plus,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  ArrowRight,
  MapPin,
  Search,
  AlertCircle,
  MapPinOff,
  FileText,
  Percent,
  Sparkles,
  ShieldCheck,
  Calendar,
  Layers,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardRealtimeListener } from "@/components/dashboard/realtime-listener";
import type { Property } from "@/lib/schema/property.schema";
import type { Offer } from "@/lib/schema/property.schema";
import { FadeIn } from "@/components/fade-in";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Onboarding check — redirect if not completed
  const { data: profileCheck } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();
  if (!profileCheck?.onboarding_completed) redirect("/onboarding");

  // Fetch my properties
  const { data: myProperties } = await supabase
    .from("properties")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  const properties = (myProperties ?? []) as Property[];

  // Fetch all offers on my properties
  const propertyIds = properties.map((p) => p.id);
  let receivedOffers: (Offer & { property_title?: string })[] = [];
  if (propertyIds.length > 0) {
    const { data: offers } = await supabase
      .from("offers")
      .select("*")
      .in("property_id", propertyIds)
      .order("created_at", { ascending: false });
    receivedOffers = ((offers ?? []) as Offer[]).map((o) => ({
      ...o,
      property_title: properties.find((p) => p.id === o.property_id)?.title ?? "Unknown",
    }));
  }

  // Fetch offers I've made as a buyer
  const { data: myOffers } = await supabase
    .from("offers")
    .select("*")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });
  const sentOffers = (myOffers ?? []) as Offer[];

  // Fetch latest AI investment insight for this user
  type AiInsight = {
    projected_roi: number | null;
    risk_analysis: string | null;
    risk_tolerance: string | null;
    confidence_score: number | null;
    allocation_strategy: { property_investment_pct?: number; liquid_reserve_pct?: number; renovation_budget_pct?: number; reasoning?: string } | null;
  };
  const { data: insightData } = await supabase
    .from("ai_investment_insights")
    .select("projected_roi, risk_analysis, risk_tolerance, confidence_score, allocation_strategy")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const aiInsight = (insightData as AiInsight | null) ?? null;

  // Stats
  const totalPortfolioValue = properties.reduce(
    (sum, p) => sum + (Number(p.asking_price) || 0),
    0
  );
  const activeListings = properties.filter((p) => p.status === "active").length;
  const pendingReceivedOffers = receivedOffers.filter((o) => o.status === "pending").length;
  const pendingSentOffers = sentOffers.filter((o) => o.status === "pending").length;
  const acceptedOffers = receivedOffers.filter((o) => o.status === "accepted").length;
  const acceptanceRate = receivedOffers.length > 0
    ? Math.round((acceptedOffers / receivedOffers.length) * 100)
    : null;

  /* Listing health: flag properties missing key data */
  const incompleteListings = properties.filter(
    (p) => !p.description || !p.latitude || !p.longitude
  );

  /* User display name from email */
  const displayName = user.email?.split("@")[0] ?? "there";

  return (
    <div className="relative flex flex-col min-h-screen selection:bg-indigo-500/30">
      <DashboardRealtimeListener myPropertyIds={propertyIds} userId={user.id} />

      {/* ── Fixed Background ── */}
      <div 
        className="fixed inset-0 z-[-1] bg-[url('https://images.unsplash.com/photo-1723796994732-b375f31ef231?w=1600&auto=format&fit=crop&q=80')] bg-cover bg-center bg-no-repeat"
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-[4px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90" />
      </div>

      <div className="flex-grow w-full pb-20 pt-24 sm:pt-28 z-10">
        
        {/* Page header */}
        <FadeIn className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-widest mb-3">
                <Layers size={14} /> Personal Dashboard
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                Hello, <span className="capitalize text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">{displayName}</span> 👋
              </h1>
              <p className="text-white/50 mt-2 text-sm md:text-base font-medium">
                Manage your real estate assets and analyze market trends in one place.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild size="lg" className="bg-white text-black hover:bg-slate-200 rounded-full font-bold px-8 transition-transform hover:scale-105 active:scale-95">
                <Link href="/properties/new">
                  <Plus size={18} className="mr-2" /> List Property
                </Link>
              </Button>
            </div>
          </div>
        </FadeIn>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

          {/* Pending actions alert strip */}
          {(pendingReceivedOffers > 0 || incompleteListings.length > 0) && (
            <FadeIn delay={0.1} className="space-y-3">
              {pendingReceivedOffers > 0 && (
                <div className="flex items-center gap-3 bg-indigo-500/10 backdrop-blur-md border border-indigo-500/30 rounded-[1.5rem] px-6 py-4">
                  <AlertCircle size={20} className="text-indigo-400 shrink-0" />
                  <p className="text-sm text-indigo-100 flex-1">
                    <strong className="text-white">{pendingReceivedOffers} offer{pendingReceivedOffers !== 1 ? "s" : ""}</strong> waiting for your approval. Time to make a move!
                  </p>
                  <Link
                    href="/dashboard/offers"
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1 transition-colors"
                  >
                    Review <ArrowRight size={14} />
                  </Link>
                </div>
              )}
              {incompleteListings.length > 0 && (
                <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-[1.5rem] px-6 py-4">
                  <AlertCircle size={20} className="text-white/60 shrink-0" />
                  <p className="text-sm text-white/80 flex-1">
                    <strong className="text-white">{incompleteListings.length} listing{incompleteListings.length !== 1 ? "s" : ""}</strong> are missing details or GPS — optimizing them will boost visibility.
                  </p>
                  <Link
                    href="/properties"
                    className="text-xs font-bold text-white/60 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-colors"
                  >
                    Fix <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </FadeIn>
          )}

          {/* Stats grid */}
          <FadeIn delay={0.2} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={<Building2 size={24} />}
              label="My Listings"
              value={properties.length.toString()}
              sub={`${activeListings} active`}
              color="indigo"
            />
            <StatCard
              icon={<IndianRupee size={24} />}
              label="Listings Value"
              value={`₹${formatCompact(totalPortfolioValue)}`}
              sub="Total asking"
              color="emerald"
            />
            <StatCard
              icon={<TrendingUp size={24} />}
              label="Offers Received"
              value={receivedOffers.length.toString()}
              sub={`${pendingReceivedOffers} pending`}
              color="amber"
            />
            <StatCard
              icon={<BarChart3 size={24} />}
              label="My Offers"
              value={sentOffers.length.toString()}
              sub={`${pendingSentOffers} pending`}
              color="blue"
            />
          </FadeIn>

          {/* Main content + sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* My Properties */}
            <FadeIn delay={0.3} className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Portfolio Overview</h2>
                <Link href="/properties" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors">
                  View full list <ArrowRight size={14} />
                </Link>
              </div>

              {properties.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-16 text-center shadow-xl">
                  <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
                    🏘️
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No properties listed yet</h3>
                  <p className="text-white/50 mb-8 max-w-sm mx-auto">
                    Start your journey by listing your first property and reach a global audience of AI-vetted buyers.
                  </p>
                  <Button asChild size="lg" className="bg-white text-black hover:bg-slate-200 rounded-full font-bold px-10 transition-transform hover:scale-105 active:scale-95">
                    <Link href="/properties/new">
                      <Plus size={18} className="mr-2" /> List First Property
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {properties.map((p) => {
                    const offerCount = receivedOffers.filter((o) => o.property_id === p.id).length;
                    const emoji =
                      p.property_type === "apartment" ? "🏢"
                      : p.property_type === "villa" ? "🏡"
                      : p.property_type === "plot" ? "🌳"
                      : p.property_type === "commercial" ? "🏪"
                      : "🏠";
                    return (
                      <Link
                        key={p.id}
                        href={`/properties/${p.id}`}
                        className="group flex flex-col sm:flex-row sm:items-center gap-6 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 hover:bg-white/[0.08] hover:border-indigo-500/40 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all duration-300"
                      >
                        <div className="w-24 h-24 rounded-[1.5rem] bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/5 flex items-center justify-center flex-shrink-0 text-4xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                          {emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                             <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                              p.status === "active" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                              : p.status === "sold" ? "bg-blue-500/20 text-blue-400 border border-blue-500/20"
                              : "bg-white/10 text-white/50 border border-white/10"
                            }`}>
                              {p.status}
                            </span>
                            {offerCount > 0 && (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                                {offerCount} {offerCount === 1 ? 'OFFER' : 'OFFERS'}
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-bold text-white truncate group-hover:text-indigo-300 transition-colors mb-2 tracking-tight">
                            {p.title}
                          </h3>
                          <div className="flex items-center gap-4 text-white/40 text-sm">
                             <p className="flex items-center gap-1.5 truncate">
                              <MapPin size={16} /> {p.city}, {p.state}
                            </p>
                            <p className="flex items-center gap-1.5">
                              <Calendar size={16} /> {new Date(p.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="sm:text-right flex-shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 pt-4 sm:pt-0 border-t sm:border-t-0 border-white/5 mt-2 sm:mt-0">
                          <div>
                            <p className="text-xs text-white/40 uppercase font-bold tracking-widest mb-1">Price</p>
                            <p className="text-2xl font-black text-white flex items-center sm:justify-end gap-1 font-mono">
                              {p.asking_price ? formatCompact(Number(p.asking_price)) : "—"}
                            </p>
                          </div>
                          <ArrowRight size={24} className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </FadeIn>

            {/* Sidebar */}
            <FadeIn delay={0.4} className="space-y-8">

              {/* AI Market Insight */}
              <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/20 backdrop-blur-xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
                <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
                  <div className="w-10 h-10 rounded-[1rem] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-white tracking-tight">AI Insights</p>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Powered by Gemini</p>
                  </div>
                  {aiInsight && (
                    <div className="ml-auto flex items-center gap-1.5 bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">LIVE</span>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  {!aiInsight ? (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center mx-auto mb-4">
                        <BarChart3 size={20} className="text-white/20" />
                      </div>
                      <p className="text-sm font-medium text-white/50 leading-relaxed">
                        AI insights will appear here after your first property listing is analysed.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* ROI + Risk row */}
                      <div className="grid grid-cols-2 gap-3">
                        {aiInsight.projected_roi != null && (
                          <div className="bg-white/5 rounded-[1.5rem] p-4 border border-white/5 text-center">
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Projected ROI</p>
                            <p className="text-2xl font-black text-emerald-400">
                              {aiInsight.projected_roi.toFixed(1)}%
                            </p>
                          </div>
                        )}
                        {aiInsight.confidence_score != null && (
                          <div className="bg-white/5 rounded-[1.5rem] p-4 border border-white/5 text-center">
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Confidence</p>
                            <p className="text-2xl font-black text-white">
                              {aiInsight.confidence_score <= 1
                                ? Math.round(aiInsight.confidence_score * 100)
                                : Math.round(aiInsight.confidence_score)}%
                            </p>
                          </div>
                        )}
                      </div>

                      {aiInsight.risk_tolerance && (
                        <div className={`rounded-[1.5rem] p-4 flex items-center gap-4 border ${
                          aiInsight.risk_tolerance === "LOW"
                            ? "bg-emerald-500/10 border-emerald-500/20"
                            : aiInsight.risk_tolerance === "HIGH"
                            ? "bg-red-500/10 border-red-500/20"
                            : "bg-amber-500/10 border-amber-500/20"
                        }`}>
                          <div className={`p-2 rounded-xl scale-110 ${
                            aiInsight.risk_tolerance === "LOW" ? "bg-emerald-500/20 text-emerald-400" : aiInsight.risk_tolerance === "HIGH" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
                          }`}>
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Risk Tolerance</p>
                            <p className={`text-sm font-bold capitalize ${
                              aiInsight.risk_tolerance === "LOW" ? "text-emerald-300" : aiInsight.risk_tolerance === "HIGH" ? "text-red-300" : "text-amber-300"
                            }`}>
                              {aiInsight.risk_tolerance.charAt(0) + aiInsight.risk_tolerance.slice(1).toLowerCase()} Profile
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Allocation strategy */}
                      {aiInsight.allocation_strategy?.property_investment_pct != null && (
                        <div className="bg-white/5 rounded-[1.5rem] p-6 border border-white/5">
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">
                            Allocation Strategy
                          </p>
                          <div className="space-y-4">
                            {[
                              { label: "Property", pct: aiInsight.allocation_strategy.property_investment_pct, color: "bg-indigo-500" },
                              { label: "Reserve", pct: aiInsight.allocation_strategy.liquid_reserve_pct ?? 0, color: "bg-emerald-500" },
                              { label: "Renovation", pct: aiInsight.allocation_strategy.renovation_budget_pct ?? 0, color: "bg-amber-500" },
                            ].map((item) => (
                              <div key={item.label} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold text-white/70">{item.label}</p>
                                  <p className="text-xs font-black text-white">{item.pct}%</p>
                                </div>
                                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden border border-white/5">
                                  <div className={`h-full rounded-full ${item.color} shadow-[0_0_10px_rgba(0,0,0,0.5)]`} style={{ width: `${item.pct}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Offers Summary Group */}
              <div className="grid grid-cols-1 gap-6">
                 {/* Recent Received Offers */}
                <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                       <TrendingUp size={18} className="text-amber-400" /> Received
                    </h3>
                    {receivedOffers.length > 5 && (
                      <Link href="/dashboard/offers" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors">
                        View More
                      </Link>
                    )}
                  </div>
                  {receivedOffers.length === 0 ? (
                    <p className="text-xs font-medium text-white/30 text-center py-4 italic">No activity yet</p>
                  ) : (
                    <div className="space-y-1">
                      {receivedOffers.slice(0, 5).map((o) => (
                        <div key={o.id} className="group flex items-center justify-between py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition-colors">
                          <div className="min-w-0 pr-4">
                            <p className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition-colors uppercase tracking-tight">{o.property_title}</p>
                            <p className="text-[11px] font-black text-white/50 flex items-center gap-1 mt-1 font-mono">
                               ₹{Number(o.offer_price).toLocaleString("en-IN")}
                            </p>
                          </div>
                          <OfferStatusBadge status={o.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* My Sent Offers */}
                <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      <BarChart3 size={18} className="text-blue-400" /> Sent Offers
                    </h3>
                    {sentOffers.length > 5 && (
                      <Link href="/dashboard/my-offers" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors">
                        View More
                      </Link>
                    )}
                  </div>
                  {sentOffers.length === 0 ? (
                    <p className="text-xs font-medium text-white/30 text-center py-4 italic">No sent offers yet</p>
                  ) : (
                    <div className="space-y-1">
                      {sentOffers.slice(0, 5).map((o) => (
                        <div key={o.id} className="group flex items-center justify-between py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition-colors">
                          <div className="min-w-0 pr-4">
                            <p className="text-xs font-black text-white flex items-center gap-1 font-mono group-hover:text-indigo-300 transition-colors">
                               ₹{Number(o.offer_price).toLocaleString("en-IN")}
                            </p>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">
                              {new Date(o.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <OfferStatusBadge status={o.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-8 shadow-xl">
                <h3 className="text-base font-bold text-white tracking-tight mb-6 flex items-center gap-2">
                   <Users size={18} className="text-indigo-400" /> Management
                </h3>
                <div className="space-y-2">
                  <QuickLink href="/properties" icon={<Eye size={16} />} label="Browse Catalog" />
                  <QuickLink href="/search" icon={<Search size={16} />} label="Dynamic Search" />
                  <QuickLink href="/properties/new" icon={<Plus size={16} />} label="Add New Asset" />
                  <QuickLink href="/agents" icon={<Users size={16} />} label="Chat with Agents" />
                </div>
              </div>

            </FadeIn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: "indigo" | "emerald" | "amber" | "blue";
}) {
  const themes = {
    indigo: "from-indigo-500/20 to-indigo-600/5 text-indigo-400 border-indigo-500/20 shadow-indigo-100/6",
    emerald: "from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/20 shadow-emerald-200/6",
    amber: "from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/20 shadow-amber-100/6",
    blue: "from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/20 shadow-blue-100/6",
  };
  const theme = themes[color];

  return (
    <div className={`group bg-gradient-to-br ${theme} backdrop-blur-xl rounded-[2rem] border p-7 shadow-xl hover:-translate-y-1 transition-all duration-300`}>
      <div className={`w-12 h-12 rounded-[1.25rem] bg-white/10 flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
        {icon}
      </div>
      <div>
        <p className="text-3xl font-black text-white leading-none mb-2 tracking-tight group-hover:text-indigo-300 transition-colors font-mono">{value}</p>
        <p className="text-sm font-bold text-white/50 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xs font-semibold text-white/30 tracking-wide">{sub}</p>
      </div>
    </div>
  );
}

function OfferStatusBadge({ status }: { status: string }) {
  const config = {
    pending: { icon: <Clock size={11} />, cls: "bg-amber-500/20 text-amber-400 border-amber-500/20" },
    accepted: { icon: <CheckCircle2 size={11} />, cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" },
    rejected: { icon: <XCircle size={11} />, cls: "bg-red-500/20 text-red-400 border-red-500/20" },
  };
  const c = config[status as keyof typeof config] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border backdrop-blur-md ${c.cls}`}>
      {c.icon} {status}
    </span>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 text-sm font-bold text-white/50 hover:text-white hover:bg-white/5 rounded-2xl px-4 py-4 transition-all duration-300 border border-transparent hover:border-white/10"
    >
      <div className="p-2.5 rounded-xl bg-white/5 transition-colors group-hover:bg-white/10 border border-white/5">
        {icon}
      </div>
      <span className="tracking-tight">{label}</span>
      <ArrowRight size={14} className="ml-auto opacity-20 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
    </Link>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `${(n / 1_00_00_000).toFixed(2)}Cr`; // Sticking to Cr for large values in premium feel
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toLocaleString("en-IN");
}
