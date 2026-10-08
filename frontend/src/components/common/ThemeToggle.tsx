import { motion } from 'framer-motion';
import { useTheme } from '../../theme/ThemeContext';

export function ThemeToggle() {
  const { mode, toggle, C } = useTheme();
  const isDark = mode === 'dark';

  return (
    <motion.button
      onClick={toggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      whileTap={{ scale: 0.92 }}
      whileHover={{ borderColor: C.primary }}
      style={{
        position: 'relative',
        width: 44,
        height: 26,
        borderRadius: 999,
        border: `1px solid ${C.line}`,
        background: C.panel2,
        cursor: 'pointer',
        padding: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: isDark ? 'flex-end' : 'flex-start',
      }}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: C.primary,
          display: 'block',
        }}
      />
    </motion.button>
  );
}
