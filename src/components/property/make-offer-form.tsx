"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, IndianRupee } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { makeOffer } from "@/actions/property/property";
import { useRouter } from "next/navigation";

export function MakeOfferForm({ propertyId, askingPrice }: { propertyId: string; askingPrice: number | null }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("property_id", propertyId);

    const result = await makeOffer(fd);
    setLoading(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Offer submitted successfully!");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="offer_price" className="flex items-center gap-1.5">
          <IndianRupee size={14} className="text-muted-foreground" />
          Your Offer (₹)
        </Label>
        <Input
          id="offer_price"
          name="offer_price"
          type="number"
          placeholder={askingPrice ? `Asking: ₹${Number(askingPrice).toLocaleString("en-IN")}` : "Enter amount"}
          required
          min={1}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <Loader2 size={16} className="animate-spin mr-2" />
        ) : (
          <IndianRupee size={16} className="mr-2" />
        )}
        Submit Offer
      </Button>
    </form>
  );
}
