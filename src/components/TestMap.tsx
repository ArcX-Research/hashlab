import { describeInput } from '../lib/bytes';
import { countResults } from '../lib/report';
import type { Report } from '../lib/types';

function resultTitle(
  report: Report | null,
  counts: ReturnType<typeof countResults>,
  phase: string,
) {
  if (phase === 'computing') return 'Calculating hashes';
  if (phase === 'playback') return 'Showing the results';
  if (phase === 'saved' && !report?.complete) return 'This run is incomplete';
  if (!counts.executed) return phase === 'saved' ? 'No tests recorded' : 'Ready to test';
  if (!report?.complete) return 'This run is incomplete';
  if (counts.errors) return 'Some checks could not finish';
  if (counts.mismatches) {
    const noun = counts.mismatches === 1 ? 'hash' : 'hashes';
    return `${counts.mismatches} wrong ${noun} found`;
  }
  return 'Every hash matches';
}

export function TestMap({
  report,
  selected,
  onSelect,
  phase,
}: {
  report: Report | null;
  selected: number;
  onSelect: (index: number) => void;
  phase: string;
}) {
  const counts = report
    ? countResults(report)
    : { passed: 0, mismatches: 0, errors: 0, executed: 0, pending: 117 };
  const planned = report?.planned ?? 117;

  return (
    <div className="test-map">
      <div className="map-heading">
        <span className="eyebrow">TEST RESULTS</span>
        <span className="map-progress">
          {counts.executed} <span>/ {planned} checked</span>
        </span>
      </div>
      <h2 aria-live="polite" aria-atomic="true">
        {resultTitle(report, counts, phase)}
      </h2>
      <div className="test-grid" role="group" aria-label="Test inputs">
        {Array.from({ length: planned }, (_, index) => {
          const test = report?.results[index];
          const status = test?.status ?? 'pending';
          return (
            <button
              key={test?.id ?? index}
              type="button"
              className={`test-cell ${status} ${index === selected && test ? 'selected' : ''}`}
              disabled={!test}
              aria-pressed={index === selected && Boolean(test)}
              onClick={() => onSelect(index)}
              aria-label={`Test ${index + 1}: ${test ? describeInput(test.id, test.inputBytes) : 'Input not recorded'}, ${status === 'pending' ? 'not run' : status}`}
              title={test ? `${test.id} · ${status}` : 'Not run'}
            >
              <span>{String(index + 1).padStart(3, '0')}</span>
            </button>
          );
        })}
      </div>
      <div className="map-legend">
        <span>
          <i className="legend-dot pass" />
          {counts.passed} match
        </span>
        <span>
          <i className="legend-dot mismatch" />
          {counts.mismatches} differ
        </span>
        {counts.errors > 0 && (
          <span>
            <i className="legend-dot error" />
            {counts.errors} errors
          </span>
        )}
        {counts.pending > 0 && (
          <span>
            <i className="legend-dot pending" />
            {counts.pending} not run
          </span>
        )}
      </div>
    </div>
  );
}
