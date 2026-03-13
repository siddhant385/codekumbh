import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  IndianRupee,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  LayoutGrid,
  Map,
  Sparkles,
  ArrowRight,
  Building2,
  Calendar,
  Layers,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PropertyMap } from "@/components/properties/property-map";
import type { Property } from "@/lib/schema/property.schema";
import { FadeIn } from "@/components/fade-in";

const ITEMS_PER_PAGE = 12;

const PROPERTY_TYPES = [
  { value: "", label: "All Assets" },
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "independent_house", label: "House" },
  { value: "plot", label: "Plot" },
  { value: "commercial", label: "Commercial" },
];

const TYPE_EMOJI: Record<string, string> = {
  apartment: "🏢",
  villa: "🏡",
  independent_house: "🏠",
  plot: "🌳",
  commercial: "🏪",
};

interface Props {
  searchParams: Promise<{
    page?: string;
    type?: string;
    minPrice?: string;
    maxPrice?: string;
    city?: string;
    view?: string;
  }>;
}

export default async function PropertiesPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Onboarding check
  const { data: profileCheck } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();
  if (!profileCheck?.onboarding_completed) redirect("/onboarding");

  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const typeFilter = params.type ?? "";
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  const cityFilter = params.city ?? "";
  const viewMode = params.view === "map" ? "map" : "list";

  let query = supabase
    .from("properties")
    .select("*, property_images(image_url, is_cover)", { count: "exact" })
    .eq("is_active", true)
    .eq("status", "active");

  if (typeFilter) query = query.eq("property_type", typeFilter);
  if (minPrice) query = query.gte("asking_price", minPrice);
  if (maxPrice) query = query.lte("asking_price", maxPrice);
  if (cityFilter) query = query.ilike("city", `%${cityFilter}%`);

  const from = (page - 1) * ITEMS_PER_PAGE;

  /* List view: paginated. Map view: all (up to 200) */
  const { data: properties, count } = viewMode === "map"
    ? await query.order("created_at", { ascending: false }).limit(200)
    : await query.order("created_at", { ascending: false }).range(from, from + ITEMS_PER_PAGE - 1);

  const items = (properties ?? []) as (Property & { property_images: { image_url: string; is_cover: boolean }[] })[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const hasFilters = !!(typeFilter || cityFilter || minPrice || maxPrice);

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (typeFilter) p.set("type", typeFilter);
    if (minPrice) p.set("minPrice", String(minPrice));
    if (maxPrice) p.set("maxPrice", String(maxPrice));
    if (cityFilter) p.set("city", cityFilter);
    if (viewMode === "map") p.set("view", "map");
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const qs = p.toString();
    return `/properties${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="relative flex flex-col min-h-screen selection:bg-indigo-500/30">
      
      {/* ── Fixed Background ── */}
      <div 
        className="fixed inset-0 z-[-1] bg-[url('https://images.unsplash.com/photo-1723796994732-b375f31ef231?w=1600&auto=format&fit=crop&q=80')] bg-cover bg-center bg-no-repeat"
      >
        <div className="absolute inset-0 bg-black/85 backdrop-blur-[6px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/95" />
      </div>

      <div className="flex-grow w-full pb-20 pt-24 sm:pt-28 z-10">
        
        {/* Page header */}
        <FadeIn className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest mb-3">
                <Layers size={14} /> Property Discovery
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                Explore <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">Elite</span> Spaces
              </h1>
              <p className="text-white/40 mt-2 text-sm md:text-base font-medium">
                Browsing {totalCount.toLocaleString()} curated listings tailored for your lifestyle.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              {/* View Toggle */}
              <div className="flex items-center bg-white/5 backdrop-blur-md rounded-full p-1 border border-white/10 shadow-xl overflow-hidden">
                <Link
                  href={buildUrl({ view: "", page: "1" })}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                    viewMode === "list"
                      ? "bg-white text-black shadow-lg"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  <LayoutGrid size={14} /> List
                </Link>
                <Link
                  href={buildUrl({ view: "map", page: "1" })}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                    viewMode === "map"
                      ? "bg-white text-black shadow-lg"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  <Map size={14} /> Map
                </Link>
              </div>
              <Button asChild size="lg" className="bg-white text-black hover:bg-slate-200 rounded-full font-bold px-8 transition-transform hover:scale-105 active:scale-95 shadow-2xl border-0">
                <Link href="/properties/new">
                  <Plus size={18} className="mr-2" /> List Property
                </Link>
              </Button>
            </div>
          </div>
        </FadeIn>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Filters & Chips Section */}
          <FadeIn delay={0.1} className="space-y-8">
            <div className="flex items-center gap-3 flex-wrap px-2">
               <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mr-2">
                <Filter size={12} /> Filter by
              </div>
              {PROPERTY_TYPES.map((t) => (
                <Link
                  key={t.value}
                  href={buildUrl({ type: t.value, page: "1" })}
                  className={`px-6 py-2.5 rounded-full text-[10px] font-black border transition-all duration-500 uppercase tracking-widest ${
                    typeFilter === t.value
                      ? "bg-indigo-500 text-white border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                      : "bg-white/5 text-white/40 border-white/10 hover:border-white/30 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </div>

            {/* Main Filter Bar */}
            <form action="/properties" method="GET" className="px-2">
              <input type="hidden" name="type" value={typeFilter} />
              {viewMode === "map" && <input type="hidden" name="view" value="map" />}
              <div className="group flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-4 lg:p-2.5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] transition-all duration-500 hover:border-indigo-500/30">
                <div className="flex items-center flex-1 gap-4 px-6 py-3 lg:py-0 border-b lg:border-b-0 lg:border-r border-white/5">
                  <Search size={20} className="text-indigo-400 shrink-0" />
                  <input
                    name="city"
                    defaultValue={cityFilter}
                    placeholder="Where are you looking?"
                    className="flex-1 bg-transparent text-sm font-bold text-white placeholder:text-white/20 outline-none"
                  />
                </div>
                
                <div className="flex items-center gap-4 px-6 lg:px-6 py-3 lg:py-0">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Min Price</span>
                      <div className="flex items-center gap-1.5 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                        <IndianRupee size={12} className="text-white/40" />
                        <input
                          name="minPrice"
                          type="number"
                          defaultValue={minPrice ?? ""}
                          placeholder="0"
                          className="w-16 bg-transparent text-sm font-black text-white placeholder:text-white/10 outline-none font-mono"
                        />
                      </div>
                    </div>
                    <div className="h-px w-4 bg-white/10 self-end mb-4 mx-1" />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Max Price</span>
                      <div className="flex items-center gap-1.5 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                        <IndianRupee size={12} className="text-white/40" />
                        <input
                          name="maxPrice"
                          type="number"
                          defaultValue={maxPrice ?? ""}
                          placeholder="99L"
                          className="w-16 bg-transparent text-sm font-black text-white placeholder:text-white/10 outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:ml-auto flex items-center gap-4">
                   {hasFilters && (
                    <Link href={viewMode === "map" ? "/properties?view=map" : "/properties"} className="text-[10px] font-black text-white/20 hover:text-red-400 uppercase tracking-[0.2em] transition-colors ml-4 mr-2">
                      Reset
                    </Link>
                  )}
                  <button
                    type="submit"
                    className="flex-1 lg:flex-none px-12 py-4 bg-indigo-600 text-white text-[11px] font-black rounded-full hover:bg-indigo-500 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_20px_rgba(79,70,229,0.3)] uppercase tracking-widest"
                  >
                    Search Listings
                  </button>
                </div>
              </div>
            </form>
          </FadeIn>

          {/* Grid / Map Display */}
          <FadeIn delay={0.2} className="px-2">
            {viewMode === "map" ? (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] p-3 overflow-hidden shadow-2xl h-[650px]">
                <PropertyMap properties={items} />
              </div>
            ) : items.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-2xl rounded-[3.5rem] border border-white/10 p-24 text-center shadow-xl">
                <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-8 text-5xl shadow-inner animate-pulse">
                  🏜️
                </div>
                <h2 className="text-3xl font-black text-white mb-3 tracking-tight">No results matched</h2>
                <p className="text-white/40 mb-12 max-w-sm mx-auto font-medium text-sm leading-relaxed">
                  We couldn&apos;t find any assets that meet your criteria. Try widening your filters or clearing them to explore all listings.
                </p>
                <div className="flex gap-4 justify-center items-center">
                  {hasFilters && (
                    <Button variant="ghost" className="text-white/40 hover:text-white hover:bg-white/5 rounded-full px-10 font-bold" asChild>
                      <Link href="/properties">Reset Filters</Link>
                    </Button>
                  )}
                  <Button asChild size="lg" className="bg-white text-black hover:bg-slate-200 rounded-full font-bold px-12 shadow-2xl border-0 transition-transform hover:scale-105">
                    <Link href="/properties/new">
                      <Plus size={18} className="mr-2" /> Post a Listing
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                {items.map((p, idx) => (
                  <FadeIn key={p.id} delay={0.2 + idx * 0.05} className="h-full">
                    <PropertyCard property={p} />
                  </FadeIn>
                ))}
              </div>
            )}
          </FadeIn>

          {/* Pagination */}
          {viewMode === "list" && totalPages > 1 && (
            <FadeIn delay={0.4} className="flex items-center justify-center gap-4 pt-16">
              {page > 1 ? (
                <Link href={buildUrl({ page: String(page - 1) })} className="w-14 h-14 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all active:scale-90 shadow-lg">
                  <ChevronLeft size={24} />
                </Link>
              ) : (
                <span className="w-14 h-14 flex items-center justify-center rounded-full bg-white/[0.02] border border-white/5 text-white/10 cursor-not-allowed">
                  <ChevronLeft size={24} />
                </span>
              )}
              
              <div className="flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full shadow-inner">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                  return (
                    <Link
                      key={pageNum}
                      href={buildUrl({ page: String(pageNum) })}
                      className={`w-10 h-10 flex items-center justify-center text-xs font-black rounded-full transition-all duration-500 ${
                        pageNum === page 
                          ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                          : "text-white/40 hover:text-white hover:bg-white/[0.05]"
                      }`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}
              </div>
 
              {page < totalPages ? (
                <Link href={buildUrl({ page: String(page + 1) })} className="w-14 h-14 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all active:scale-90 shadow-lg">
                  <ChevronRight size={24} />
                </Link>
              ) : (
                <span className="w-14 h-14 flex items-center justify-center rounded-full bg-white/[0.02] border border-white/5 text-white/10 cursor-not-allowed">
                  <ChevronRight size={24} />
                </span>
              )}
            </FadeIn>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Property Card ────────────────────────────────────────────────────────── */

interface PropertyWithImages extends Property {
  property_images: { image_url: string; is_cover: boolean }[];
}

function PropertyCard({ property: p }: { property: PropertyWithImages }) {
  const coverImage = p.property_images?.find(img => img.is_cover)?.image_url 
    || p.property_images?.[0]?.image_url;

  // Modern abstract placeholders if no image exists
  const placeholder = `https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80`;

  return (
    <Link href={`/properties/${p.id}`} className="group block h-full">
      <div className="relative h-full flex flex-col bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl hover:border-indigo-500/50 hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-2">
        {/* Visual Header */}
        <div className="relative h-64 overflow-hidden border-b border-white/5">
          {coverImage ? (
            <img 
              src={coverImage} 
              alt={p.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
             <div className="w-full h-full bg-slate-800 flex items-center justify-center relative overflow-hidden">
                <img 
                  src={placeholder} 
                  alt="placeholder"
                  className="w-full h-full object-cover opacity-40 grayscale"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                <span className="absolute text-white/20 font-black text-6xl select-none group-hover:scale-125 transition-transform duration-1000">
                  {TYPE_EMOJI[p.property_type ?? ""] ?? "🏠"}
                </span>
             </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
          
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <Badge className="bg-indigo-500 text-white border-0 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
              {p.property_type?.replace("_", " ") ?? "Property"}
            </Badge>
          </div>

          <div className="absolute top-4 right-4">
            <span className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Verified
            </span>
          </div>

          <div className="absolute bottom-4 left-6">
            <p className="text-2xl font-black text-white font-mono drop-shadow-lg">
               {p.asking_price ? formatPrice(Number(p.asking_price)) : "N/A"}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 flex flex-col gap-6">
          <div className="space-y-1.5">
             <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1 tracking-tight">
              {p.title}
            </h3>
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-white/40 uppercase tracking-widest">
              <MapPin size={12} className="text-indigo-500" />
              {p.city}
            </p>
          </div>

          {/* Specs Bar */}
          <div className="flex items-center justify-between border-t border-white/5 pt-6">
            <div className="flex items-center gap-4">
                {p.bedrooms != null && (
                  <div className="flex items-center gap-1.5">
                    <BedDouble size={14} className="text-white/30" />
                    <span className="text-[10px] font-black text-white/60">{p.bedrooms} BHK</span>
                  </div>
                )}
                {p.area_sqft != null && (
                  <div className="flex items-center gap-1.5">
                    <Ruler size={14} className="text-white/30" />
                    <span className="text-[10px] font-black text-white/60">{p.area_sqft} SQFT</span>
                  </div>
                )}
                {p.bathrooms != null && (
                   <div className="flex items-center gap-1.5">
                    <Bath size={14} className="text-white/30" />
                    <span className="text-[10px] font-black text-white/60">{p.bathrooms} BT</span>
                  </div>
                )}
            </div>
            
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white transition-all duration-300">
              <ArrowRight size={14} className="text-white group-hover:text-black" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function formatPrice(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`; // Consistently Cr for premium
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}
