// Generates the 24 diverse CC0 avatars (avatar-13..avatar-36) via the DiceBear HTTP API
// and vendors them into public/avatars so the game keeps working offline.
//
// Styles used (all CC0 1.0, same hand-drawn ink + pastel identity as the existing set):
// - lorelei      (Lisa Wischofsky, CC0): detailed hair + earrings -> women/girls
// - open-peeps   (Pablo Stanley, CC0): explicit hijab/turban/long/buns/short/gray heads -> hijabi women, children, elders
// - notionists   (Zoish, CC0): half-body characters -> youth/men/elders
//
// Re-run: `node scripts/generate-avatars.mjs` (requires network; output is deterministic per seed+options).
// Existing avatar-01..12 are never touched: avatar ids stay stable for old rooms.

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "avatars");
await mkdir(outDir, { recursive: true });

/** @type {{ file: string; style: string; seed: string; params: Record<string, string | number> }[]} */
const AVATARS = [
  // ---- Lorelei women & girls (8): no beards, earrings on most ----
  { file: "avatar-13.png", style: "lorelei", seed: "Sara", params: { beardProbability: 0, earringsProbability: 100, backgroundColor: "ffd5dc" } },
  { file: "avatar-14.png", style: "lorelei", seed: "Layla", params: { beardProbability: 0, earringsProbability: 100, backgroundColor: "d1d4f9" } },
  { file: "avatar-15.png", style: "lorelei", seed: "Nour", params: { beardProbability: 0, earringsProbability: 0, backgroundColor: "b6e3f4" } },
  { file: "avatar-16.png", style: "lorelei", seed: "Fatima", params: { beardProbability: 0, earringsProbability: 100, backgroundColor: "ffdfbf" } },
  { file: "avatar-17.png", style: "lorelei", seed: "Mariam", params: { beardProbability: 0, earringsProbability: 100, backgroundColor: "e5d4f9" } },
  { file: "avatar-18.png", style: "lorelei", seed: "Yasmin", params: { beardProbability: 0, earringsProbability: 0, backgroundColor: "f1f4dc" } },
  { file: "avatar-19.png", style: "lorelei", seed: "Huda", params: { beardProbability: 0, earringsProbability: 100, backgroundColor: "c0aede" } },
  { file: "avatar-20.png", style: "lorelei", seed: "Rania", params: { beardProbability: 0, earringsProbability: 100, backgroundColor: "ffd8b1" } },
  // ---- Open Peeps: hijabi women, children, elders (7) ----
  { file: "avatar-21.png", style: "open-peeps", seed: "Hijabi-Sara", params: { headVariant: "hijab", facialHairProbability: 0, maskProbability: 0, accessoriesProbability: 0, backgroundColor: "ffd5dc" } },
  { file: "avatar-22.png", style: "open-peeps", seed: "Hijabi-Nour", params: { headVariant: "hijab", facialHairProbability: 0, maskProbability: 0, accessoriesProbability: 0, backgroundColor: "d1d4f9" } },
  { file: "avatar-23.png", style: "open-peeps", seed: "Buns-Dina", params: { headVariant: "buns", facialHairProbability: 0, maskProbability: 0, accessoriesProbability: 0, backgroundColor: "b6e3f4" } },
  { file: "avatar-24.png", style: "open-peeps", seed: "Long-Lina", params: { headVariant: "long", facialHairProbability: 0, maskProbability: 0, accessoriesProbability: 0, backgroundColor: "ffdfbf" } },
  { file: "avatar-25.png", style: "open-peeps", seed: "Short-Karim", params: { headVariant: "short3", facialHairProbability: 0, maskProbability: 0, accessoriesProbability: 0, backgroundColor: "f1f4dc" } },
  { file: "avatar-26.png", style: "open-peeps", seed: "Gray-Salim", params: { headVariant: "grayShort", facialHairProbability: 0, maskProbability: 0, accessoriesProbability: 0, backgroundColor: "e5d4f9" } },
  { file: "avatar-27.png", style: "open-peeps", seed: "Turban-Omar", params: { headVariant: "turban", facialHairProbability: 0, maskProbability: 0, accessoriesProbability: 0, backgroundColor: "ffd8b1" } },
  // ---- Notionists youth/men/elders (5) ----
  { file: "avatar-28.png", style: "notionists", seed: "Adam-child", params: { beardProbability: 0, glassesProbability: 0, backgroundColor: "ffd5dc" } },
  { file: "avatar-29.png", style: "notionists", seed: "Dina-girl", params: { beardProbability: 0, glassesProbability: 0, backgroundColor: "d1d4f9" } },
  { file: "avatar-30.png", style: "notionists", seed: "Omar-youth", params: { beardProbability: 0, glassesProbability: 10, backgroundColor: "b6e3f4" } },
  { file: "avatar-31.png", style: "notionists", seed: "Salim-elder", params: { beardProbability: 100, glassesProbability: 30, backgroundColor: "ffdfbf" } },
  { file: "avatar-32.png", style: "notionists", seed: "Youssef-man", params: { beardProbability: 50, glassesProbability: 10, backgroundColor: "f1f4dc" } },
  { file: "avatar-33.png", style: "notionists", seed: "Ilyas-man", params: { beardProbability: 100, glassesProbability: 0, backgroundColor: "d1d4f9" } },
  { file: "avatar-34.png", style: "notionists", seed: "Adel-afro", params: { beardProbability: 100, glassesProbability: 0, backgroundColor: "b6e3f4" } },
  { file: "avatar-35.png", style: "notionists", seed: "Salah-man", params: { beardProbability: 100, glassesProbability: 0, backgroundColor: "ffdfbf" } },
  { file: "avatar-36.png", style: "notionists", seed: "Bilal-man", params: { beardProbability: 100, glassesProbability: 10, backgroundColor: "ffd5dc" } },
];

let failed = 0;
for (const a of AVATARS) {
  const q = new URLSearchParams({ seed: a.seed, size: "256", ...Object.fromEntries(Object.entries(a.params).map(([k, v]) => [k, String(v)])) });
  const url = `https://api.dicebear.com/10.x/${a.style}/png?${q.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) throw new Error(`suspiciously small file (${buf.length} bytes)`);
    await writeFile(join(outDir, a.file), buf);
    console.log(`ok ${a.file} (${a.style}/${a.seed}, ${buf.length} bytes)`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${a.file}: ${err.message}`);
  }
}
if (failed > 0) {
  console.error(`${failed} avatar(s) failed`);
  process.exit(1);
}
console.log("done: 24 avatars vendored");
