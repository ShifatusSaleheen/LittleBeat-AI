import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { HeartGLB } from '../../components/Heart3D/HeartGLB';

const NAV_HEIGHT = 64;

const CONTACTS = [
  { name: 'Shifatus Saleheen', email: 'shifatus.saleheen@northsouth.edu' },
  { name: 'Alvee Haider', email: 'alvee.haider@northsouth.edu' },
  { name: 'Farhan Iktidar', email: 'farhan.iktidar@northsouth.edu' },
  { name: 'Md. Maruf Parvez', email: 'maruf.parvez@northsouth.edu' },
];

export default function LandingPage() {
  const { C, mode } = useTheme();

  return (
    <div style={{ position: 'relative', background: C.bg, color: C.ink, overflowX: 'hidden' }}>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 16,
          height: NAV_HEIGHT,
          padding: '0 32px',
          background: mode === 'dark' ? 'rgba(10,14,23,0.55)' : 'rgba(250,247,246,0.7)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        <NavLink to="/" C={C}>
          Home
        </NavLink>
        <Dot C={C} />
        <NavLink to="/features" C={C}>
          Features
        </NavLink>
        <Dot C={C} />
        <NavAnchor href="#about" C={C}>
          About
        </NavAnchor>
        <Dot C={C} />
        <NavAnchor href="#contact" C={C}>
          Contact
        </NavAnchor>
        <div style={{ marginLeft: 8 }}>
          <ThemeToggle />
        </div>
      </nav>

      {/* HERO */}
      <section
        style={{
          position: 'relative',
          minHeight: `calc(100vh - ${NAV_HEIGHT}px)`,
          overflow: 'hidden',
          background: `radial-gradient(ellipse 70% 85% at 18% 45%, ${C.primary}2e, transparent 62%), ${C.bg}`,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ flex: '0 0 48%', height: '76vh', minWidth: 280 }}
        >
          <HeartGLB localization={{ render: 'none', site_id: null, label: '' }} decorative />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
          style={{ flex: 1, textAlign: 'right', padding: '0 48px 0 0' }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              color: C.primary,
            }}
          >
            AI-Powered Cardiac Insight
          </div>

          <div style={{ fontSize: 32, fontWeight: 400, color: C.dim, lineHeight: 1.1, marginTop: 18 }}>Meet</div>
          <div
            style={{
              fontSize: 'clamp(40px, 6vw, 68px)',
              fontWeight: 800,
              letterSpacing: '-.02em',
              lineHeight: 1.05,
              color: C.ink,
            }}
          >
            LittleBeat AI
          </div>

          <div
            style={{
              fontSize: 18,
              color: C.dim,
              lineHeight: 1.65,
              marginTop: 20,
              maxWidth: 440,
              marginLeft: 'auto',
            }}
          >
            A 12-lead ECG arrhythmia classifier:a 9 class ensemble with 3D anatomical
            localization, per-lead evidence, and a patient chatbot. Every finding
            carries the reliability and confidence level.
          </div>

          <motion.div whileTap={{ scale: 0.96 }} style={{ marginTop: 30, display: 'inline-block' }}>
            <Link
              to="/features"
              style={{
                display: 'inline-block',
                textDecoration: 'none',
                background: C.primary,
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                borderRadius: 999,
                padding: '13px 28px',
                boxShadow: `0 12px 28px -10px ${C.primary}88`,
              }}
            >
              Explore Features →
            </Link>
          </motion.div>

          
        </motion.div>
      </section>

      {/* ABOUT */}
      <section
        id="about"
        style={{
          padding: '96px 32px',
          maxWidth: 860,
          marginInline: 'auto',
          textAlign: 'center',
          scrollMarginTop: NAV_HEIGHT,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: C.primary,
            marginBottom: 14,
          }}
        >
          About
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.01em', marginBottom: 16 }}>
          What LittleBeat AI does
        </div>
        <div style={{ fontSize: 14, color: C.dim, lineHeight: 1.75, maxWidth: 640, marginInline: 'auto' }}>
          LittleBeat AI analyses pediatric focused 12-lead ECG recordings with a 9-class arrhythmia ensemble built
          over ECGFounder embeddings. Every finding is paired with a 3D anatomical view of where
          the rhythm likely originates, per-lead evidence for how the model reached its
          conclusion, and a chatbot that explains the result in plain language.
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 34, flexWrap: 'wrap' }}>
          {['9-class ensemble', '3D localization', 'Per-lead evidence', 'Patient chatbot'].map((label) => (
            <span
              key={label}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.dim,
                background: C.panel2,
                border: `1px solid ${C.line}`,
                borderRadius: 999,
                padding: '7px 14px',
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* CONTACT / FOOTER */}
      <section
        id="contact"
        style={{
          borderTop: `1px solid ${C.line}`,
          padding: '48px 32px',
          textAlign: 'center',
          scrollMarginTop: NAV_HEIGHT,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: C.primary, marginBottom: 10 }}>
          Contact
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '18px 140px',
            maxWidth: 560,
            marginInline: 'auto',
            textAlign: 'left',
          }}
        >
          {CONTACTS.map(({ name, email }) => (
            <div key={email}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{name}</div>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{email}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function NavLink({ to, children, C }: { to: string; children: string; C: { dim: string; primary: string } }) {
  return (
    <Link
      to={to}
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '.14em',
        textTransform: 'uppercase',
        color: C.dim,
        textDecoration: 'none',
        transition: 'color .15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = C.primary)}
      onMouseLeave={(e) => (e.currentTarget.style.color = C.dim)}
    >
      {children}
    </Link>
  );
}

function NavAnchor({ href, children, C }: { href: string; children: string; C: { dim: string; primary: string } }) {
  return (
    <a
      href={href}
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '.14em',
        textTransform: 'uppercase',
        color: C.dim,
        textDecoration: 'none',
        transition: 'color .15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = C.primary)}
      onMouseLeave={(e) => (e.currentTarget.style.color = C.dim)}
    >
      {children}
    </a>
  );
}

function Dot({ C }: { C: { faint: string } }) {
  return <span style={{ fontSize: 8, color: C.faint }}>◆</span>;
}
