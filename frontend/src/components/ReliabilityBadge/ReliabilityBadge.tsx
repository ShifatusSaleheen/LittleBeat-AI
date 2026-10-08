import { tierColor, tierLabel } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
import type { ReliabilityTier } from '../../types/ecg';

export function ReliabilityBadge({ tier }: { tier: ReliabilityTier }) {
  const { C } = useTheme();
  const col = tierColor(C)[tier];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '4px 10px',
        borderRadius: 6,
        background: col + '18',
        border: `1px solid ${col}55`,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: col }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{tierLabel[tier]}</span>
    </div>
  );
}
