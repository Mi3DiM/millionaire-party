<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Millionaire Party

## Stack
Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 (CSS-first `@theme`) · Zustand · framer-motion · Trystero P2P · zod/react-hook-form · xlsx/papaparse · qrcode.react

## Docs (Arabic-first)
- Start: `README.md` → `docs/01-overview.md`. Gameplay: `docs/02-gameplay.md`. Banks: `docs/03-questions.md`.
- Net: `docs/04-multiplayer.md`. Design: `docs/05-design.md`. Audio/FX: `docs/06-audio-fx.md`. Dev/QA/deploy: `docs/07-development.md`.
- History: `CHANGELOG.md`. Contribute: `CONTRIBUTING.md`. Never `git add -A` on a shared tree — stage explicit paths.

## Commands
- `npm run dev` / `npm run build` / `npm run typecheck` / `npm run test` / `npm run lint`
- Never commit unless `typecheck + test + build` are green.

## Architecture rules
- **Host-authoritative**: question order, `questionEndsAt`, correct answers, scoring live in the host path (`src/lib/game/store.ts` + `engine.ts`). Never trust client clocks/scores. Never send `correctAnswer` pre-reveal to guests (P2P snapshot excludes it).
- **Transports**: `src/lib/net/p2p.tsx` (Trystero) + local bots in store. New backends = new adapter only.
- **Sequence lock**: once `startGame()` runs, changing bank must NOT affect the running game.
- **RTL-first**: default `lang="ar" dir="rtl"`, IBM Plex Sans Arabic. Use logical properties (`ms-/me-/start-/end-`); mirror only directional icons. Test EN/LTR toggle.
- **Design**: tokens in `src/app/globals.css` (`--background/--surface/--primary/--accent/--accent-ink/…` + `.dark`; every screen follows the chosen theme — no forced-dark overrides). shadcn-style primitives in `src/components/ui/` wrapped per-product. No default-demo look, no emojis as icons, no neon/childish aesthetics.
- **Icons**: Solar BoldDuotone ONLY via `GameIcon` (`src/components/ui/GameIcon.tsx`); eslint `no-restricted-syntax` guard rejects emoji/glyph icons.
- **Avatars**: 36 PNGs in `public/avatars/` (CC0), ids in `AVATARS` (`avatar.tsx`); regenerate via `scripts/generate-avatars.mjs`. No SVG avatars.
- **Status bar**: `MatchStatusBar` (balance faces stage); wager picker lives inside it — no separate card.
- **FX**: WebAudio `src/lib/fx/audio.ts` (layered, dramatic/calm via `millionaire:intensity`) + `haptics.ts`; countdown/motion respect reduced-motion + calm mode.
- **Questions**: schema `{question, answers[4], correctAnswer 0..3, category, difficulty, explanation?}`. Keep quality bar: one clearly-correct answer, plausible distractors, balanced positions, no celebrity trivia. Validate imports via `src/lib/bank/validate.ts`.
- **Dataset**: 1530 questions / 19 files (`src/data/questions/`), guarded by `dataset.test.ts` (schema, uniqueness, ≥80/category, position balance, no `arab`). Sensitive facts: wilayas = 69 (Law 26-06, 2026); category is `middle-east` (never ethnic framing).
- **Files**: game UI → `src/components/game/`; room → `src/components/room/`; routes → `src/app/`.
