import { ArrowRight, FileJson } from 'lucide-react';
import { compareReports } from '../lib/report';
import type { Report } from '../lib/types';

export function ReportPlaceholder({ reading, onOpen }: { reading: boolean; onOpen: () => void }) {
  return (
    <div className="report-empty">
      <div className="file-orbit">
        <FileJson size={32} strokeWidth={1.2} />
        <span />
      </div>
      <h2>Open a Hashprobe report</h2>
      <p>
        Drop a Hashprobe JSON report here.
        <br />
        Your file is read locally. Nothing is uploaded.
      </p>
      <button type="button" className="button secondary" onClick={onOpen} disabled={reading}>
        Choose a report <ArrowRight size={15} />
      </button>
      <span className="empty-hint">Two reports? Drop the earlier run first to compare.</span>
    </div>
  );
}

export function ReportSummary({ report, baseline }: { report: Report; baseline: Report | null }) {
  const comparison = baseline ? compareReports(baseline, report) : null;
  return (
    <div className="report-detail">
      <span className="eyebrow">TESTED PROGRAM</span>
      <code title={report.target}>{report.target}</code>
      <p>
        {report.complete
          ? 'All planned checks were recorded.'
          : 'Coverage is incomplete. Unchecked inputs cannot be counted as passes.'}{' '}
        Saved results are shown as reported; this view does not rerun the program.
      </p>
      {comparison && (
        <div className="comparison">
          <div>
            <span className="eyebrow">COMPARED WITH</span>
            <span className="baseline-label" title={baseline?.label}>
              {baseline?.label}
            </span>
          </div>
          <div className="comparison-counts">
            <span>
              <b>{comparison.fixed}</b> now pass
            </span>
            <span>
              <b>{comparison.regressed}</b> new failures
            </span>
            <span>
              <b>{comparison.shared}</b> shared inputs
            </span>
          </div>
          {comparison.shared === 0 && <p>These runs have no matching test inputs to compare.</p>}
        </div>
      )}
    </div>
  );
}
