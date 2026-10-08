import type { AnalysisResult } from '../types/ecg';

// Dev server proxies /api -> the FastAPI backend (see vite.config.ts).
// In production, set VITE_API_BASE to the deployed backend origin.
const BASE = import.meta.env.VITE_API_BASE ?? '';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    let detail: string | null = null;
    try {
      detail = (JSON.parse(body) as { detail?: string }).detail ?? null;
    } catch {
      // not JSON — fall through to the raw-body message
    }
    throw new Error(detail ?? `${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function listRecords(): Promise<string[]> {
  const res = await fetch(`${BASE}/api/records`);
  const data = await json<{ records: string[] }>(res);
  return data.records;
}

export async function analyzeRecord(recordId: string): Promise<AnalysisResult> {
  const res = await fetch(`${BASE}/api/analyze/${encodeURIComponent(recordId)}`);
  return json<AnalysisResult>(res);
}

export async function uploadAndAnalyze(heaFile: File, datFile: File): Promise<AnalysisResult> {
  const form = new FormData();
  form.append('hea_file', heaFile, heaFile.name);
  form.append('dat_file', datFile, datFile.name);
  const res = await fetch(`${BASE}/api/upload-analyze`, { method: 'POST', body: form });
  return json<AnalysisResult>(res);
}

export async function sendChatMessage(
  result: AnalysisResult,
  question: string,
  hintGiven: boolean,
): Promise<string> {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ result, question, hint_given: hintGiven }),
  });
  const data = await json<{ answer: string }>(res);
  return data.answer;
}
