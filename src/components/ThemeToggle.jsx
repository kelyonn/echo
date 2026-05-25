import { RiMoonFill, RiSunLine } from 'react-icons/ri';
import { useEffect, useState } from 'react';

const ThemeToggle = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {}
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <button
      aria-label="theme toggle"
      onClick={toggle}
      className="p-2 rounded-md hover:bg-white/5 transition"
    >
      {theme === 'light' ? <RiMoonFill size={18} /> : <RiSunLine size={18} />}
    </button>
  );
};

export default ThemeToggle;
