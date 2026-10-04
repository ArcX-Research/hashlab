import type { Report, TestResult } from './types.ts';

export const MAX_REPORT_BYTES = 40 * 1024 * 1024;
const MAX_CASES = 1024;
const MAX_INPUT = 1024 * 1024;
const HASH = /^[0-9a-f]{64}$/i;
const HEX = /^[0-9a-f]*$/i;

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`Missing or invalid ${field}.`);
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, limit = 512): string {
  if (typeof value !== 'string' || value.length > limit) throw new Error(`Invalid ${field}.`);
  return value;
}

function integer(value: unknown, field: string, maximum: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > maximum)
    throw new Error(`Invalid ${field}.`);
  return value;
}

function hash(value: unknown, field: string): string {
  if (typeof value !== 'string' || !HASH.test(value))
    throw new Error(`Invalid ${field}; SHA-256 needs 64 hex characters.`);
  return value.toLowerCase();
}

function readResult(value: unknown): TestResult {
  const row = object(value, 'test result');
  const id = text(row.id, 'test ID', 128);
  if (!id) throw new Error('A test ID cannot be empty.');
  const inputBytes = integer(row.input_bytes, 'input size', MAX_INPUT);
  const expectedHex = hash(row.expected_hex, 'expected hash');
  const actualHex = row.actual_hex === null ? null : hash(row.actual_hex, 'actual hash');
  const status = row.status;
  if (status !== 'pass' && status !== 'mismatch' && status !== 'error')
    throw new Error('Unknown test result status.');
  if (status === 'pass' && actualHex !== expectedHex)
    throw new Error(`Test ${id} says it passed, but its hashes differ.`);
  if (status === 'mismatch' && (actualHex === null || actualHex === expectedHex))
    throw new Error(`Test ${id} has an inconsistent mismatch result.`);

  let inputHex: string | undefined;
  if (row.input_hex !== undefined) {
    inputHex = text(row.input_hex, 'saved input', MAX_INPUT * 2).toLowerCase();
    if (!HEX.test(inputHex) || inputHex.length !== inputBytes * 2)
      throw new Error(`Test ${id} has an invalid saved input.`);
  }
  if (status !== 'pass' && inputHex === undefined)
    throw new Error(`Test ${id} is missing its saved input. Open the full Hashprobe JSON report.`);
  let error: string | undefined;
  if (row.error !== undefined) {
    const details = object(row.error, 'test error');
    error = text(
      details.detail ?? details.kind ?? 'The test could not finish.',
      'error details',
      2048,
    );
  }
  return {
    id,
    category: text(row.category, 'test category', 128),
    inputBytes,
    expectedHex,
    actualHex,
    status,
    inputHex,
    previewHex: inputHex?.slice(0, 128),
    error,
  };
}

export function countResults(report: Report) {
  const counts = { passed: 0, mismatches: 0, errors: 0, executed: 0, pending: 0 };
  for (const result of report.results) {
    if (result.status === 'pending') continue;
    counts.executed++;
    if (result.status === 'pass') counts.passed++;
    if (result.status === 'mismatch') counts.mismatches++;
    if (result.status === 'error') counts.errors++;
  }
  counts.pending = report.planned - counts.executed;
  return counts;
}

function reportStatus(report: Report, counts: ReturnType<typeof countResults>) {
  if (counts.errors) return 'error';
  if (counts.mismatches) return 'mismatch';
  return report.complete ? 'pass' : 'error';
}

