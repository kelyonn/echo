import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

/**
 * Catches the browser's beforeinstallprompt event and shows a subtle
 * install banner. Dismisses permanently once the user installs or closes.
 */
export default function InstallPrompt({ dark = false }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or running standalone
    if (
      localStorage.getItem('pwa_install_dismissed') ||
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    ) return;

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem('pwa_install_dismissed', '1');
  };

  if (!visible || installed) return null;

  const bg     = dark ? 'rgba(8,14,24,0.92)'      : 'rgba(255,255,255,0.94)';
  const border = dark ? 'rgba(255,255,255,0.12)'   : 'rgba(30,74,170,0.18)';
  const text   = dark ? '#eef2ff'                   : '#111827';
  const sub    = dark ? 'rgba(238,242,255,0.52)'   : 'rgba(17,24,39,0.52)';
  const accent = dark ? '#60a5fa'                   : '#1e4aaa';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        fontFamily: "'DM Sans', sans-serif",
        minWidth: 280,
        maxWidth: 360,
        animation: 'slide-up 0.25s ease',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #1e4aaa, #0a5e40)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
          <text x="256" y="370" fontFamily="Georgia, serif" fontSize="300" fontWeight="bold" fontStyle="italic" textAnchor="middle" fill="white">E</text>
        </svg>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: text }}>Install Echo</div>
        <div style={{ fontSize: 11, color: sub, marginTop: 1 }}>Add to your home screen for quick access</div>
      </div>

      {/* Install button */}
      <button
        type="button"
        onClick={handleInstall}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '7px 12px', borderRadius: 10,
          border: `1px solid ${border}`,
          background: 'linear-gradient(135deg, #1e4aaa, #0a5e40)',
          color: '#fff', cursor: 'pointer',
          fontSize: 12, fontWeight: 500,
          fontFamily: "'DM Sans', sans-serif",
          outline: 'none', flexShrink: 0,
        }}
      >
        <Download size={12} />
        Install
      </button>

      {/* Dismiss */}
      <button
        type="button"
        onClick={handleDismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: sub, padding: 2, display: 'flex', alignItems: 'center',
          flexShrink: 0, outline: 'none',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
