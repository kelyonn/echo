import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';

const STATUS = {
  success: {
    light: { bg: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', title: '#065f46', desc: '#047857', icon: '✓' },
    dark:  { bg: 'rgba(16,185,129,0.1)',  border: '1px solid rgba(16,185,129,0.3)',  title: '#6ee7b7', desc: '#34d399', icon: '✓' },
  },
  error: {
    light: { bg: 'rgba(239,68,68,0.1)',   border: '1px solid rgba(239,68,68,0.3)',   title: '#991b1b', desc: '#b91c1c', icon: '✕' },
    dark:  { bg: 'rgba(239,68,68,0.1)',   border: '1px solid rgba(239,68,68,0.28)',  title: '#fca5a5', desc: '#f87171', icon: '✕' },
  },
  warning: {
    light: { bg: 'rgba(245,158,11,0.1)',  border: '1px solid rgba(245,158,11,0.3)', title: '#78350f', desc: '#92400e', icon: '!' },
    dark:  { bg: 'rgba(245,158,11,0.1)',  border: '1px solid rgba(245,158,11,0.28)',title: '#fcd34d', desc: '#fbbf24', icon: '!' },
  },
  info: {
    light: { bg: 'rgba(99,102,241,0.1)',  border: '1px solid rgba(99,102,241,0.3)', title: '#312e81', desc: '#3730a3', icon: 'i' },
    dark:  { bg: 'rgba(99,102,241,0.1)',  border: '1px solid rgba(99,102,241,0.28)',title: '#a5b4fc', desc: '#818cf8', icon: 'i' },
  },
};

export default function ToastHost() {
  const { toasts, removeToast } = useToast();
  const [dark, setDark] = useState(
    () => document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (!toasts.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {toasts.map((toast) => {
        const s = (STATUS[toast.status] || STATUS.info)[dark ? 'dark' : 'light'];
        const textPrimary = dark ? '#eef2ff' : '#111827';
        return (
          <div
            key={toast.id}
            style={{
              minWidth: 260,
              maxWidth: 340,
              background: dark
                ? `rgba(10,16,26,0.82)`
                : `rgba(255,255,255,0.72)`,
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: s.border,
              borderRadius: 16,
              padding: '14px 16px',
              boxShadow: dark
                ? '0 8px 32px rgba(0,0,0,0.35)'
                : '0 8px 32px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            {/* Status icon */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: s.border,
                background: s.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: s.title,
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {s.icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {toast.title && (
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: s.title,
                    lineHeight: 1.4,
                    marginBottom: toast.description ? 3 : 0,
                  }}
                >
                  {toast.title}
                </div>
              )}
              {toast.description && (
                <div
                  style={{
                    fontSize: 12,
                    color: dark ? 'rgba(238,242,255,0.55)' : 'rgba(17,24,39,0.55)',
                    lineHeight: 1.5,
                  }}
                >
                  {toast.description}
                </div>
              )}
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                color: dark ? 'rgba(238,242,255,0.35)' : 'rgba(17,24,39,0.3)',
                padding: 0,
                lineHeight: 1,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
