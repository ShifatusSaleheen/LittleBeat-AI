import { motion } from 'framer-motion';
import { useTheme } from '../../theme/ThemeContext';
import { LEADS } from '../../constants/anatomy';
import type { LeadEvidenceData } from '../../types/ecg';

export function LeadEvidence({ evidence }: { evidence: LeadEvidenceData }) {
  const { C } = useTheme();
  const vals = evidence.values;
  const max = Math.max(...Object.values(vals));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {LEADS.map((l) => {
        const v = vals[l] || 0;
        const isTop = l === evidence.top_lead;
        return (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 26,
                fontSize: 10,
                fontWeight: 700,
                color: isTop ? C.primary : C.dim,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {l}
            </div>
            <div
              style={{
                flex: 1,
                height: 12,
                background: C.panel2,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(v / max) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: isTop ? C.primary : C.faint,
                  borderRadius: 3,
                }}
              />
            </div>
            <div
              style={{
                width: 32,
                fontSize: 10,
                color: C.dim,
                textAlign: 'right',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {(v * 100).toFixed(0)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
