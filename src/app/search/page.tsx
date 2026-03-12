import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Search, MapPin, IndianRupee, ArrowLeft, BedDouble, Ruler } from "lucide-react";
import type { Property } from "@/lib/schema/property.schema";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  let results: Property[] = [];

  if (q && q.trim()) {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("is_active", true)
      .eq("status", "active")
      .or(
        `title.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%,address.ilike.%${q}%,property_type.ilike.%${q}%`
      )
      .order("created_at", { ascending: false })
      .limit(30);

    if (!error) results = (data ?? []) as Property[];
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

        {/* Search Form */}
        <form action="/search" method="GET" className="flex gap-2">
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
        </form>

        {/* Results info */}
        {q && (
          <p className="text-sm text-muted-foreground">
            {results.length} result{results.length !== 1 && "s"} for{" "}
            <span className="font-medium text-foreground">&quot;{q}&quot;</span>
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
        ) : (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Search size={40} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Enter a search query to find properties.</p>
          </div>
        )}
      </div>
    </div>
  );
}
