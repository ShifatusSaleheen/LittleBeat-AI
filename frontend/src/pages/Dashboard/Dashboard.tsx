import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listRecords } from '../../api/client';
import { AnalysisView } from '../../components/AnalysisView/AnalysisView';
import { Card } from '../../components/common/Card';
import { AnalyzingIndicator } from '../../components/common/AnalyzingIndicator';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { useAnalysis } from '../../hooks/useAnalysis';
import { useTheme } from '../../theme/ThemeContext';

export default function Dashboard() {
  const { C } = useTheme();
  const [records, setRecords] = useState<string[]>([]);
  const [recId, setRecId] = useState<string | null>(null);

  useEffect(() => {
    listRecords()
      .then((r) => {
        setRecords(r);
        if (r.length > 0) setRecId(r[0]);
      })
      .catch(() => setRecords([]));
  }, []);

  const { result, loading, error } = useAnalysis(recId);

  return (
    <div
      style={{
        background: C.bg,
        minHeight: '100vh',
        color: C.ink,
        padding: 16,
        transition: 'background .2s ease, color .2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <Link
            to="/features"
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
              marginBottom: 4,
              transition: 'background .15s, border-color .15s',
            }}
          >
            ← Features
          </Link>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', marginTop: 2 }}>
            LittleBeat AI <span style={{ color: C.faint, fontWeight: 500 }}>· pretrained dataset</span>
          </div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
            {result
              ? `Record ${result.record} · ${result.n_beats_analysed} beats · ${result.ensemble_folds}-fold ensemble`
              : 'Select a record to analyse'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: C.faint }}>record:</span>
            <select
              value={recId ?? ''}
              onChange={(e) => setRecId(e.target.value)}
              style={{
                border: `1px solid ${C.line}`,
                cursor: 'pointer',
                background: C.panel2,
                color: C.primary,
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            >
              {records.map((r) => (
                <option key={r} value={r} style={{ background: C.panel2, color: C.ink }}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {loading && <AnalyzingIndicator />}
      {error && (
        <Card style={{ marginBottom: 14, color: C.rose, borderColor: C.rose + '55' }}>
          Could not analyse this record: {error}
        </Card>
      )}

      {result && <AnalysisView result={result} />}

      {!result && (
        <div style={{ fontSize: 10, color: C.faint, marginTop: 10, textAlign: 'center', lineHeight: 1.4 }}>
          
        </div>
      )}
    </div>
  );
}
