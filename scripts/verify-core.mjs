import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export function digest(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function verifySources() {
  const source = JSON.parse(readFileSync('vendor/hashprobe/source.json', 'utf8'));
  for (const [path, expected] of Object.entries(source.files)) {
    if (digest(`vendor/hashprobe/${path}`) !== expected) {
      throw new Error(`The pinned Hashprobe source changed: ${path}`);
    }
  }
  return source;
}

verifySources();
if (!process.argv.includes('--sources-only')) {
  const build = JSON.parse(readFileSync('public/wasm/build.json', 'utf8'));
  for (const [path, expected] of Object.entries(build.files)) {
    if (digest(path) !== expected) throw new Error(`${path} changed. Run make wasm.`);
  }
  console.log('Pinned C sources and WebAssembly build match.');
}
