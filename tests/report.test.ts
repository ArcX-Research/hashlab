import assert from 'node:assert/strict';
import { test } from 'node:test';
import { differentBits } from '../src/lib/bytes.ts';
import { compareReports, countResults, parseReport } from '../src/lib/report.ts';
import { fixedReport, savedReport } from './fixtures.ts';

test('reads a native Hashprobe report and retains the failing bytes', () => {
  const report = parseReport(JSON.stringify(savedReport()), 'original.json');
  assert.equal(report.results[1].inputHex, '00');
  assert.equal(report.complete, true);
  assert.deepEqual(countResults(report), {
    passed: 1,
    mismatches: 1,
    errors: 0,
    executed: 2,
    pending: 0,
  });
  assert.equal(
    differentBits(report.results[1].expectedHex, report.results[1].actualHex!).filter(Boolean)
      .length,
    130,
  );
});

test('compares only matching input identities, not reused random IDs', () => {
  const before = parseReport(JSON.stringify(savedReport()), 'before.json');
  const after = parseReport(JSON.stringify(fixedReport()), 'after.json');
  assert.deepEqual(compareReports(before, after), {
    shared: 2,
    fixed: 1,
    regressed: 0,
    unchanged: 1,
  });
  after.results[1].expectedHex = '1'.repeat(64);
  after.results[1].actualHex = '1'.repeat(64);
  assert.deepEqual(compareReports(before, after), {
    shared: 1,
    fixed: 0,
    regressed: 0,
    unchanged: 1,
  });
});

test('accepts replay reports without a random seed', () => {
  const source = fixedReport();
  const replay = { ...source, mode: 'replay', suite: { ...source.suite, seed: null } };
  const report = parseReport(JSON.stringify(replay), 'replay.json');
  assert.equal(report.seed, undefined);
  assert.equal(report.complete, true);
  assert.equal(countResults(report).passed, 2);
});

test('keeps incomplete and interrupted runs incomplete', () => {
  const source = savedReport();
  source.results.pop();
  Object.assign(source.summary, { executed: 1, mismatches: 0, skipped: 1, complete: false });
  source.status = 'interrupted';
  const report = parseReport(JSON.stringify(source), 'stopped.json');
  assert.equal(report.complete, false);
  assert.equal(report.interrupted, true);
  assert.equal(countResults(report).pending, 1);
});

const corruptions: [string, (report: ReturnType<typeof savedReport>) => void][] = [
  [
    'false pass',
    (report) => {
      report.results[1].status = 'pass';
    },
  ],
  [
    'false mismatch',
    (report) => {
      report.results[1].actual_hex = report.results[1].expected_hex;
    },
  ],
  [
    'bad counts',
    (report) => {
      report.summary.mismatches = 0;
    },
  ],
  [
    'duplicate IDs',
    (report) => {
      report.results[1].id = report.results[0].id;
    },
  ],
  [
    'missing input',
    (report) => {
      delete report.results[1].input_hex;
    },
  ],
  [
    'truncated input',
    (report) => {
      report.results[1].input_hex = '0';
    },
  ],
  [
    'invalid hex',
    (report) => {
      report.results[1].input_hex = 'gg';
    },
  ],
  [
    'negative size',
    (report) => {
      report.results[1].input_bytes = -1;
    },
  ],
  [
    'fractional size',
    (report) => {
      report.results[1].input_bytes = 0.5;
    },
  ],
  [
    'huge size',
    (report) => {
      report.results[1].input_bytes = 2 ** 32;
    },
  ],
  [
    'invalid digest',
    (report) => {
      report.results[0].expected_hex = 'not-a-hash';
    },
  ],
  [
    'false complete',
    (report) => {
      report.summary.planned = 3;
    },
  ],
  [
    'missing target',
    (report) => {
      report.target.command = [];
    },
  ],
  [
    'wrong format',
    (report) => {
      report.schema_version = 2;
    },
  ],
  [
    'wrong algorithm',
    (report) => {
      report.algorithm = 'md5';
    },
  ],
];
for (const [name, mutate] of corruptions) {
  test(`rejects ${name}`, () => {
    const source = savedReport();
    mutate(source);
    assert.throws(() => parseReport(JSON.stringify(source), 'bad.json'));
  });
}

test('keeps HTML-looking metadata as plain text', () => {
  const source = savedReport();
  source.target.command = ['<img src=x onerror=alert(1)>'];
  assert.equal(
    parseReport(JSON.stringify(source), 'untrusted.json').target,
    source.target.command[0],
  );
});

test('reports parse errors without interpreting non-report objects', () => {
  for (const input of ['null', '[]', '{}', 'undefined', '{"__proto__":{}}']) {
    assert.throws(() => parseReport(input, 'invalid.json'));
  }
});
