const emptyHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const zeroHash = '6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d';

export function savedReport() {
  return {
    schema_version: 1,
    tool: { name: 'hashprobe', version: '0.2.0' },
    algorithm: 'sha256',
    mode: 'check',
    status: 'mismatch',
    suite: { version: 'sha256-v1', seed: 42 },
    target: { command: ['./sha256-target', '--demo-bug-nul'] },
    summary: {
      planned: 2,
      executed: 2,
      passed: 1,
      mismatches: 1,
      errors: 0,
      skipped: 0,
      complete: true,
    },
    results: [
      {
        id: 'kat-empty',
        category: 'known-answer',
        input_bytes: 0,
        expected_hex: emptyHash,
        actual_hex: emptyHash,
        status: 'pass',
      },
      {
        id: 'boundary-0001-zero',
        category: 'boundary',
        input_bytes: 1,
        input_hex: '00',
        expected_hex: zeroHash,
        actual_hex: emptyHash,
        status: 'mismatch',
      },
    ],
  };
}

export function fixedReport() {
  const report = savedReport();
  report.status = 'pass';
  report.target.command = ['./sha256-target'];
  report.summary.passed = 2;
  report.summary.mismatches = 0;
  report.results[1].actual_hex = report.results[1].expected_hex;
  report.results[1].status = 'pass';
  return report;
}
