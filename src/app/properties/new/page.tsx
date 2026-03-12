import { CreatePropertyForm } from "@/components/property/create-property-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NewPropertyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          List Your Property
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Fill in the details to list your property on CodeHunt
        </p>
        <CreatePropertyForm />
      </div>
    </div>
  );
}
