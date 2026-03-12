"use client";

import { useActionState, useState } from "react";
import { updateProfile } from "@/actions/profile/profile";
import type { Profile } from "@/lib/schema/profile.schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Edit3, X, Check, Loader2 } from "lucide-react";

type ActionState = { error: string } | { success: true } | null;

function EditProfileAction(_prev: ActionState, formData: FormData) {
  return updateProfile(formData) as Promise<ActionState>;
}

export function EditProfileForm({ profile }: { profile: Profile }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(EditProfileAction, null);

  // Close the form on a successful save
  const wasSuccess = state !== null && "success" in state;
  if (wasSuccess && editing) setEditing(false);

  return editing ? (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            name="full_name"
            defaultValue={profile.full_name ?? ""}
            required
            placeholder="Your name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={profile.phone ?? ""}
            placeholder="+91 98765 43210"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="organization">Organization</Label>
          <Input
            id="organization"
            name="organization"
            defaultValue={profile.organization ?? ""}
            placeholder="Company / firm"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            name="bio"
            defaultValue={profile.bio ?? ""}
            rows={3}
            maxLength={500}
            placeholder="A short bio…"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {state && "error" in state && (
        <p className="text-sm text-red-500">{state.error}</p>
      )}

      <div className="flex items-center gap-2 justify-end">
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
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors bg-white"
    >
      <Edit3 size={14} />
      Edit Profile
    </button>
  );
}
