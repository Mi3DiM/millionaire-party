import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Professional illustrated avatars (Notionists Neutral + Notionists by Zoish,
// Lorelei by Lisa Wischofsky, Open Peeps by Pablo Stanley — all CC0 1.0 public domain
// via DiceBear — files vendored in public/avatars so the game works offline).
// Ids are stable: existing rooms/players keep working unchanged (avatar-01..12 untouched).
// New set (avatar-13..36) adds women (incl. hijabi), girls, boys, elders
// and bearded men in the same hand-drawn ink + pastel identity.
// Regenerate with `node scripts/generate-avatars.mjs`.
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
  { id: "woman-sara", file: "/avatars/avatar-13.png", label: "سارة" },
  { id: "woman-layla", file: "/avatars/avatar-14.png", label: "ليلى" },
  { id: "woman-nour", file: "/avatars/avatar-15.png", label: "نور" },
  { id: "woman-fatima", file: "/avatars/avatar-16.png", label: "فاطمة" },
  { id: "woman-mariam", file: "/avatars/avatar-17.png", label: "مريم" },
  { id: "girl-yasmin", file: "/avatars/avatar-18.png", label: "ياسمين" },
  { id: "woman-huda", file: "/avatars/avatar-19.png", label: "هدى" },
  { id: "woman-rania", file: "/avatars/avatar-20.png", label: "رانيا" },
  { id: "hijabi-1", file: "/avatars/avatar-21.png", label: "محجبة" },
  { id: "hijabi-2", file: "/avatars/avatar-22.png", label: "محجبة ٢" },
  { id: "girl-buns", file: "/avatars/avatar-23.png", label: "فتاة" },
  { id: "girl-lina", file: "/avatars/avatar-24.png", label: "لينا" },
  { id: "boy-karim", file: "/avatars/avatar-25.png", label: "كريم" },
  { id: "elder-salim", file: "/avatars/avatar-26.png", label: "مسنّ" },
  { id: "man-omar", file: "/avatars/avatar-27.png", label: "عمران" },
  { id: "boy-adam", file: "/avatars/avatar-28.png", label: "آدم" },
  { id: "girl-dina", file: "/avatars/avatar-29.png", label: "دينا" },
  { id: "youth-omar", file: "/avatars/avatar-30.png", label: "شاب" },
  { id: "elder-beard", file: "/avatars/avatar-31.png", label: "ملتحٍ" },
  { id: "man-youssef", file: "/avatars/avatar-32.png", label: "يوسف" },
  { id: "man-ilyas", file: "/avatars/avatar-33.png", label: "إلياس" },
  { id: "man-adel", file: "/avatars/avatar-34.png", label: "عادل" },
  { id: "man-salah", file: "/avatars/avatar-35.png", label: "صلاح" },
  { id: "man-bilal", file: "/avatars/avatar-36.png", label: "بلال" },
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
