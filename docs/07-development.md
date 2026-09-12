# 07 — التطوير والجودة والنشر

## المتطلبات والأوامر

Node 24 (انظر `.nvmrc` و`engines`) — ثم:

```bash
npm install          # تثبيت صارم (بدون flags — كما يفعل Vercel)
npm run dev          # تطوير
npm run typecheck    # tsc --noEmit
npm run test         # vitest run
npm run lint         # eslint (يشمل حارس الأيقونات)
npm run build        # بناء الإنتاج
```

## بوابة الجودة (إلزامية قبل كل push)

`typecheck + test + build + lint` خضراء + (للمزايا المرئية) لقطة متصفح حقيقية. الـCI (`.github/workflows/ci.yml`) يشغّلها تلقائياً على كل push/PR.

## الاختبارات

- `engine.test.ts`: التسلسل، النقاط، نقاط الأمان، الترتيب، الجمهور، التحقق من الاستيراد.
- `match.test.ts`: المراحل، التأهل، مضاعفة السرعة، حساب الرهان، فارق الصدارة، تجاوز نقاط الأمان.
- `dataset.test.ts`: سلامة بنك الـ1530 (سكيما، فرادة، توازن المواضع، ≥80/فئة).
- `fx.test.ts`: تخطيط العد التنازلي وأنماط الاهتزاز.

## النشر (Vercel)

استيراد الريبو من اللوحة (Next.js يُكتشف تلقائياً، `engines.node = 24.x` يثبت النسخة) — بلا متغيرات بيئة. كل push يعيد النشر.

## أخطاء واجهتنا وحلولها (لا تعيدها)

1. **ERESOLVE على Vercel**: `vitest@5` يطلب `@types/node ^22` بينما المشروع كان `^20` — الحل: ترقية النوع لا `legacy-peer-deps`.
2. **`themeColor` في `metadata`**: تحذير Next 16 — يُنقل لتصدير `viewport`.
3. **`favicon.ico` تالف**: أعد توليده من PNG سليم (Pillow) بدل النسخ العشوائي.
4. **تعارض العمل المتوازي**: راجع `git status` قبل أي `add -A` — والتزم `git add <paths>` عند عمل أكثر من شخص على الشجرة.
