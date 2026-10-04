import { useEffect, useRef, useState } from 'react';
import { requestWorker } from './lib/worker-client';
import type { Fault, Report } from './lib/types';

type Phase = 'loading' | 'ready' | 'computing' | 'playback' | 'complete' | 'error';
const clearResults = (report: Report): Report => ({
  ...report,
  complete: false,
  results: report.results.map((result) => ({
    ...result,
    status: 'pending',
    actualHex: null,
    inputHex: undefined,
  })),
});

export function useExperiment() {
  const [seed, setSeed] = useState('42');
  const [fault, updateFault] = useState<Fault>('nul');
  const [report, setReport] = useState<Report | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');
  const job = useRef<ReturnType<typeof requestWorker> | null>(null);
  const playback = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const mounted = useRef(true);
  const busy = phase === 'computing' || phase === 'playback';
  const validSeed = /^\d+$/.test(seed) && Number(seed) <= 0xffffffff;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      job.current?.cancel();
      clearInterval(playback.current);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let preparation: ReturnType<typeof requestWorker> | undefined;
    setPhase(validSeed ? 'loading' : 'ready');
    setError('');
    setReport(null);
    if (!validSeed) return;
    const timer = setTimeout(async () => {
      try {
        preparation = requestWorker({ action: 'prepare', seed: Number(seed) });
        const result = await preparation.promise;
        if (active) {
          setReport(result);
          setPhase('ready');
        }
      } catch (reason) {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Unable to prepare the tests.');
          setPhase('error');
        }
      }
    }, 120);
    return () => {
      active = false;
      clearTimeout(timer);
      preparation?.cancel();
    };
  }, [seed, validSeed]);

  function setFault(value: Fault) {
    if (busy) return;
    updateFault(value);
    if (report) setReport(clearResults(report));
    if (phase === 'complete') setPhase('ready');
  }

  async function run(nextFault = fault) {
    if (!report || !validSeed || busy || phase === 'loading') return;
    updateFault(nextFault);
    setError('');
    setReport(clearResults(report));
    setPhase('computing');
    try {
      job.current = requestWorker({ action: 'run', seed: Number(seed), fault: nextFault });
      const result = await job.current.promise;
      if (!mounted.current) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setReport(result);
        setPhase('complete');
        return;
      }
      // Animate already-computed results; this is playback, not a speed benchmark.
      setPhase('playback');
      const pending = clearResults(result);
      let shown = 0;
      playback.current = setInterval(() => {
        shown = Math.min(shown + 3, result.results.length);
        setReport({
          ...result,
          complete: shown === result.results.length,
          results: result.results.map((test, index) =>
            index < shown ? test : pending.results[index],
          ),
        });
        if (shown === result.results.length) {
          clearInterval(playback.current);
          setPhase('complete');
        }
      }, 32);
    } catch (reason) {
      if (mounted.current) {
        setError(reason instanceof Error ? reason.message : 'Unable to run the experiment.');
        setPhase('error');
      }
    }
  }

  return { seed, setSeed, validSeed, fault, setFault, report, phase, busy, error, run };
}
