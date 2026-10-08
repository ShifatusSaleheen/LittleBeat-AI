import { useEffect, useState } from 'react';
import { analyzeRecord } from '../api/client';
import type { AnalysisResult } from '../types/ecg';

interface UseAnalysisState {
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
}

export function useAnalysis(recordId: string | null): UseAnalysisState {
  const [state, setState] = useState<UseAnalysisState>({
    result: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!recordId) return;
    let cancelled = false;
    setState({ result: null, loading: true, error: null });

    analyzeRecord(recordId)
      .then((result) => {
        if (!cancelled) setState({ result, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ result: null, loading: false, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [recordId]);

  return state;
}
