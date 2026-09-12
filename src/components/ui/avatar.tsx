import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Professional illustrated avatars (Notionists Neutral style, CC0 1.0 public domain
// via DiceBear — files vendored in public/avatars so the game works offline).
// Ids are stable: existing rooms/players keep working unchanged.
const AVATARS = [
  { id: "falcon", file: "/avatars/avatar-01.png", label: "صقر" },
  { id: "lion", file: "/avatars/avatar-02.png", label: "أسد" },
  { id: "star", file: "/avatars/avatar-03.png", label: "نجمة" },
  { id: "wave", file: "/avatars/avatar-04.png", label: "موجة" },
  { id: "palm", file: "/avatars/avatar-05.png", label: "نخلة" },
  { id: "atom", file: "/avatars/avatar-06.png", label: "ذرّة" },
  { id: "crown", file: "/avatars/avatar-07.png", label: "تاج" },
  { id: "moon", file: "/avatars/avatar-08.png", label: "قمر" },
  { id: "sun", file: "/avatars/avatar-09.png", label: "شمس" },
  { id: "gem", file: "/avatars/avatar-10.png", label: "جوهرة" },
  { id: "owl", file: "/avatars/avatar-11.png", label: "بومة" },
  { id: "compass", file: "/avatars/avatar-12.png", label: "بوصلة" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];
export { AVATARS };

export function avatarFile(id?: string): string {
  return AVATARS.find((a) => a.id === id)?.file ?? AVATARS[0].file;
}

export function Avatar({
  name,
  avatarId,
  size = 44,
  className,
}: {
  name: string;
  avatarId?: string;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = React.useState(false);
  const file = avatarFile(avatarId);
  if (broken) {
    // Offline-safe fallback: initial letter on gradient.
    return (
      <span
        aria-hidden
        className={cn("inline-flex shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)] font-bold text-white", className)}
        style={{ width: size, height: size, fontSize: size * 0.42 }}
      >
        {(name.trim().charAt(0) || "؟").toUpperCase()}
      </span>
    );
  }
  return (
    <Image
      src={file}
      alt=""
      width={size}
      height={size}
      onError={() => setBroken(true)}
      className={cn("shrink-0 rounded-2xl border border-[var(--border)] object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
