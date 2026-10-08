import { jsPDF } from 'jspdf';
import type { AnalysisResult, ReliabilityTier } from '../types/ecg';

const TIER_COLOR: Record<ReliabilityTier, [number, number, number]> = {
  reliable: [43, 191, 164], // teal
  marginal: [212, 141, 61], // amber
  low_confidence: [201, 66, 92], // rose
};
const TIER_LABEL: Record<ReliabilityTier, string> = {
  reliable: 'Reliable',
  marginal: 'Uncertain',
  low_confidence: 'Low confidence',
};

const INK: [number, number, number] = [20, 24, 33];
const DIM: [number, number, number] = [100, 110, 125];
const LINE: [number, number, number] = [220, 224, 230];

export function exportAnalysisReport(result: AnalysisResult): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 18;
  const contentW = pageW - marginX * 2;
  let y = 20;

  const rule = (color: [number, number, number] = LINE) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.2);
    doc.line(marginX, y, pageW - marginX, y);
  };
  const advance = (amount: number) => {
    y += amount;
  };

  // ── header ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...INK);
  doc.text('ECG Analysis Report', marginX, y);
  advance(7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...DIM);
  doc.text(
    `Record ${result.record}  ·  ${result.n_beats_analysed} beats  ·  ${result.ensemble_folds}-fold ensemble  ·  generated ${new Date().toLocaleString()}`,
    marginX,
    y,
  );
  advance(6);
  rule();
  advance(10);

  // ── finding ─────────────────────────────────────────────────────────
  const tier = result.prediction.reliability_tier;
  const tierColor = TIER_COLOR[tier];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DIM);
  doc.text('FINDING', marginX, y);
  advance(8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...tierColor);
  doc.text(result.prediction.class, marginX, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...DIM);
  doc.text(`${(result.prediction.confidence * 100).toFixed(0)}% confidence`, marginX, y + 7);
  advance(13);

  // reliability badge
  doc.setFillColor(...tierColor);
  doc.circle(marginX + 1.2, y - 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...tierColor);
  doc.text(TIER_LABEL[tier], marginX + 5, y);
  advance(8);

  if (tier !== 'reliable') {
    const warn =
      tier === 'low_confidence'
        ? 'This class did not generalise to unseen patients under record-level validation. Treat as a flag for clinical review, not a diagnosis.'
        : 'Partial generalisation only. Confirm before relying on this finding.';
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...tierColor);
    const lines = doc.splitTextToSize(warn, contentW);
    doc.text(lines, marginX, y);
    advance(lines.length * 4.2 + 4);
  }
  advance(4);
  rule();
  advance(10);

  // ── localization ────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DIM);
  doc.text('ARRHYTHMIA ORIGIN', marginX, y);
  advance(7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(result.localization.label, marginX, y);
  advance(6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...DIM);
  doc.text(`Mechanism: ${result.localization.mechanism}`, marginX, y);
  advance(6);

  if (result.localization.caveat) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...TIER_COLOR.marginal);
    const lines = doc.splitTextToSize(result.localization.caveat, contentW);
    doc.text(lines, marginX, y);
    advance(lines.length * 4.2 + 2);
  }
  advance(4);
  rule();
  advance(10);

  // ── vitals ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DIM);
  doc.text('VITALS', marginX, y);
  advance(7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(
    `Heart rate: ${result.heart_rate_bpm != null ? `${result.heart_rate_bpm} bpm` : 'not determined'}`,
    marginX,
    y,
  );
  advance(6);
  doc.text(`Sampling rate: ${result.sampling_rate_hz} Hz`, marginX, y);
  advance(10);
  rule();
  advance(10);

  // ── per-lead evidence ───────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DIM);
  doc.text('PER-LEAD EVIDENCE', marginX, y);
  advance(5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...DIM);
  const noteLines = doc.splitTextToSize(result.lead_evidence.note, contentW);
  doc.text(noteLines, marginX, y);
  advance(noteLines.length * 4 + 4);

  const leadEntries = Object.entries(result.lead_evidence.values);
  const colW = contentW / 3;
  const rowsPerCol = Math.ceil(leadEntries.length / 3);
  leadEntries.forEach(([lead, val], i) => {
    const col = Math.floor(i / rowsPerCol);
    const row = i % rowsPerCol;
    const isTop = lead === result.lead_evidence.top_lead;
    doc.setFont('helvetica', isTop ? 'bold' : 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...(isTop ? TIER_COLOR.reliable : INK));
    doc.text(`${lead}`, marginX + col * colW, y + row * 5.5);
    doc.setTextColor(...DIM);
    doc.text(`${(val * 100).toFixed(0)}%`, marginX + col * colW + 12, y + row * 5.5);
  });
  advance(rowsPerCol * 5.5 + 6);
  rule();
  advance(10);

  // ── rhythm breakdown ────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DIM);
  doc.text('RHYTHM BREAKDOWN', marginX, y);
  advance(7);

  const sorted = Object.entries(result.rhythm_summary.class_counts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, [, v]) => s + v, 0);
  for (const [cls, cnt] of sorted) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(cls, marginX, y);
    doc.setTextColor(...DIM);
    doc.text(`${cnt} beats (${((cnt / total) * 100).toFixed(0)}%)`, marginX + 40, y);
    advance(5.5);
  }
  advance(6);
  rule();
  advance(10);

  // ── disclaimer / footer ─────────────────────────────────────────────
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...DIM);
  const discLines = doc.splitTextToSize(result.disclaimer, contentW);
  doc.text(discLines, marginX, y);

  doc.save(`ecg-report-${result.record}.pdf`);
}
