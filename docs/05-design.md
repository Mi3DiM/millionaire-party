# 05 — التصميم والهوية

## المبادئ

هوية أصلية فاخرة: طباعة قوية، مساحات سخية، أسطح مستديرة، ظلال خفيفة، توهج مضبوط — بلا نيون طفولي ولا قالب shadcn افتراضي. عربي RTL أولاً (IBM Plex Sans Arabic) + إنجليزي LTR بمفتاح تبديل.

## التوكنز (`src/app/globals.css`)

`--background/--surface/--elevated/--primary/--accent/--accent-ink/--success/--warning/--danger/--muted/--border/--ring` مع `.dark`. قاعدة صارمة: **صفر ألوان ثابتة في الواجهة** — كل الشاشات (اللعب، النتائج، الاستراحة، الرئيسية) تتبع الثيم المختار، والنص الذهبي يستخدم `accent-ink` المقروء على الفاتح (تباين AA).

## الأيقونات: Solar BoldDuotone حصرياً

مكوّن مركزي واحد `GameIcon` (`src/components/ui/GameIcon.tsx`) — عائلة واحدة في كل التطبيق (تاج، كأس، صاعقة، درع، ساعة…). حارس ESLint (`no-restricted-syntax` في `eslint.config.mjs`) يرفض أي إيموجي/رمز نصي كأيقونة.

## الصور الرمزية: 36 PNG (لا SVG)

وجوه توضيحية CC0 (Notionists/Lorelei/Open Peeps) — نساء ومحجبات وأطفال وكبار وملتحون — ملفات PNG في `public/avatars/` لتعمل اللعبة **دون إنترنت**. المعرفات مستقرة (الغرف القديمة لا تنكسر)، والمنتقي يعرضها بالتمرير، مع fallback حرف عند الفشل. إعادة التوليد: `node scripts/generate-avatars.mjs`.

## الشعار والـ favicon

علامة أصلية (تاج ذهبي على كحلي): `src/app/icon.svg` + `favicon.ico` + `apple-icon.png` + صور OG و`manifest.webmanifest` + `theme-color` في تصدير `viewport` (وليس `metadata` — تحذير Next 16).

## إمكانية الوصول

تنقل لوحة مفاتيح، focus ظاهر، ARIA، أهداف لمس كبيرة، reduced-motion + **الوضع الهادئ**، ولا معلومة باللون وحده (أيقونة+نص دائماً مع الحالة).
