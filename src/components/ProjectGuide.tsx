import { ArrowUpRight } from 'lucide-react';
import { CommandExample } from './CommandExample';

export function ProjectGuide({ repository }: { repository: string }) {
  return (
    <section className="guide-section" id="how-it-works" aria-labelledby="guide-title">
      <div className="guide-header">
        <h2 id="guide-title">Test your own implementation</h2>
        <a
          href={`${repository}#get-started`}
          className="text-link"
          target="_blank"
          rel="noreferrer"
        >
          Get Hashprobe <ArrowUpRight size={15} />
        </a>
      </div>
      <div className="guide-body">
        <ol className="guide-steps">
          <li>
            <h3>Test inputs</h3>
            <p>Known SHA-256 examples, boundary lengths, and repeatable random inputs.</p>
          </li>
          <li>
            <h3>Hash comparison</h3>
            <p>Each 256-bit output is compared with Hashprobe’s reference result.</p>
          </li>
          <li>
            <h3>Reproducible results</h3>
            <p>Reports save failing inputs so the same cases can be tested after a fix.</p>
          </li>
        </ol>
        <div className="command-card">
          <div className="command-heading">
            <span>IN YOUR HASHPROBE DIRECTORY</span>
          </div>
          <CommandExample />
          <p>
            Runs the included example. For your project, use a program that reads input bytes and
            prints their SHA-256 hash.{' '}
            <a href={`${repository}#test-your-own-program`} target="_blank" rel="noreferrer">
              Connect your code <ArrowUpRight size={12} />
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
