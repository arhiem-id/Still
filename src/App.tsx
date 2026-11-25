import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { StillApp } from './components/StillApp';

type ThemePreference = 'system' | 'light' | 'dark';

export default function App() {
  const [themePref, setThemePref] = useState<ThemePreference>('system');

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const shouldUseDark =
        themePref === 'dark' || (themePref === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', shouldUseDark);
    };

    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [themePref]);

  const cycleTheme = () => {
    setThemePref((prev) =>
      prev === 'system' ? 'light' : prev === 'light' ? 'dark' : 'system'
    );
  };

  const themeLabel =
    themePref === 'system'
      ? 'System'
      : themePref === 'light'
      ? 'Light'
      : 'Dark';

  const ThemeIcon =
    themePref === 'system' ? Monitor : themePref === 'light' ? Sun : Moon;

  return (
    <div className="min-h-screen w-full bg-[#DED7CA] dark:bg-[#10100F] text-still-ink dark:text-still-paper transition-colors duration-200 flex flex-col items-center justify-center sm:py-4 sm:px-4">
      {/* Unobtrusive Android Device Theme Toggle (Desktop/Preview convenience) */}
      <button
        type="button"
        onClick={cycleTheme}
        title="Switch Android System / Light / Dark theme"
        className="fixed top-4 right-4 z-50 hidden sm:inline-flex items-center gap-2 px-3 py-2 bg-still-paper/90 dark:bg-still-ink/90 border border-hairline-light dark:border-hairline-dark hover:border-still-ink dark:hover:border-still-paper text-[11px] font-mono tracking-[0.08em] uppercase transition-colors cursor-pointer"
      >
        <ThemeIcon className="w-3.5 h-3.5 text-still-taupe" strokeWidth={1.6} />
        <span>{themeLabel}</span>
      </button>

      {/* Focused Android Portrait Viewport (Full-screen on mobile, crisp Pixel 412dp viewport on desktop) */}
      <div className="w-full h-screen sm:h-[min(850px,calc(100vh-32px))] sm:max-w-[412px] sm:border sm:border-hairline-light sm:dark:border-hairline-dark overflow-hidden">
        <StillApp />
      </div>
    </div>
  );
}
