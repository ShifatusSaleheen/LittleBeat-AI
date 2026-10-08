import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { uploadAndAnalyze } from '../../api/client';
import { AnalysisView } from '../../components/AnalysisView/AnalysisView';
import { Card } from '../../components/common/Card';
import { AnalyzingIndicator } from '../../components/common/AnalyzingIndicator';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { useTheme } from '../../theme/ThemeContext';
import type { Palette } from '../../theme/colors';
import type { AnalysisResult } from '../../types/ecg';
import { exportAnalysisReport } from '../../utils/exportReport';

export default function UploadPage() {
  const { C, mode } = useTheme();
  const glassStyle = {
    background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.55)',
    backdropFilter: 'blur(20px) saturate(160%)',
    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(36,20,25,0.14)'}`,
    boxShadow: `0 12px 32px -14px rgba(0,0,0,${mode === 'dark' ? 0.5 : 0.22}), inset 0 1px 0 rgba(255,255,255,${mode === 'dark' ? 0.08 : 0.6})`,
  } as const;
  const [heaFile, setHeaFile] = useState<File | null>(null);
  const [datFile, setDatFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFiles = (files: FileList | null) => {
    if (!files) return;
    setError(null);
    let nextHea = heaFile;
    let nextDat = datFile;
    for (const f of Array.from(files)) {
      if (f.name.toLowerCase().endsWith('.hea')) nextHea = f;
      else if (f.name.toLowerCase().endsWith('.dat')) nextDat = f;
    }
    setHeaFile(nextHea);
    setDatFile(nextDat);
  };

  const analyze = () => {
    if (!heaFile || !datFile) {
      setError('Select both the .hea header and the .dat signal file.');
      return;
    }
    setLoading(true);
    setError(null);
    uploadAndAnalyze(heaFile, datFile)
      .then(setResult)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const reset = () => {
    setResult(null);
    setHeaFile(null);
    setDatFile(null);
    setError(null);
  };

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
            LittleBeat AI <span style={{ color: C.faint, fontWeight: 500 }}>· upload your own recording</span>
          </div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
            {result ? `Record ${result.record} · ${result.n_beats_analysed} beats analysed` : 'WFDB record (.hea + .dat)'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {result && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => exportAnalysisReport(result)}
                style={{
                  border: `1px solid ${C.primary}55`,
                  cursor: 'pointer',
                  background: C.primarySoft,
                  color: C.primary,
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                }}
              >
                ⬇ Download report (PDF)
              </button>
              <button
                onClick={reset}
                style={{
                  border: `1px solid ${C.line}`,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: C.dim,
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                }}
              >
                Upload another
              </button>
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>

      {loading && <AnalyzingIndicator />}

      {!result && !loading && (
        <Card style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center', ...glassStyle }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Upload a WFDB record</div>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 18, lineHeight: 1.5 }}>
            Select both files from the same recording — a <code>.hea</code> header and its matching{' '}
            <code>.dat</code> signal file. The header's own text references the data filename, so the
            pair has to come from the same export.
          </div>

          <UploadDropzone C={C} inputRef={inputRef} pickFiles={pickFiles} />

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 18, fontSize: 11 }}>
            <FilePill label=".hea" file={heaFile} C={C} />
            <FilePill label=".dat" file={datFile} C={C} />
          </div>

          {error && (
            <div style={{ fontSize: 11, color: C.rose, marginBottom: 14, lineHeight: 1.5 }}>{error}</div>
          )}

          <motion.button
            onClick={analyze}
            disabled={loading || !heaFile || !datFile}
            whileTap={!heaFile || !datFile ? undefined : { scale: 0.96 }}
            style={{
              border: 'none',
              cursor: !heaFile || !datFile ? 'default' : 'pointer',
              opacity: !heaFile || !datFile ? 0.5 : 1,
              background: C.primary,
              color: '#fff',
              borderRadius: 8,
              padding: '9px 22px',
              fontWeight: 700,
              fontSize: 12,
              fontFamily: 'inherit',
            }}
          >
            Analyse
          </motion.button>
        </Card>
      )}

      {result && <AnalysisView result={result} />}
    </div>
  );
}

function UploadDropzone({
  C,
  inputRef,
  pickFiles,
}: {
  C: Palette;
  inputRef: React.RefObject<HTMLInputElement | null>;
  pickFiles: (files: FileList | null) => void;
}) {
  return (
    <motion.div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        pickFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      whileHover={{ borderColor: C.primary }}
      style={{
        border: `1.5px dashed ${C.line}`,
        borderRadius: 10,
        padding: '26px 16px',
        cursor: 'pointer',
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 12, color: C.dim }}>Click to browse, or drag files here</div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".hea,.dat"
        onChange={(e) => pickFiles(e.target.files)}
        style={{ display: 'none' }}
      />
    </motion.div>
  );
}

function FilePill({ label, file, C }: { label: string; file: File | null; C: Palette }) {
  return (
    <div
      style={{
        border: `1px solid ${file ? C.primary + '55' : C.line}`,
        background: file ? C.primarySoft : 'transparent',
        color: file ? C.primary : C.faint,
        borderRadius: 6,
        padding: '4px 10px',
        fontFamily: 'ui-monospace, monospace',
        maxWidth: 200,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {file ? file.name : `no ${label} file`}
    </div>
  );
}
