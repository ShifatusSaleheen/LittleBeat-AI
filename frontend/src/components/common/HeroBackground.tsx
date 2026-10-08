import { motion } from 'framer-motion';
import { useTheme } from '../../theme/ThemeContext';

const BEAT =
  'M0,60 L120,60 Q140,40 160,60 L280,60 L300,78 L320,10 L340,100 L360,60 L480,60 Q510,32 540,60 L900,60';

const HEART =
  'M23.6 0c-3.4 0-6.3 2-7.6 4.9C14.7 2 11.8 0 8.4 0 3.8 0 0 3.8 0 8.4c0 9.4 11.4 15.6 16 20.6 4.6-5 16-11.2 16-20.6C32 3.8 28.2 0 23.6 0z';

const MATRIX_GREEN = '#00ff41';

export function HeroBackground() {
  const { C, mode } = useTheme();
  const blobOpacity = mode === 'dark' ? 0.32 : 0.2;
  const beatColor = mode === 'dark' ? MATRIX_GREEN : C.primary;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '-12%',
          left: '-8%',
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: C.primary,
          opacity: blobOpacity,
          filter: 'blur(110px)',
        }}
      />
      <motion.div
        animate={{ x: [0, -25, 0], y: [0, -15, 0] }}
        transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          bottom: '-16%',
          right: '-10%',
          width: 520,
          height: 520,
          borderRadius: '50%',
          background: C.amber,
          opacity: blobOpacity * 0.7,
          filter: 'blur(130px)',
        }}
      />
      <motion.div
        animate={{ x: [0, 18, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '38%',
          left: '20%',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: C.signal,
          opacity: blobOpacity * 0.4,
          filter: 'blur(120px)',
        }}
      />

      {/* Heart silhouette sitting right behind the trace's baseline, so the
          scrolling ECG line reads as passing through it. Centering (static
          translate) lives on this outer, non-animated wrapper — Framer
          Motion owns the `transform` property on any element it animates,
          so a scale animation on the same node would silently clobber a
          manual translate(-50%,-50%) here. The pulse animation goes on the
          inner element instead, where it can't conflict. */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(19% + 65px',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 390,
          height: 230,
          opacity: mode === 'dark' ? 0.1 : 0.08,
        }}
      >
        <motion.svg
          viewBox="0 0 32 29"
          animate={{ scale: [1, 1.09, 1, 1.05, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', times: [0, 0.15, 0.3, 0.45, 1] }}
          style={{ display: 'block', width: '100%', height: '100%' }}
        >
          <path d={HEART} fill="none" stroke={beatColor} strokeWidth={0.7} strokeLinejoin="round" />
        </motion.svg>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '14%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(1100px, 140%)',
          height: 120,
          overflow: 'hidden',
          opacity: mode === 'dark' ? 0.28 : 0.22,
        }}
      >
        <motion.svg
          width="1800"
          height="120"
          viewBox="0 0 1800 120"
          animate={{ x: [0, -900] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
          style={{
            display: 'block',
            height: '100%',
            width: 'auto',
            filter: mode === 'dark' ? `drop-shadow(0 0 6px ${MATRIX_GREEN}aa)` : undefined,
          }}
        >
          <path d={BEAT} fill="none" stroke={beatColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <path
            d={BEAT}
            fill="none"
            stroke={beatColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(900,0)"
          />
        </motion.svg>
      </div>
    </div>
  );
}
