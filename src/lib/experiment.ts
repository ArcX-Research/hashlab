import { toHex } from './bytes.ts';
import { FAULTS } from './types.ts';
import type { Fault, Report, TestCase, TestResult } from './types.ts';

export function previewReport(cases: TestCase[], seed: number): Report {
  return {
    label: 'Browser experiment',
    origin: 'demo',
    complete: false,
    planned: cases.length,
    target: 'Browser SHA-256',
    seed,
    results: cases.map((test) => ({
      id: test.id,
      category: test.category,
      inputBytes: test.input.length,
      expectedHex: test.expectedHex,
      actualHex: null,
      status: 'pending',
      previewHex: toHex(test.input.subarray(0, 64)),
    })),
  };
}

export async function runExperiment(
  cases: TestCase[],
  seed: number,
  fault: Fault,
): Promise<Report> {
  if (!Object.hasOwn(FAULTS, fault)) throw new Error('Unknown experiment.');
  const report = previewReport(cases, seed);
  report.startedAt = new Date().toISOString();
  report.target = `Browser SHA-256 / ${FAULTS[fault].name}`;
  const results: TestResult[] = [];
  for (const test of cases) {
    const start = performance.now();
    let input = test.input;
    if (fault === 'nul') {
      const zero = input.indexOf(0);
      if (zero !== -1) input = input.subarray(0, zero);
    }
    if (fault === 'drop-last' && input.length) input = input.subarray(0, input.length - 1);
    // Web Crypto is independent of the C reference used for expected hashes.
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', input));
    if (fault === 'flip-bit') digest[0] ^= 1;
    const actualHex = toHex(digest);
    const status = actualHex === test.expectedHex ? 'pass' : 'mismatch';
    results.push({
      id: test.id,
      category: test.category,
      inputBytes: test.input.length,
      expectedHex: test.expectedHex,
      actualHex,
      status,
      previewHex: toHex(test.input.subarray(0, 64)),
      ...(status === 'mismatch' ? { inputHex: toHex(test.input) } : {}),
      durationMs: performance.now() - start,
    });
  }
  return { ...report, complete: true, results };
}
