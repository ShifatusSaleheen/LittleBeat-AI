import { motion } from 'framer-motion';
import { useTheme } from '../../theme/ThemeContext';

const BEAT =
  'M0,20 L40,20 Q50,10 60,20 L100,20 L110,27 L120,2 L130,35 L140,20 L180,20 Q195,7 210,20 L300,20';

export function AnalyzingIndicator({ label = 'Analysing record…' }: { label?: string }) {
  const { C } = useTheme();
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 12,
        padding: '18px 16px',
        marginBottom: 14,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        overflow: 'hidden',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420, height: 40, overflow: 'hidden' }}>
        <motion.svg
          width="600"
          height="40"
          viewBox="0 0 600 40"
          animate={{ x: [0, -300] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: 'linear' }}
        >
          <path d={BEAT} fill="none" stroke={C.line} strokeWidth={1} transform="translate(0,0)" />
          <path
            d={BEAT}
            fill="none"
            stroke={C.primary}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 4px ${C.primary}aa)` }}
          />
          <path d={BEAT} fill="none" stroke={C.line} strokeWidth={1} transform="translate(300,0)" />
          <path
            d={BEAT}
            fill="none"
            stroke={C.primary}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(300,0)"
            style={{ filter: `drop-shadow(0 0 4px ${C.primary}aa)` }}
          />
        </motion.svg>
      </div>
      <motion.div
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ fontSize: 12, fontWeight: 600, color: C.dim, letterSpacing: '.02em' }}
      >
        {label}
      </motion.div>
    </div>
  );
}
