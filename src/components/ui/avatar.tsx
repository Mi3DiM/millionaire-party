import * as React from "react";
import { cn } from "@/lib/utils";

const AVATARS = [
  { id: "falcon", glyph: "ص", label: "صقر" },
  { id: "lion", glyph: "أ", label: "أسد" },
  { id: "star", glyph: "ن", label: "نجمة" },
  { id: "wave", glyph: "م", label: "موجة" },
  { id: "palm", glyph: "خ", label: "نخلة" },
  { id: "atom", glyph: "ذ", label: "ذرّة" },
  { id: "crown", glyph: "ت", label: "تاج" },
  { id: "moon", glyph: "ق", label: "قمر" },
  { id: "sun", glyph: "ش", label: "شمس" },
  { id: "gem", glyph: "ج", label: "جوهرة" },
  { id: "owl", glyph: "ب", label: "بومة" },
  { id: "compass", glyph: "ك", label: "بوصلة" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];
export { AVATARS };

const HUES = [222, 265, 38, 150, 190, 330, 20, 250];

export function avatarHue(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return HUES[h % HUES.length];
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
  const glyph =
    AVATARS.find((a) => a.id === avatarId)?.glyph ?? name.trim().charAt(0).toUpperCase() ?? "؟";
  const hue = avatarHue(name + (avatarId ?? ""));
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-2xl font-bold text-white", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, hsl(${hue} 55% 45%), hsl(${(hue + 40) % 360} 60% 35%))`,
      }}
    >
      {glyph}
    </span>
  );
}
