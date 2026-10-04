import { ChevronDown, FileUp, LoaderCircle, Play } from 'lucide-react';
import { FAULTS } from '../lib/types';
import type { Fault, Report } from '../lib/types';
import type { useExperiment } from '../useExperiment';

const RUN_LABELS = {
  loading: 'Loading tests',
  computing: 'Calculating',
  playback: 'Showing results',
  ready: 'Run 117 tests',
  complete: 'Run 117 tests',
  error: 'Run 117 tests',
};

export function ExperimentControls({
  lab,
  onRun,
}: {
  lab: ReturnType<typeof useExperiment>;
  onRun: () => void;
}) {
  const waiting = lab.busy || lab.phase === 'loading';

  return (
    <>
      <label className="experiment-control">
        <span className="eyebrow">DEMO TARGET</span>
        <span className="select-wrap">
          <select
            value={lab.fault}
            onChange={(event) => lab.setFault(event.target.value as Fault)}
            disabled={lab.busy}
            aria-label="Demo target"
          >
            {Object.entries(FAULTS).map(([value, choice]) => (
              <option value={value} key={value}>
                {choice.name}
              </option>
            ))}
          </select>
          <ChevronDown className="select-chevron" size={16} aria-hidden="true" />
        </span>
      </label>
      <label className="seed-control">
        <span className="eyebrow">SEED</span>
        <input
          aria-label="Random seed"
          aria-invalid={!lab.validSeed}
          aria-describedby={!lab.validSeed ? 'seed-error' : undefined}
          inputMode="numeric"
          value={lab.seed}
          onChange={(event) => lab.setSeed(event.target.value)}
          disabled={lab.busy}
          maxLength={10}
        />
      </label>
      <button
        type="button"
        className="button primary run-button"
        disabled={waiting || !lab.validSeed || !lab.report}
        onClick={onRun}
      >
        {waiting ? (
          <LoaderCircle size={15} className="spinning" />
        ) : (
          <Play size={14} fill="currentColor" />
        )}
        {RUN_LABELS[lab.phase]}
      </button>
    </>
  );
}

export function ReportControls({
  report,
  reading,
  onOpen,
  onCompare,
}: {
  report: Report | null;
  reading: boolean;
  onOpen: () => void;
  onCompare: () => void;
}) {
  return (
    <>
      <div className="report-heading">
        <span className="eyebrow">SAVED RUN</span>
        <strong title={report?.label}>
          {reading ? 'Reading report…' : report?.label || 'No report selected'}
        </strong>
      </div>
      {report && (
        <button
          type="button"
          className="button secondary compare-button"
          disabled={reading}
          onClick={onCompare}
        >
          Compare earlier run
        </button>
      )}
      <button type="button" className="button primary" disabled={reading} onClick={onOpen}>
        {reading ? <LoaderCircle size={16} className="spinning" /> : <FileUp size={16} />}
        Open JSON
      </button>
    </>
  );
}
