import { toHex } from './bytes.ts';
import type { TestCase } from './types.ts';

export interface WasmCore {
  HEAPU8: Uint8Array<ArrayBuffer>;
  UTF8ToString(pointer: number): string;
  _lab_build(seed: number): number;
  _lab_input(index: number): number;
  _lab_length(index: number): number;
  _lab_expected(index: number): number;
  _lab_id(index: number): number;
  _lab_category(index: number): number;
  _lab_free(): void;
}

export function buildCases(core: WasmCore, seed: number): TestCase[] {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error('Choose a whole-number seed from 0 to 4294967295.');
  const count = core._lab_build(seed);
  if (count !== 117) throw new Error('The C reference did not pass its self-check.');
  try {
    return Array.from({ length: count }, (_, index) => {
      const inputStart = core._lab_input(index);
      const hashStart = core._lab_expected(index);
      return {
        id: core.UTF8ToString(core._lab_id(index)),
        category: core.UTF8ToString(core._lab_category(index)),
        input: core.HEAPU8.slice(inputStart, inputStart + core._lab_length(index)),
        expectedHex: toHex(core.HEAPU8.subarray(hashStart, hashStart + 32)),
      };
    });
  } finally {
    core._lab_free();
  }
}
