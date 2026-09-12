"use client";

import { Header, Footer, PageContainer } from "@/components/app/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ALL_QUESTIONS, CATEGORIES } from "@/data/questions";

export default function CategoriesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <PageContainer>
        <h1 className="text-2xl font-black">الفئات</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{ALL_QUESTIONS.length} سؤالاً عبر {CATEGORIES.length} فئة — معرفة وفضول ومنطق، بلا أسئلة مشاهير.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => {
            const n = ALL_QUESTIONS.filter((q) => q.category === c.id).length;
            return (
              <Card key={c.id}>
                <CardHeader><CardTitle className="text-[15px]">{c.ar}</CardTitle>
                  <CardDescription>{c.en}</CardDescription></CardHeader>
                <CardContent><Badge>{n} سؤالاً</Badge></CardContent>
              </Card>
            );
          })}
        </div>
      </PageContainer>
      <Footer />
    </div>
  );
}
