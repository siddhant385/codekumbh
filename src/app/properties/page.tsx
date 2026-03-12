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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Property } from "@/lib/schema/property.schema";

export default async function PropertiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("is_active", true)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const items = (properties ?? []) as Property[];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Properties</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Browse and discover investment opportunities
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/search">
                <Search size={16} className="mr-2" /> Search
              </Link>
            </Button>
            <Button asChild>
              <Link href="/properties/new">
                <Plus size={16} className="mr-2" /> List Property
              </Link>
            </Button>
          </div>
        </div>

        {/* Grid */}
        {items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search size={24} className="text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">No properties yet</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to list a property on CodeHunt
            </p>
            <Button asChild className="mt-4">
              <Link href="/properties/new">
                <Plus size={16} className="mr-2" /> List Your Property
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((p) => (
              <Link
                key={p.id}
                href={`/properties/${p.id}`}
                className="group block"
              >
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Placeholder cover */}
                  <div className="h-40 bg-gradient-to-br from-primary/10 to-accent flex items-center justify-center">
                    <span className="text-4xl">
                      {p.property_type === "apartment"
                        ? "🏢"
                        : p.property_type === "villa"
                        ? "🏡"
                        : p.property_type === "plot"
                        ? "🌳"
                        : p.property_type === "commercial"
                        ? "🏪"
                        : "🏠"}
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {p.title}
                    </h3>

                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin size={13} />
                      {p.city}, {p.state}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {p.bedrooms != null && (
                        <span className="flex items-center gap-1">
                          <BedDouble size={12} /> {p.bedrooms} BHK
                        </span>
                      )}
                      {p.bathrooms != null && (
                        <span className="flex items-center gap-1">
                          <Bath size={12} /> {p.bathrooms}
                        </span>
                      )}
                      {p.area_sqft != null && (
                        <span className="flex items-center gap-1">
                          <Ruler size={12} /> {p.area_sqft} sqft
                        </span>
                      )}
                    </div>

                    <p className="flex items-center gap-0.5 text-lg font-bold text-foreground">
                      <IndianRupee size={16} />
                      {p.asking_price
                        ? Number(p.asking_price).toLocaleString("en-IN")
                        : "—"}
                    </p>

                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
                      {p.property_type?.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
