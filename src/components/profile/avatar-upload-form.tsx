"use client";

import { useRef, useTransition, useState } from "react";
import { uploadAvatar, deleteAvatar } from "@/actions/profile/profile";
import { Loader2, Camera, Trash2 } from "lucide-react";

interface AvatarUploadFormProps {
  avatarUrl: string | null;
  initials: string;
}

export function AvatarUploadForm({ avatarUrl, initials }: AvatarUploadFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side size check (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Avatar must be under 5 MB");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setError("Only JPEG, PNG, WebP, or GIF images are allowed");
      return;
    }
    setError(null);

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    const formData = new FormData();
    formData.append("avatar", file);

    startTransition(async () => {
      const result = await uploadAvatar(formData);
      if ("error" in result) {
        setError(result.error);
        setPreview(avatarUrl); // revert on failure
      } else {
        setPreview(result.avatarUrl);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAvatar();
      if ("error" in result) {
        setError(result.error);
      } else {
        setPreview(null);
      }
    });
  }

  return (
    <div className="relative group">
      {/* Avatar circle */}
      <div className="w-24 h-24 rounded-full border-4 border-white shadow overflow-hidden bg-blue-100 flex items-center justify-center">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl font-bold text-blue-600">{initials}</span>
        )}

        {/* Loading overlay */}
        {isPending && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <Loader2 size={20} className="text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Upload button — shown on hover when not pending */}
      {!isPending && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow transition-colors"
          title="Upload new avatar"
        >
          <Camera size={14} />
        </button>
      )}

      {/* Delete button — shown on hover when avatar exists */}
      {preview && !isPending && (
        <button
          type="button"
          onClick={handleDelete}
          className="absolute top-0 right-0 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow transition-colors opacity-0 group-hover:opacity-100"
          title="Remove avatar"
        >
          <Trash2 size={11} />
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && (
        <p className="absolute -bottom-6 left-0 text-xs text-red-500 whitespace-nowrap">
          {error}
        </p>
      )}
    </div>
  );
}