export function parseReport(content: string, label: string): Report {
  if (new TextEncoder().encode(content).byteLength > MAX_REPORT_BYTES)
    throw new Error('Choose a report smaller than 40 MiB.');
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error('This file is not valid JSON. Choose a Hashprobe report.');
  }
  const root = object(data, 'report');
  if (root.schema_version !== 1 || root.algorithm !== 'sha256')
    throw new Error('Use a SHA-256 report with Hashprobe schema version 1.');
  const tool = object(root.tool, 'tool information');
  if (tool.name !== 'hashprobe' && tool.name !== 'hashprobe-lab')
    throw new Error('This is not a Hashprobe report.');
  if (!Array.isArray(root.results) || root.results.length > MAX_CASES)
    throw new Error('A report must contain at most 1024 test results.');
  const results = root.results.map(readResult);
  if (new Set(results.map((result) => result.id)).size !== results.length)
    throw new Error('The report contains duplicate test IDs.');
  const summary = object(root.summary, 'summary');
  const planned = integer(summary.planned, 'planned tests', MAX_CASES);
  if (typeof summary.complete !== 'boolean') throw new Error('Missing report completion status.');
  if (results.length > planned || (summary.complete && results.length !== planned))
    throw new Error('The report completion status does not match its results.');
  const target = object(root.target, 'target information');
  if (!Array.isArray(target.command) || target.command.length === 0 || target.command.length > 128)
    throw new Error('Missing tested program.');
  const command = target.command.map((value) => text(value, 'target command', 4096)).join(' ');
  const report: Report = {
    label: label.slice(0, 240),
    origin: 'file',
    planned,
    results,
    complete: summary.complete,
    target: command,
    interrupted: root.status === 'interrupted',
    startedAt: typeof root.started_at === 'string' ? root.started_at.slice(0, 64) : undefined,
  };
  const counts = countResults(report);
  for (const key of ['executed', 'passed', 'mismatches', 'errors'] as const) {
    if (integer(summary[key], key, MAX_CASES) !== counts[key])
      throw new Error(`The ${key} count does not match the saved results.`);
  }
  if (integer(summary.skipped, 'skipped tests', MAX_CASES) !== counts.pending)
    throw new Error('The skipped count does not match the saved results.');
  const expectedStatus = reportStatus(report, counts);
  if (report.interrupted ? report.complete : root.status !== expectedStatus)
    throw new Error('The report status does not match its results.');
  const suite = object(root.suite, 'suite information');
  if (suite.seed !== undefined && suite.seed !== null)
    report.seed = integer(suite.seed, 'seed', 0xffffffff);
  return report;
}

export function compareReports(before: Report, after: Report) {
  // A reused random-case ID is not proof that the input is the same.
  const identity = (test: TestResult) => `${test.id}:${test.inputBytes}:${test.expectedHex}`;
  const previous = new Map(
    before.results
      .filter((test) => test.status !== 'pending')
      .map((test) => [identity(test), test]),
  );
  const comparison = { shared: 0, fixed: 0, regressed: 0, unchanged: 0 };
  for (const current of after.results) {
    if (current.status === 'pending') continue;
    const prior = previous.get(identity(current));
    if (!prior) continue;
    comparison.shared++;
    if (prior.status !== 'pass' && current.status === 'pass') comparison.fixed++;
    else if (prior.status === 'pass' && current.status !== 'pass') comparison.regressed++;
    else comparison.unchanged++;
  }
  return comparison;
}

export function exportReport(report: Report): string {
  const counts = countResults(report);
  return JSON.stringify(
    {
      schema_version: 1,
      tool: { name: 'hashprobe-lab', version: '0.1.0' },
      algorithm: 'sha256',
      mode: 'check',
      started_at: report.startedAt,
      reference: { name: 'Hashprobe C reference / WebAssembly', known_answers_checked: 4 },
      suite: { version: 'sha256-v1', seed: report.seed, random_cases: 32, max_random_bytes: 4096 },
      target: { command: [report.target], output_format: 'hex' },
      status: reportStatus(report, counts),
      summary: {
        planned: report.planned,
        executed: counts.executed,
        passed: counts.passed,
        mismatches: counts.mismatches,
        errors: counts.errors,
        skipped: counts.pending,
        complete: report.complete,
      },
      results: report.results
        .filter((test) => test.status !== 'pending')
        .map((test) => ({
          id: test.id,
          category: test.category,
          input_bytes: test.inputBytes,
          expected_hex: test.expectedHex,
          actual_hex: test.actualHex,
          status: test.status,
          duration_ms: test.durationMs,
          ...(test.status !== 'pass' ? { input_hex: test.inputHex } : {}),
          ...(test.error ? { error: { kind: 'browser', detail: test.error } } : {}),
        })),
    },
    null,
    2,
  );
}
