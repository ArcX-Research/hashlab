import { useEffect, useRef, useState } from 'react';
import type { Report } from './lib/types';
import { requestWorker } from './lib/worker-client';

export function useReports() {
  const [report, setReport] = useState<Report | null>(null);
  const [baseline, setBaseline] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const activeJobs = useRef<ReturnType<typeof requestWorker>[]>([]);
  const generation = useRef(0);

  useEffect(
    () => () => {
      generation.current++;
      activeJobs.current.forEach((job) => job.cancel());
    },
    [],
  );

  async function open(files: File[], asBaseline = false): Promise<Report | null> {
    if (!files.length) return null;
    const current = ++generation.current;
    activeJobs.current.forEach((job) => job.cancel());
    const jobs: ReturnType<typeof requestWorker>[] = [];
    activeJobs.current = jobs;
    setError('');

    if (files.length > 2) {
      setReading(false);
      setError('Choose one report, or two reports to compare.');
      return null;
    }

    setReading(true);
    try {
      const reports = await Promise.all(
        files.map(async (file) => {
          const job = requestWorker({ action: 'read', file });
          jobs.push(job);
          return job.promise;
        }),
      );
      // A newer selection may have replaced these files while the workers were reading.
      if (current !== generation.current) return null;
      if (asBaseline) {
        setBaseline(reports[0]);
        return null;
      }
      const latest = reports[reports.length - 1];
      setReport(latest);
      setBaseline(reports.length === 2 ? reports[0] : null);
      return latest;
    } catch (reason) {
      if (current === generation.current) {
        setError(reason instanceof Error ? reason.message : 'Unable to open this report.');
      }
      return null;
    } finally {
      jobs.forEach((job) => job.cancel());
      if (current === generation.current) {
        activeJobs.current = [];
        setReading(false);
      }
    }
  }

  return { report, baseline, error, reading, open, clearError: () => setError('') };
}
