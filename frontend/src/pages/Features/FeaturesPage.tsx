import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { HeroBackground } from '../../components/common/HeroBackground';
import type { Palette, ThemeMode } from '../../theme/colors';

export default function FeaturesPage() {
  const { C, mode } = useTheme();
  return (
    <div
      style={{
        position: 'relative',
        background: C.bg,
        minHeight: '100vh',
        color: C.ink,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        overflow: 'hidden',
        transition: 'background .2s ease, color .2s ease',
      }}
    >
      <HeroBackground />

      <div style={{ position: 'fixed', top: 20, left: 20, zIndex: 1 }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 13,
            fontWeight: 700,
            color: C.primary,
            textDecoration: 'none',
            background: C.primarySoft,
            border: `1px solid ${C.primary}55`,
            borderRadius: 7,
            padding: '6px 13px',
            transition: 'background .15s, border-color .15s',
          }}
        >
          ← Home
        </Link>
      </div>

      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1 }}>
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ position: 'relative', zIndex: 1, maxWidth: 720, width: '100%', textAlign: 'center' }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: C.primary,
            marginBottom: 12,
          }}
        >
          Features
        </div>

        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.15 }}>
          LittleBeat AI <span style={{ color: C.dim, fontWeight: 500 }}>· 12-lead arrhythmia</span>
        </div>
        <div style={{ fontSize: 14, color: C.dim, marginTop: 14, lineHeight: 1.65, maxWidth: 540, marginInline: 'auto' }}>
          A 9-class ensemble over ECGFounder embeddings, with 3D anatomical localization and
          per-lead evidence
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            marginTop: 40,
          }}
        >
          <EntryCard
            to="/upload"
            title="Upload a recording"
            description="Analyse your own WFDB record (.hea + .dat) through the live model."
            accent={C.primary}
            C={C}
            mode={mode}
            delay={0.05}
          />
          <EntryCard
            to="/dashboard"
            title="Browse pretrained dataset"
            description="Explore the 39 records from the Leipzig Heart Center database."
            accent={C.amber}
            C={C}
            mode={mode}
            delay={0.12}
          />
        </div>

        
      </motion.div>
    </div>
  );
}

function EntryCard({
  to,
  title,
  description,
  accent,
  C,
  mode,
  delay,
}: {
  to: string;
  title: string;
  description: string;
  accent: string;
  C: Palette;
  mode: ThemeMode;
  delay: number;
}) {
  const glassBg = mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.55)';
  const glassBgHover = mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)';
  const glassBorder = mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(36,20,25,0.14)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      whileHover={{ y: -3 }}
    >
      <Link
        to={to}
        style={{
          display: 'block',
          textDecoration: 'none',
          color: C.ink,
          background: glassBg,
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          border: `1px solid ${glassBorder}`,
          borderRadius: 16,
          padding: '28px 22px',
          textAlign: 'left',
          transition: 'border-color .15s, background .15s, box-shadow .15s',
          height: '100%',
          boxShadow: `0 12px 32px -14px rgba(0,0,0,${mode === 'dark' ? 0.5 : 0.22}), inset 0 1px 0 rgba(255,255,255,${mode === 'dark' ? 0.08 : 0.6})`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = accent + 'aa';
          e.currentTarget.style.background = glassBgHover;
          e.currentTarget.style.boxShadow = `0 14px 32px -10px ${accent}55, inset 0 1px 0 rgba(255,255,255,${mode === 'dark' ? 0.1 : 0.7})`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = glassBorder;
          e.currentTarget.style.background = glassBg;
          e.currentTarget.style.boxShadow = `0 12px 32px -14px rgba(0,0,0,${mode === 'dark' ? 0.5 : 0.22}), inset 0 1px 0 rgba(255,255,255,${mode === 'dark' ? 0.08 : 0.6})`;
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: accent,
            marginBottom: 14,
          }}
        />
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>{description}</div>
        <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginTop: 14 }}>Continue →</div>
      </Link>
    </motion.div>
  );
}
