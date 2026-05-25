import { useState } from 'react';
import { Moon, Sun, ArrowRight } from 'lucide-react';

const Orb = ({ style }) => (
  <div
    style={{
      position: 'absolute',
      borderRadius: '50%',
      filter: 'blur(90px)',
      opacity: 0.5,
      pointerEvents: 'none',
      ...style,
    }}
  />
);

export default function Login({ onEnter, dark = false, onToggleDark }) {
  const [username, setUsername] = useState('');
  const [focused, setFocused]   = useState(false);

  const canEnter = username.trim().length >= 2;

  const bg = dark
    ? 'linear-gradient(135deg, #060910 0%, #0c1220 50%, #080f12 100%)'
    : 'linear-gradient(145deg, #dde8f6 0%, #ece6f8 50%, #d8eee8 100%)';

  const textPrimary   = dark ? '#eef2ff' : '#0f172a';
  const textMuted     = dark ? 'rgba(238,242,255,0.45)' : 'rgba(15,23,42,0.42)';
  const cardBg        = dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.58)';
  const cardBorder    = dark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.78)';
  const inputBg       = dark
    ? focused ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)'
    : focused ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.55)';
  const inputBorder   = focused
    ? dark ? 'rgba(148,163,184,0.4)' : 'rgba(30,74,170,0.28)'
    : dark ? 'rgba(255,255,255,0.1)'  : 'rgba(255,255,255,0.65)';
  const inputShadow   = focused
    ? dark ? '0 0 0 3px rgba(96,165,250,0.1)' : '0 0 0 3px rgba(30,74,170,0.07)'
    : 'none';

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
        overflow: 'hidden',
        transition: 'background 0.5s ease',
        color: textPrimary,
      }}
    >
      {/* Background orbs */}
      {dark ? (
        <>
          <Orb style={{ width: 560, height: 560, background: 'radial-gradient(circle, #1a3564 0%, transparent 70%)', top: -140, left: -100 }} />
          <Orb style={{ width: 420, height: 420, background: 'radial-gradient(circle, #0d3d28 0%, transparent 70%)', bottom: -100, right: -80 }} />
        </>
      ) : (
        <>
          <Orb style={{ width: 640, height: 640, background: 'radial-gradient(circle, #b8d4f0 0%, transparent 70%)', top: -160, left: -120 }} />
          <Orb style={{ width: 420, height: 420, background: 'radial-gradient(circle, #c4e8d8 0%, transparent 70%)', bottom: -110, right: -90 }} />
        </>
      )}

      {/* Dark mode toggle */}
      <button
        type="button"
        onClick={onToggleDark}
        title={dark ? 'Light mode' : 'Dark mode'}
        style={{
          position: 'absolute', top: 20, right: 20,
          width: 40, height: 40, borderRadius: '50%',
          border: dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.7)',
          background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.52)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          cursor: 'pointer', outline: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: textMuted, transition: 'all 0.2s ease',
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          zIndex: 10,
        }}
      >
        {dark ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      {/* Card */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 28,
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          boxShadow: dark
            ? '0 32px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)'
            : '0 24px 72px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,0.7)',
          width: '100%', maxWidth: 420,
          margin: '0 20px',
          padding: '48px 40px 40px',
          position: 'relative',
        }}
      >
        {/* Top shimmer line */}
        <div style={{
          position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
        }} />

        {/* Logo mark */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 38, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1,
            backgroundImage: dark
              ? 'linear-gradient(135deg, #e0eaff 0%, #90c4f8 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #1e4aaa 55%, #0a5e40 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Echo
          </div>
          <p style={{
            margin: '6px 0 0', fontSize: 13,
            color: textMuted, letterSpacing: '0.02em',
          }}>
            Real-time · End-to-end encrypted · No account needed
          </p>
        </div>

        {/* Divider */}
        <div style={{
          height: 1, marginBottom: 28,
          background: dark
            ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(15,23,42,0.07), transparent)',
        }} />

        {/* Label */}
        <label
          htmlFor="username-input"
          style={{
            display: 'block', fontSize: 11, fontWeight: 600,
            color: textMuted, marginBottom: 8,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}
        >
          Your name
        </label>

        {/* Input */}
        <input
          id="username-input"
          type="text"
          placeholder="e.g. sam"
          value={username}
          autoFocus
          autoComplete="off"
          onChange={e => setUsername(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => e.key === 'Enter' && canEnter && onEnter?.(username.trim())}
          style={{
            display: 'block', width: '100%', boxSizing: 'border-box',
            padding: '13px 16px',
            background: inputBg,
            border: `1px solid ${inputBorder}`,
            boxShadow: inputShadow,
            borderRadius: 12,
            fontSize: 15, color: textPrimary, outline: 'none',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'all 0.18s ease',
            marginBottom: 14,
          }}
        />

        {/* Hint text */}
        <p style={{
          margin: '0 0 20px', fontSize: 12,
          color: textMuted, lineHeight: 1.55,
        }}>
          This is your display name. Anyone on the same broker can see it.
        </p>

        {/* Submit */}
        <button
          type="button"
          onClick={() => canEnter && onEnter?.(username.trim())}
          disabled={!canEnter}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '13px 24px',
            borderRadius: 12, border: 'none',
            fontSize: 14, fontWeight: 500, letterSpacing: '0.01em',
            fontFamily: "'DM Sans', sans-serif",
            cursor: canEnter ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
            background: canEnter
              ? 'linear-gradient(135deg, #1e4aaa 0%, #0a5e40 100%)'
              : dark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.07)',
            color: canEnter ? '#fff' : textMuted,
            boxShadow: canEnter ? '0 6px 28px rgba(30,74,170,0.28)' : 'none',
          }}
        >
          {canEnter ? (
            <>Enter chat <ArrowRight size={15} /></>
          ) : (
            'Choose a name to continue'
          )}
        </button>
      </div>
    </div>
  );
}
