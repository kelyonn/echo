import React from 'react';
import { MapPin } from 'lucide-react';
import StaticMap from './StaticMap';

export default function LocationShare({ location, dark = false }) {
  if (!location?.latitude || !location?.longitude) return null;

  const lat = location.latitude;
  const lng = location.longitude;
  const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;

  const textPrimary   = dark ? '#eef2ff' : '#111827';
  const textSecondary = dark ? 'rgba(238,242,255,0.52)' : 'rgba(17,24,39,0.48)';
  const textTertiary  = dark ? 'rgba(238,242,255,0.28)' : 'rgba(17,24,39,0.28)';

  return (
    <div
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        width: 260,
        fontFamily: "'DM Sans', sans-serif",
        border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
        boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.1)',
      }}
    >
      {/* Static tile map — no iframe chrome */}
      <StaticMap lat={lat} lng={lng} width={260} height={148} />

      {/* Info bar */}
      <div
        style={{
          padding: '10px 12px',
          background: dark ? 'rgba(10,16,26,0.85)' : 'rgba(255,255,255,0.92)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          borderTop: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <MapPin size={11} style={{ color: '#ef4444', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: textPrimary }}>Shared location</span>
          </div>
          <div style={{ fontSize: 10, color: textSecondary, fontVariantNumeric: 'tabular-nums' }}>
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>
          <div style={{ fontSize: 9, color: textTertiary, marginTop: 2 }}>
            © OpenStreetMap contributors
          </div>
        </div>

        <a
          href={mapsLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: dark ? '#60a5fa' : '#1e4aaa',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            padding: '5px 11px',
            borderRadius: 8,
            border: dark ? '1px solid rgba(96,165,250,0.3)' : '1px solid rgba(30,74,170,0.2)',
            background: dark ? 'rgba(96,165,250,0.1)' : 'rgba(30,74,170,0.06)',
            transition: 'all 0.15s ease',
          }}
        >
          Open Maps
        </a>
      </div>
    </div>
  );
}
