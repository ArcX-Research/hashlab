import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildCases } from '../src/lib/core.ts';
import type { WasmCore } from '../src/lib/core.ts';
import { runExperiment } from '../src/lib/experiment.ts';
import { differentBits } from '../src/lib/bytes.ts';
import { countResults, exportReport, parseReport } from '../src/lib/report.ts';

const moduleUrl = new URL('../public/wasm/hashprobe.js', import.meta.url);
const { default: createCore } = await import(moduleUrl.href);
const core: WasmCore = await createCore({
  wasmBinary: readFileSync(new URL('../public/wasm/hashprobe.wasm', import.meta.url)),
});
const seeds = [
  0,
  1,
  42,
  0xffffffff,
  0xdeadbeef,
  ...Array.from({ length: 20 }, (_, index) => (index * 2654435761) >>> 0),
];

test('2,925 C/Wasm cases agree with Node SHA-256 across 25 seeds', () => {
  for (const seed of seeds) {
    const cases = buildCases(core, seed);
    assert.equal(cases.length, 117);
    assert.equal(new Set(cases.map((test) => test.id)).size, 117);
    for (const test of cases) {
      const expected = createHash('sha256').update(test.input).digest('hex');
      assert.equal(test.expectedHex, expected, `Seed ${seed}, ${test.id}`);
    }
  }
});

test('the same seed recreates identical random inputs', () => {
  const first = buildCases(core, 42).slice(85);
  const second = buildCases(core, 42).slice(85);
  assert.deepEqual(first, second);
});

test('invalid seeds are rejected before entering WebAssembly', () => {
  for (const seed of [-1, 0x100000000, 1.5, NaN, Infinity])
    assert.throws(() => buildCases(core, seed));
});

test('correct browser hashing passes, and the zero-byte fault is detected', async () => {
  const cases = buildCases(core, 42);
  const correct = await runExperiment(cases, 42, 'correct');
  assert.equal(countResults(correct).passed, 117);
  const faulty = await runExperiment(cases, 42, 'nul');
  assert.equal(faulty.results[4].status, 'mismatch');
  assert.equal(faulty.results[4].inputHex, '00');
  assert.equal(faulty.results[4].actualHex, cases[0].expectedHex);
  const imported = parseReport(exportReport(faulty), 'browser.json');
  assert.deepEqual(countResults(imported), countResults(faulty));
});

test('dropping the final byte fails every nonempty test', async () => {
  const report = await runExperiment(buildCases(core, 42), 42, 'drop-last');
  for (const result of report.results)
    assert.equal(result.status, result.inputBytes === 0 ? 'pass' : 'mismatch');
});

test('the bit fault differs by exactly one bit in every test', async () => {
  const report = await runExperiment(buildCases(core, 42), 42, 'flip-bit');
  assert.equal(countResults(report).mismatches, 117);
  for (const result of report.results)
    assert.equal(differentBits(result.expectedHex, result.actualHex!).filter(Boolean).length, 1);
});
