import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const compiler = process.env.EMCC || 'emcc';
const source = JSON.parse(readFileSync('vendor/hashprobe/source.json', 'utf8'));
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
for (const [path, expected] of Object.entries(source.files)) {
  if (digest(`vendor/hashprobe/${path}`) !== expected) throw new Error(`Source changed: ${path}`);
}
mkdirSync('public/wasm', { recursive: true });
const functions = [
  'lab_build',
  'lab_input',
  'lab_length',
  'lab_expected',
  'lab_id',
  'lab_category',
  'lab_free',
];
const args = [
  'wasm/bridge.c',
  'vendor/hashprobe/src/suite.c',
  'vendor/hashprobe/src/reference/sha256.c',
  '-Ivendor/hashprobe/src',
  '-Ivendor/hashprobe/vendor/cjson',
  '-std=c11',
  '-Wall',
  '-Wextra',
  '-Werror',
  '-O3',
  '-sMODULARIZE=1',
  '-sEXPORT_ES6=1',
  '-sENVIRONMENT=web,worker,node',
  '-sFILESYSTEM=0',
  '-sALLOW_MEMORY_GROWTH=1',
  '-sMAXIMUM_MEMORY=33554432',
  '-sDYNAMIC_EXECUTION=0',
  `-sEXPORTED_FUNCTIONS=${JSON.stringify(functions.map((name) => `_${name}`))}`,
  '-sEXPORTED_RUNTIME_METHODS=["UTF8ToString","HEAPU8"]',
  '-o',
  'public/wasm/hashprobe.js',
];
const result = spawnSync(compiler, args, { stdio: 'inherit' });
if (result.error)
  throw new Error('Emscripten was not found. Install it or set EMCC to its emcc path.', {
    cause: result.error,
  });
if (result.status !== 0) process.exit(result.status || 1);
const version = spawnSync(compiler, ['--version'], { encoding: 'utf8' }).stdout.split('\n')[0];
const files = Object.fromEntries(
  [
    'wasm/bridge.c',
    'scripts/build-wasm.mjs',
    'public/wasm/hashprobe.js',
    'public/wasm/hashprobe.wasm',
  ].map((path) => [path, digest(path)]),
);
writeFileSync(
  'public/wasm/build.json',
  `${JSON.stringify({ compiler: version, upstream: source.commit, files }, null, 2)}\n`,
);
console.log('Built the Hashprobe C test suite for the browser.');
