import * as XLSX from "xlsx";
import Papa from "papaparse";
import { normalizeRow, validateRows } from "./validate";

export interface ParsedFile {
  rows: unknown[];
  fileName: string;
}

export async function parseQuestionFile(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".json")) {
    const text = await file.text();
    const data = JSON.parse(text);
    const rows = Array.isArray(data) ? data : data.questions ?? [];
    return { rows: rows.map(normalizeRowFromAny), fileName: file.name };
  }
  if (name.endsWith(".csv")) {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
    return { rows: parsed.data.map(normalizeRow), fileName: file.name };
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    return { rows: json.map(normalizeRow), fileName: file.name };
  }
  throw new Error("صيغة غير مدعومة. استخدم XLSX أو CSV أو JSON.");
}

function normalizeRowFromAny(raw: unknown): unknown {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return normalizeRow(raw as Record<string, unknown>);
  }
  return raw;
}

export { validateRows };
