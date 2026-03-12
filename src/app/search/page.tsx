import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Search, MapPin, IndianRupee, ArrowLeft, BedDouble, Ruler, ChevronLeft, ChevronRight } from "lucide-react";
import type { Property } from "@/lib/schema/property.schema";

const ITEMS_PER_PAGE = 12;

const PROPERTY_TYPES = [
  { value: "", label: "All Types" },
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "independent_house", label: "House" },
  { value: "plot", label: "Plot" },
  { value: "commercial", label: "Commercial" },
];

interface Props {
  searchParams: Promise<{
    q?: string;
    type?: string;
    minPrice?: string;
    maxPrice?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q;
  const typeFilter = params.type ?? "";
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  let results: Property[] = [];
  let totalCount = 0;

  const hasFilters = !!(q?.trim() || typeFilter || minPrice || maxPrice);

  if (hasFilters) {
    let query = supabase
      .from("properties")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .eq("status", "active");

    // Text search — sanitize by escaping special chars
    if (q && q.trim()) {
      const safe = q.trim().replace(/[%_]/g, "");
      if (safe) {
        query = query.or(
          `title.ilike.%${safe}%,city.ilike.%${safe}%,state.ilike.%${safe}%,address.ilike.%${safe}%,property_type.ilike.%${safe}%`
        );
      }
    }

    if (typeFilter) query = query.eq("property_type", typeFilter);
    if (minPrice) query = query.gte("asking_price", minPrice);
    if (maxPrice) query = query.lte("asking_price", maxPrice);

    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error) {
      results = (data ?? []) as Property[];
      totalCount = count ?? 0;
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (typeFilter) p.set("type", typeFilter);
    if (minPrice) p.set("minPrice", String(minPrice));
    if (maxPrice) p.set("maxPrice", String(maxPrice));
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const qs = p.toString();
    return `/search${qs ? `?${qs}` : ""}`;
  }

  const typeEmoji: Record<string, string> = {
    apartment: "🏢",
    independent_house: "🏠",
    villa: "🏡",
    plot: "🌳",
    commercial: "🏪",
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Home
        </Link>

        {/* Search Form with Filters */}
        <form action="/search" method="GET" className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search by city, locality, project name, or property type..."
                className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
            >
              Search
            </button>
          </div>

          {/* Inline Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              name="type"
              defaultValue={typeFilter}
              className="bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              name="minPrice"
              type="number"
              defaultValue={minPrice ?? ""}
              placeholder="Min ₹"
              className="w-28 bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              name="maxPrice"
              type="number"
              defaultValue={maxPrice ?? ""}
              placeholder="Max ₹"
              className="w-28 bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            {hasFilters && (
              <Link
                href="/search"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </Link>
            )}
          </div>
        </form>

        {/* Results info */}
        {hasFilters && (
          <p className="text-sm text-muted-foreground">
            {totalCount} result{totalCount !== 1 && "s"}
            {q ? (
              <> for <span className="font-medium text-foreground">&quot;{q}&quot;</span></>
            ) : null}
          </p>
        )}

        {/* Results Grid */}
        {results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((p) => (
              <Link
                key={p.id}
                href={`/properties/${p.id}`}
                className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300"
              >
                {/* Cover */}
                <div className="h-36 bg-gradient-to-br from-primary/5 to-accent flex items-center justify-center">
                  <span className="text-4xl">{(p.property_type && typeEmoji[p.property_type]) ?? "🏠"}</span>
                </div>

                {/* Info */}
                <div className="p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin size={12} /> {p.city}, {p.state}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    <p className="text-sm font-bold text-foreground flex items-center gap-0.5">
                      <IndianRupee size={13} />
                      {p.asking_price
                        ? Number(p.asking_price).toLocaleString("en-IN")
                        : "—"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {p.area_sqft && (
                        <span className="flex items-center gap-0.5">
                          <Ruler size={11} /> {p.area_sqft}
                        </span>
                      )}
                      {p.bedrooms && (
                        <span className="flex items-center gap-0.5">
                          <BedDouble size={11} /> {p.bedrooms}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : q ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Search size={40} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No properties found matching your search.</p>
            <Link href="/properties" className="text-sm text-primary hover:underline">
              Browse all properties
            </Link>
          </div>
        ) : !hasFilters ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Search size={40} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Enter a search query or apply filters to find properties.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Search size={40} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No properties match these filters.</p>
            <Link href="/search" className="text-sm text-primary hover:underline">
              Clear filters
            </Link>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            {page > 1 ? (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft size={14} /> Prev
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-muted/50 border border-border rounded-lg cursor-not-allowed">
                <ChevronLeft size={14} /> Prev
              </span>
            )}

            <span className="text-sm text-muted-foreground px-2">
              Page {page} of {totalPages}
            </span>

            {page < totalPages ? (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Next <ChevronRight size={14} />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-muted/50 border border-border rounded-lg cursor-not-allowed">
                Next <ChevronRight size={14} />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
