import type { Fault, Report } from './types.ts';

export type LabRequest =
  | { action: 'prepare'; seed: number }
  | { action: 'run'; seed: number; fault: Fault }
  | { action: 'read'; file: File };

export function requestWorker(request: LabRequest) {
  const worker = new Worker(new URL('../lab.worker.ts', import.meta.url), { type: 'module' });
  let rejectRequest: (reason: Error) => void;
  let timeout: ReturnType<typeof setTimeout>;
  const cleanup = () => {
    clearTimeout(timeout);
    worker.terminate();
  };
  const promise = new Promise<Report>((resolve, reject) => {
    rejectRequest = reject;
    timeout = setTimeout(() => {
      cleanup();
      reject(new Error('The lab took too long to respond. Please try again.'));
    }, 20000);
    worker.onmessage = (event) => {
      cleanup();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.report as Report);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      cleanup();
      reject(new Error('The lab could not start. Reload the page and try again.'));
    };
    worker.postMessage(request);
  });
  return {
    promise,
    cancel: () => {
      cleanup();
      rejectRequest(new Error('Cancelled'));
    },
  };
}
