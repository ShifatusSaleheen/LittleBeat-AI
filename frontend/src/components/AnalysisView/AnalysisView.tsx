import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { PanelTitle } from '../common/PanelTitle';
import { Chatbot } from '../Chatbot/Chatbot';
import { HeartGLB } from '../Heart3D/HeartGLB';
import { LeadEvidence } from '../LeadEvidence/LeadEvidence';
import { LeadStrip } from '../LeadStrip/LeadStrip';
import { ReliabilityBadge } from '../ReliabilityBadge/ReliabilityBadge';
import { tierColor } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
import { CLASS_DESCRIPTIONS } from '../../constants/classInfo';
import type { AnalysisResult, ReliabilityTier } from '../../types/ecg';

// The full results layout (waveform / 3D heart / finding / chatbot) —
// shared by the pretrained-dataset dashboard and the upload-your-own flow,
// since both end up with the exact same AnalysisResult shape to display.
export function AnalysisView({ result }: { result: AnalysisResult }) {
  const { C } = useTheme();

  const sorted = useMemo(() => {
    return Object.entries(result.rhythm_summary.class_counts)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [result]);
  const totalBeats = sorted.reduce((s, [, v]) => s + v, 0);

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr 300px',
          gridTemplateRows: '1fr auto',
          gap: 14,
          height: 'calc(100vh - 90px)',
        }}
      >
        <Card style={{ gridColumn: 1, gridRow: '1 / 3', overflowY: 'auto' }}>
          <PanelTitle>12-lead waveform · {result.n_beats_analysed} beats detected</PanelTitle>
          <LeadStrip waveform={result.waveform} />
        </Card>

        <Card style={{ gridColumn: 2, gridRow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <PanelTitle>Arrhythmia origin</PanelTitle>
            <span style={{ fontSize: 10, color: C.faint }}>{result.localization.label}</span>
          </div>
          {result.localization.mechanism && (
            <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.4, marginBottom: 6 }}>
              <b style={{ color: C.faint }}>What this means: </b>
              {result.localization.label} — {result.localization.mechanism}.
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0 }}>
            <HeartGLB localization={result.localization} />
          </div>
          {(result.localization.loc_tier === 'chamber_unresolved' ||
            result.localization.loc_tier === 'low' ||
            result.localization.loc_tier === 'multi_probable' ||
            result.localization.loc_tier === 'multi_simultaneous') && (
            <div
              style={{
                fontSize: 11,
                color: C.amber,
                background: C.amber + '12',
                border: `1px solid ${C.amber}33`,
                borderRadius: 7,
                padding: '7px 10px',
                lineHeight: 1.45,
                marginTop: 6,
              }}
            >
              {result.localization.caveat}
            </div>
          )}
        </Card>

        <Card style={{ gridColumn: 3, gridRow: '1 / 3', overflowY: 'auto' }}>
          <PanelTitle>Finding</PanelTitle>
          <motion.div
            key={result.record}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: '-.02em',
              color: tierColor(C)[result.prediction.reliability_tier as ReliabilityTier],
            }}
          >
            {result.prediction.class}
          </motion.div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 4px' }}>
            <span style={{ fontSize: 13, color: C.dim }}>
              {(result.prediction.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
          <div style={{ marginBottom: 4 }}>
            <ReliabilityBadge tier={result.prediction.reliability_tier} />
          </div>

          {CLASS_DESCRIPTIONS[result.prediction.class] && (
            <div
              style={{
                fontSize: 11,
                lineHeight: 1.5,
                color: C.dim,
                background: C.panel2,
                border: `1px solid ${C.line}`,
                borderRadius: 7,
                padding: '9px 11px',
                marginTop: 8,
                marginBottom: 4,
              }}
            >
              <b style={{ color: C.ink }}>What is {result.prediction.class}? </b>
              {CLASS_DESCRIPTIONS[result.prediction.class]}
            </div>
          )}

          {result.prediction.reliability_tier !== 'reliable' && (
            <div
              style={{
                fontSize: 11,
                lineHeight: 1.5,
                color: C.rose,
                background: C.rose + '10',
                border: `1px solid ${C.rose}33`,
                borderRadius: 7,
                padding: '9px 11px',
                marginBottom: 12,
              }}
            >
              {result.prediction.reliability_tier === 'low_confidence'
                ? 'This class did not generalise to unseen patients under record-level validation. Treat as a flag for clinical review, not a diagnosis.'
                : 'Partial generalisation only. Confirm before relying on this finding.'}
            </div>
          )}

          <div style={{ height: 1, background: C.line, margin: '12px 0' }} />

          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: C.dim,
              marginBottom: 8,
            }}
          >
            Per-lead evidence
          </div>
          <div style={{ fontSize: 10, color: C.faint, marginBottom: 10, lineHeight: 1.4 }}>
            {result.lead_evidence.note}
          </div>
          <LeadEvidence evidence={result.lead_evidence} />

          <div style={{ height: 1, background: C.line, margin: '14px 0' }} />

          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: C.dim,
              marginBottom: 8,
            }}
          >
            Rhythm breakdown
          </div>
          {sorted.map(([cls, cnt]) => (
            <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <div style={{ width: 72, fontSize: 11, color: C.ink }}>{cls}</div>
              <div style={{ flex: 1, height: 10, background: C.panel2, borderRadius: 3, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(cnt / totalBeats) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: C.faint,
                    borderRadius: 3,
                  }}
                />
              </div>
              <div style={{ width: 30, fontSize: 10, color: C.dim, textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>
                {cnt}
              </div>
            </div>
          ))}
        </Card>

        <Card style={{ gridColumn: 2, gridRow: 2, height: 260, overflow: 'hidden' }}>
          <Chatbot result={result} />
        </Card>
      </div>
    </>
  );
}
