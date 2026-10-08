import type { ReactNode } from 'react';
import { useTheme } from '../../theme/ThemeContext';

export function PanelTitle({ children }: { children: ReactNode }) {
  const { C } = useTheme();
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        color: C.dim,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}
