"use client";

import { Header, Footer, PageContainer } from "@/components/app/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STEPS = [
  { t: "أنشئ غرفة أو انضم برمز", d: "المضيف يضبط الفئات والصعوبة والمؤقت ووسائل المساعدة ويختار بنك الأسئلة. اللاعبون يدخلون بالاسم فقط — بدون حساب." },
  { t: "استعدوا في الردهة", d: "شاهد رمز الغرفة وشاركه (نسخ / رابط / QR). اضغط «مستعد» وانتظر بدء المضيف." },
  { t: "أجيبوا على نفس السؤال", d: "الجميع يستقبل نفس السؤال والخيارات الأربعة تحت نفس المؤقت. إجابتك مستقلة ولا تُكشف قبل الكشف." },
  { t: "الكشف المتزامن", d: "عند إجابة الجميع أو انتهاء المؤقت تُكشف الإجابة الصحيحة مع الشرح، ثم يتحدث الرصيد والترتيب." },
  { t: "اصعد سلّم الجوائز", d: "كل إجابة صحيحة تصعد بك مستوى. نقاط الأمان تحفظ رصيدك عند التعثر (شارة الدرع في السلّم). السرعة والدقة تحسمان الصدارة." },
  { t: "استخدم وسائل المساعدة", d: "50/50 لإزالة خيارين، الجمهور لرؤية النسب، +15 ثانية لوقت إضافي. لكل وسيلة استخدام واحد." },
];

export default function HowToPlayPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <PageContainer>
        <h1 className="text-2xl font-black">كيف تلعب؟</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">ست دقائق وتفهم كل شيء.</p>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {STEPS.map((s, i) => (
            <Card key={s.t}>
              <CardHeader><CardTitle className="text-[15px]">{i + 1}. {s.t}</CardTitle></CardHeader>
              <CardContent><p className="text-[14px] leading-[1.9] text-[var(--muted)]">{s.d}</p></CardContent>
            </Card>
          ))}
        </div>
      </PageContainer>
      <Footer />
    </div>
  );
}
