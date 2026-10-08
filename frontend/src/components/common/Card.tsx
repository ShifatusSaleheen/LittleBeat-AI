import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cardStyle } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';

export function Card({
  children,
  style,
  hoverable,
}: {
  children: ReactNode;
  style?: CSSProperties;
  hoverable?: boolean;
}) {
  const { C } = useTheme();
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      whileHover={hoverable ? { borderColor: C.primary, y: -2 } : undefined}
      style={{ ...cardStyle(C), transition: 'border-color .15s, box-shadow .15s', ...style }}
    >
      {children}
    </motion.div>
  );
}
