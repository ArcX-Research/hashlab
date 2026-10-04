import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeSwitch() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');

  useEffect(() => {
    const theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#090d12' : '#ffffff');
    try {
      localStorage.setItem('hashlab-theme', theme);
    } catch {
      // Theme switching still works when browser storage is unavailable.
    }
  }, [dark]);

  return (
    <button
      type="button"
      className="theme-switch"
      role="switch"
      aria-label="Dark mode"
      aria-checked={dark}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setDark((value) => !value)}
    >
      <span className="theme-thumb" />
      <Sun size={14} aria-hidden="true" />
      <Moon size={14} aria-hidden="true" />
    </button>
  );
}
