import { Check, Copy, Minus, X } from 'lucide-react';
import { useState } from 'react';
import { describeInput, differentBits } from '../lib/bytes';
import type { TestResult } from '../lib/types';

function Digest({
  value,
  expected,
  full = false,
}: {
  value: string;
  expected?: string;
  full?: boolean;
}) {
  return (
    <code className="hash-value">
      <span className="visually-hidden">{value}</span>
      {Array.from(value, (character, index) => {
        if (!full && index >= 16 && index < 56)
          return index === 16 ? (
            <span key="ellipsis" aria-hidden="true">
              …
            </span>
          ) : null;
        return (
          <span
            aria-hidden="true"
            className={expected && character !== expected[index] ? 'different-digit' : ''}
            key={index}
          >
            {character}
          </span>
        );
      })}
    </code>
  );
}

export function Inspector({
  test,
  index,
  saved,
}: {
  test?: TestResult;
  index: number;
  saved: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const bits = test?.actualHex ? differentBits(test.expectedHex, test.actualHex) : null;
  const differences = bits?.filter(Boolean).length;
  const bytes = test?.inputHex ?? test?.previewHex;
  const status = test?.status ?? 'pending';

  async function copyInput() {
    if (test?.inputHex === undefined) return;
    try {
      await navigator.clipboard.writeText(test.inputHex);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <aside className="inspector" aria-label="Selected test">
      <div className="inspector-heading">
        <span className="eyebrow">INPUT {String(index + 1).padStart(3, '0')}</span>
        <span className={`result-badge ${status}`}>
          {status === 'pass' ? (
            <Check size={12} />
          ) : status === 'mismatch' || status === 'error' ? (
            <X size={12} />
          ) : (
            <Minus size={12} />
          )}
          {status === 'pending'
            ? 'Not run'
            : status === 'pass'
              ? 'Match'
              : status === 'mismatch'
                ? 'Mismatch'
                : 'Error'}
        </span>
      </div>
      <h3>{test ? describeInput(test.id, test.inputBytes) : 'Select an input'}</h3>
      <div className="input-sample">
        <code>
          {!test
            ? 'Waiting for the test suite…'
            : test.inputBytes === 0
              ? '(empty)'
              : bytes !== undefined
                ? bytes
                    .slice(0, 48)
                    .match(/.{1,2}/g)
                    ?.join(' ')
                : 'Input bytes were not saved.'}
          {bytes !== undefined && test && test.inputBytes > 24 ? ' …' : ''}
        </code>
        {test?.inputHex !== undefined && (
          <button
            type="button"
            className="icon-button"
            onClick={copyInput}
            aria-label="Copy full input as hex"
            title="Copy full input as hex"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}
      </div>
      {copyError && (
        <p className="field-error">Clipboard unavailable. Download the report to get the input.</p>
      )}
      <div className="input-meta">
        <span>
          {test?.inputBytes.toLocaleString() ?? '—'} {test?.inputBytes === 1 ? 'byte' : 'bytes'}
        </span>
        <span>hex</span>
      </div>
      <div className="digest-pair">
        <div className="digest-row">
          <div className="digest-label">Expected</div>
          {test ? (
            <Digest value={test.expectedHex} />
          ) : (
            <div className="hash-placeholder">Loading</div>
          )}
        </div>
        <div className={`digest-row actual ${status}`}>
          <div className="digest-label">{saved ? 'Reported' : 'Actual'}</div>
          {test?.actualHex ? (
            <Digest value={test.actualHex} expected={test.expectedHex} />
          ) : (
            <div className="hash-placeholder">
              {status === 'error' ? 'No hash returned' : 'Not run'}
            </div>
          )}
        </div>
      </div>
      <div className="bit-panel">
        <div className="bit-grid" aria-hidden="true">
          {Array.from({ length: 256 }, (_, bit) => (
            <span key={bit} className={bits ? (bits[bit] ? 'changed' : 'same') : ''} />
          ))}
        </div>
        <div className="bit-caption">
          <strong>
            {differences ?? '—'}
            <span> / 256</span>
          </strong>
          <span>bits differ</span>
        </div>
      </div>
      {test?.error && <p className="inspector-error">{test.error}</p>}
      {test && (
        <details className="hash-details">
          <summary>Full hashes</summary>
          <div className="digest-label">Expected</div>
          <Digest value={test.expectedHex} full />
          {test.actualHex && (
            <>
              <div className="digest-label">{saved ? 'Reported' : 'Actual'}</div>
              <Digest value={test.actualHex} expected={test.expectedHex} full />
            </>
          )}
          <code className="test-id">{test.id}</code>
        </details>
      )}
    </aside>
  );
}
