"use client";

import * as React from "react";
import type { QuestionBank } from "@/lib/game/types";
import { builtinBanks, categoryName } from "@/data/questions";
import { parseQuestionFile } from "@/lib/bank/parse";
import { validateRows, type RowReport } from "@/lib/bank/validate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameIcon } from "@/components/ui/GameIcon";
import { useToast } from "@/components/ui/toast";
import { uid } from "@/lib/utils";

export function BankManager({
  selectedId,
  onSelect,
  customBanks,
  onImport,
  onDelete,
  compact,
}: {
  selectedId: string | null;
  onSelect: (b: QuestionBank) => void;
  customBanks: QuestionBank[];
  onImport: (b: QuestionBank) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  const { push } = useToast();
  const [banks] = React.useState<QuestionBank[]>(() => builtinBanks());
  const [reports, setReports] = React.useState<RowReport[] | null>(null);
  const [pending, setPending] = React.useState<{ name: string; valid: Parameters<typeof onImport>[0]["questions"] } | null>(null);
  const [busy, setBusy] = React.useState(false);

  const all = [...banks, ...customBanks];

  const handleFile = async (f: File) => {
    setBusy(true);
    try {
      const { rows, fileName } = await parseQuestionFile(f);
      const { valid, reports } = validateRows(rows);
      setReports(reports);
      if (valid.length === 0) {
        push({ title: "لا توجد أسئلة صالحة", hint: "راجع الأخطاء أدناه", kind: "error" });
        setPending(null);
        return;
      }
      setPending({
        name: fileName.replace(/\.(xlsx|csv|json)$/i, ""),
        valid: valid.map((v) => ({
          id: uid("q"),
          question: v.question,
          answers: v.answers as [string, string, string, string],
          correctAnswer: v.correctAnswer,
          category: v.category,
          difficulty: v.difficulty,
          explanation: v.explanation,
        })),
      });
      push({ title: `تم رصد ${rows.length} سؤالاً`, hint: `${valid.length} صالح · ${reports.filter((r) => !r.ok).length} يحتاج مراجعة`, kind: "success" });
    } catch (e) {
      push({ title: "فشل الاستيراد", hint: e instanceof Error ? e.message : "خطأ غير معروف", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {all.map((b) => (
          <Card key={b.id} className={selectedId === b.id ? "border-[var(--accent)]" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-[15px]">
                {b.name}
                {selectedId === b.id && <Badge variant="gold">مختارة</Badge>}
              </CardTitle>
              <CardDescription>
                {b.questions.length} سؤالاً · {b.source === "builtin" ? "مدمجة" : "مرفوعة"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button size="sm" variant={selectedId === b.id ? "gold" : "secondary"} onClick={() => onSelect(b)}>
                {selectedId === b.id ? "مختارة ✓" : "اختيار"}
              </Button>
              {b.source === "upload" && (
                <Button size="sm" variant="ghost" onClick={() => onDelete(b.id)}>
                  حذف
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">رفع بنك أسئلة (المضيف فقط)</CardTitle>
          <CardDescription>XLSX أو CSV أو JSON — ثم مراجعة قبل الاستيراد. الأعمدة: question · answers · correctAnswer · category · difficulty</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--border)] p-6 text-center hover:bg-[var(--elevated)]">
            <GameIcon name="upload" size={30} className="text-[var(--primary)]" />
            <span className="text-sm font-bold">{busy ? "جارٍ التحليل…" : "اختر ملفاً أو أسقطه هنا"}</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
          {reports && (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] text-[var(--muted)]">
                {reports.length} سؤالاً مرصوداً · {reports.filter((r) => r.ok).length} صالح · {reports.filter((r) => !r.ok).length} يحتاج attention
              </p>
              <div className="max-h-48 overflow-auto rounded-2xl border border-[var(--border)]">
                <table className="w-full text-[12.5px]">
                  <thead className="sticky top-0 bg-[var(--elevated)]">
                    <tr>
                      <th className="p-2 text-start">#</th>
                      <th className="p-2 text-start">السؤال</th>
                      <th className="p-2">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.slice(0, 100).map((r) => (
                      <tr key={r.index} className="border-t border-[var(--border)]">
                        <td className="p-2">{r.index}</td>
                        <td className="p-2">{r.preview}</td>
                        <td className="p-2 text-center">{r.ok ? "✓" : "⚠"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!compact && reports.filter((r) => !r.ok).slice(0, 5).map((r) => (
                <p key={r.index} className="text-[12px] text-[var(--warning)]">
                  #{r.index}: {r.errors.join(" · ")}
                </p>
              ))}
              {pending && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="gold"
                    onClick={() => {
                      onImport({ id: uid("bank"), name: pending.name, source: "upload", questions: pending.valid, createdAt: Date.now() });
                      setPending(null);
                      setReports(null);
                      push({ title: "تم استيراد البنك", kind: "success" });
                    }}
                  >
                    استيراد الأسئلة الصالحة ({pending.valid.length})
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setPending(null); setReports(null); }}>
                    إلغاء
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function categoryLabel(id: string): string {
  return categoryName(id, "ar");
}
