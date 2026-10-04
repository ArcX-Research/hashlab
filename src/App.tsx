import { useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Code2,
  Download,
  FileJson,
  Hash,
  LockKeyhole,
  X,
} from 'lucide-react';
import { Inspector } from './components/Inspector';
import { ExperimentControls, ReportControls } from './components/LabControls';
import { ProjectGuide } from './components/ProjectGuide';
import { ReportPlaceholder, ReportSummary } from './components/SavedReport';
import { TestMap } from './components/TestMap';
import { ThemeSwitch } from './components/ThemeSwitch';
import { countResults, exportReport } from './lib/report';
import { FAULTS } from './lib/types';
import { useExperiment } from './useExperiment';
import { useReports } from './useReports';

const REPOSITORY = 'https://github.com/ArcX-Research/hashprobe';

export function App() {
  const lab = useExperiment();
  const [mode, setMode] = useState<'experiment' | 'report'>('experiment');
  const [selected, setSelected] = useState(4);
  const {
    report: imported,
    baseline,
    error: fileError,
    reading,
    open: readReports,
    clearError,
  } = useReports();
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const baselineInput = useRef<HTMLInputElement>(null);
  const report = mode === 'experiment' ? lab.report : imported;
  const counts = report ? countResults(report) : null;
  const index = Math.min(selected, Math.max(0, (report?.results.length ?? 1) - 1));

  async function openFiles(files: File[], asBaseline = false) {
    if (!files.length) return;
    setMode('report');
    const latest = await readReports(files, asBaseline);
    if (latest) {
      const firstFailure = latest.results.findIndex((test) => test.status !== 'pass');
      setSelected(Math.max(0, firstFailure));
    }
  }

  function download() {
    if (!report || !report.complete || report.origin !== 'demo') return;
    const url = URL.createObjectURL(new Blob([exportReport(report)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `hashprobe-lab-${lab.fault}-${report.seed}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <a className="skip-link" href="#lab">
        Skip to the lab
      </a>
      <div className="page-shell">
        <header className="site-header">
          <a className="brand" href="#" aria-label="Hashprobe Lab home">
            <span className="brand-mark">
              <Hash size={24} strokeWidth={1.7} />
            </span>
            <span>hashprobe</span>
          </a>
          <div className="header-actions">
            <nav aria-label="Main navigation">
              <a href="#how-it-works">How it works</a>
              <a className="repo-link" href={REPOSITORY} target="_blank" rel="noreferrer">
                <Code2 size={16} />
                Source code
                <ArrowUpRight size={14} />
              </a>
            </nav>
            <ThemeSwitch />
          </div>
        </header>

        <main>
          <section className="introduction" aria-labelledby="page-title">
            <h1 id="page-title">SHA-256 correctness lab</h1>
            <p>Compare hashes, inspect failing inputs, and review your test reports.</p>
            <a
              className="verification-badge"
              href="https://m8ven.ai/mcp/arcx-research-hashprobe-d02ezj"
              target="_blank"
              rel="noreferrer"
              aria-label="M8ven verified — view Hashprobe's publisher listing"
              title="View Hashprobe's publisher verification on M8ven"
            >
              <BadgeCheck size={16} aria-hidden="true" />
              M8ven verified
              <ArrowUpRight size={12} aria-hidden="true" />
            </a>
          </section>

          <section id="lab" className="lab-section" aria-label="SHA-256 workbench">
            <div className="lab-tabs-row">
              <div className="lab-tabs" role="group" aria-label="Lab mode">
                <button
                  type="button"
                  className={mode === 'experiment' ? 'active' : ''}
                  aria-pressed={mode === 'experiment'}
                  onClick={() => {
                    setMode('experiment');
                    setSelected(4);
                  }}
                >
                  <Code2 size={16} />
                  Live experiment
                </button>
                <button
                  type="button"
                  className={mode === 'report' ? 'active' : ''}
                  aria-pressed={mode === 'report'}
                  onClick={() => {
                    setMode('report');
                    setSelected(0);
                  }}
                >
                  <FileJson size={16} />
                  Open a report
                </button>
              </div>
              <span className="local-note">
                <LockKeyhole size={12} />
                Stays in your browser
              </span>
            </div>

            <div
              className={`workbench ${dragging ? 'dragging' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(event) => {
                if (
                  !(event.relatedTarget instanceof Node) ||
                  !event.currentTarget.contains(event.relatedTarget)
                )
                  setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void openFiles(Array.from(event.dataTransfer.files));
              }}
            >
              <div className="workbench-toolbar">
                {mode === 'experiment' ? (
                  <ExperimentControls
                    lab={lab}
                    onRun={() => {
                      setSelected(4);
                      void lab.run();
                    }}
                  />
                ) : (
                  <ReportControls
                    report={imported}
                    reading={reading}
                    onOpen={() => fileInput.current?.click()}
                    onCompare={() => baselineInput.current?.click()}
                  />
                )}
              </div>

              {mode === 'experiment' && (!lab.validSeed || lab.error) && (
                <div className="notice error" id="seed-error" role="alert">
                  {!lab.validSeed ? 'Use a whole-number seed from 0 to 4294967295.' : lab.error}
                </div>
              )}
              {mode === 'report' && fileError && (
                <div className="notice error" role="alert">
                  <span>{fileError}</span>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={clearError}
                    aria-label="Dismiss error"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {mode === 'report' && !imported ? (
                <ReportPlaceholder reading={reading} onOpen={() => fileInput.current?.click()} />
              ) : (
                <div className="workbench-body">
                  <div className="results-column">
                    <TestMap
                      report={report}
                      selected={index}
                      onSelect={setSelected}
                      phase={mode === 'experiment' ? lab.phase : 'saved'}
                    />
                    {mode === 'experiment' &&
                      lab.fault !== 'correct' &&
                      counts &&
                      counts.mismatches > 0 &&
                      !lab.busy && (
                        <div className="result-actions">
                          <button
                            type="button"
                            className="text-link"
                            onClick={() => {
                              setSelected(4);
                              void lab.run('correct');
                            }}
                          >
                            Try the correct version <ArrowRight size={14} />
                          </button>
                        </div>
                      )}
                    {mode === 'report' && imported && (
                      <ReportSummary report={imported} baseline={baseline} />
                    )}
                  </div>
                  <Inspector
                    key={`${mode}-${index}-${report?.label}`}
                    test={report?.results[index]}
                    index={index}
                    saved={mode === 'report'}
                  />
                </div>
              )}

              <div className="workbench-footer">
                {mode === 'experiment' ? (
                  <details className="experiment-details" key={lab.fault}>
                    <summary>About this demo</summary>
                    <p>{FAULTS[lab.fault].description}</p>
                    <code>{FAULTS[lab.fault].code}</code>
                    <p>
                      Illustrative C code. The demo applies this behavior to browser SHA-256 and
                      compares it with Hashprobe’s C reference.
                    </p>
                  </details>
                ) : (
                  <span>Saved results · not a live run</span>
                )}
                {mode === 'experiment' && lab.report?.complete && (
                  <button type="button" className="text-link" onClick={download}>
                    <Download size={14} />
                    Save report
                  </button>
                )}
              </div>
            </div>
          </section>

          <ProjectGuide repository={REPOSITORY} />
        </main>

        <footer className="site-footer">
          <div>
            <a
              className="footer-brand"
              href="https://dilate.co.ke/"
              target="_blank"
              rel="noreferrer"
            >
              dilate<span>↗</span>
            </a>
          </div>
          <p>SHA-256 implementation testing</p>
          <a href={`${REPOSITORY}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
            Open source · MIT <ArrowUpRight size={12} />
          </a>
        </footer>
      </div>
      <input
        ref={fileInput}
        hidden
        className="visually-hidden"
        type="file"
        accept=".json,application/json"
        multiple
        tabIndex={-1}
        aria-label="Choose Hashprobe reports"
        onChange={(event) => {
          void openFiles(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
      <input
        ref={baselineInput}
        hidden
        className="visually-hidden"
        type="file"
        accept=".json,application/json"
        tabIndex={-1}
        aria-label="Choose earlier report"
        onChange={(event) => {
          void openFiles(Array.from(event.target.files ?? []), true);
          event.target.value = '';
        }}
      />
    </>
  );
}
