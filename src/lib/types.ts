export type TestStatus = 'pending' | 'pass' | 'mismatch' | 'error';
export type Fault = 'nul' | 'drop-last' | 'flip-bit' | 'correct';

export interface TestResult {
  id: string;
  category: string;
  inputBytes: number;
  expectedHex: string;
  actualHex: string | null;
  status: TestStatus;
  inputHex?: string;
  previewHex?: string;
  error?: string;
  durationMs?: number;
}

export interface Report {
  label: string;
  origin: 'demo' | 'file';
  complete: boolean;
  planned: number;
  results: TestResult[];
  target: string;
  seed?: number;
  startedAt?: string;
  interrupted?: boolean;
}

export interface TestCase {
  id: string;
  category: string;
  input: Uint8Array<ArrayBuffer>;
  expectedHex: string;
}

export const FAULTS: Record<Fault, { name: string; description: string; code: string }> = {
  nul: {
    name: 'Stops at a zero byte',
    description:
      'Binary data can contain zero bytes. Treating it as a C string silently cuts the input short.',
    code: 'sha256(input, strlen(input), output);',
  },
  'drop-last': {
    name: 'Drops the last byte',
    description:
      'An off-by-one length loses the last byte. The empty input still passes; other inputs reveal the bug.',
    code: 'sha256(input, length ? length - 1 : 0, output);',
  },
  'flip-bit': {
    name: 'Flips one output bit',
    description:
      'The hash is calculated correctly, then one bit is changed. A single wrong bit is enough to fail.',
    code: 'output[0] ^= 0x01;',
  },
  correct: {
    name: 'Correct implementation',
    description:
      'The complete input reaches SHA-256. Every returned bit should match the reference.',
    code: 'sha256(input, length, output);',
  },
};
