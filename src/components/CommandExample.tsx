import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

type Token = { kind: 'command' | 'option' | 'path' | 'punctuation'; text: string };

const lines: Token[][] = [
  [
    { kind: 'command', text: 'mkdir' },
    { kind: 'option', text: ' -p' },
    { kind: 'path', text: ' reports' },
  ],
  [
    { kind: 'command', text: './build/hashprobe check' },
    { kind: 'punctuation', text: ' \\' },
  ],
  [
    { kind: 'option', text: '  --report' },
    { kind: 'path', text: ' reports/check.json' },
    { kind: 'punctuation', text: ' \\' },
  ],
  [
    { kind: 'punctuation', text: '  --' },
    { kind: 'path', text: ' ./build/sha256-target' },
  ],
];

function Command({ lines, label }: { lines: Token[][]; label: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const text = lines.map((line) => line.map((token) => token.text).join('')).join('\n');

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFailed(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="command-snippet">
      <pre>
        <code>
          {lines.map((line, index) => (
            <span key={index}>
              {line.map((token, position) => (
                <span className={`code-${token.kind}`} key={position}>
                  {token.text}
                </span>
              ))}
              {index < lines.length - 1 ? '\n' : ''}
            </span>
          ))}
        </code>
      </pre>
      <button className="icon-button" type="button" onClick={copy} aria-label={label} title={label}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      {failed && <p className="field-error">Select and copy this command.</p>}
    </div>
  );
}

export function CommandExample() {
  return (
    <div className="command-list">
      <Command lines={lines.slice(0, 1)} label="Copy directory command" />
      <Command lines={lines.slice(1)} label="Copy Hashprobe command" />
    </div>
  );
}
