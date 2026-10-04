import { buildCases } from './lib/core.ts';
import { previewReport, runExperiment } from './lib/experiment.ts';
import { MAX_REPORT_BYTES, parseReport } from './lib/report.ts';
import type { LabRequest } from './lib/worker-client.ts';
import type { WasmCore } from './lib/core.ts';

self.onmessage = async (event: MessageEvent<LabRequest>) => {
  try {
    const request = event.data;
    if (request.action === 'read') {
      if (request.file.size > MAX_REPORT_BYTES)
        throw new Error('Choose a report smaller than 40 MiB.');
      const report = parseReport(await request.file.text(), request.file.name);
      self.postMessage({ report });
      return;
    }
    const moduleUrl = new URL(`${import.meta.env.BASE_URL}wasm/hashprobe.js`, self.location.origin)
      .href;
    const { default: createCore } = await import(/* @vite-ignore */ moduleUrl);
    const core: WasmCore = await createCore();
    const cases = buildCases(core, request.seed);
    const report =
      request.action === 'prepare'
        ? previewReport(cases, request.seed)
        : await runExperiment(cases, request.seed, request.fault);
    self.postMessage({ report });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : 'Unable to read this report.',
    });
  }
};
