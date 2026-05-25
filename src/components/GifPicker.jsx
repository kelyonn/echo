import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

// Tenor public demo key — swap for your own at https://tenor.com/developer/dashboard
const TENOR_KEY = 'LIVDSRZULELA';
const TENOR_BASE = 'https://g.tenor.com/v1';

async function fetchTenor(path) {
  try {
    const res = await fetch(`${TENOR_BASE}${path}&key=${TENOR_KEY}&limit=15&contentfilter=medium&media_filter=minimal`);
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

export default function GifPicker({ onSelect, onClose, dark }) {
  const [query, setQuery]     = useState('');
  const [gifs, setGifs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);
  const inputRef    = useRef(null);

  const load = async (q) => {
    setLoading(true);
    const path = q
      ? `/search?q=${encodeURIComponent(q)}`
      : `/trending?`;
    const results = await fetchTenor(path);
    setGifs(results);
    setLoading(false);
  };

  useEffect(() => { load(''); }, []);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSearch = (val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(val), 380);
  };

  const glassPanel = dark
    ? { background: 'rgba(8,14,24,0.94)', border: '1px solid rgba(255,255,255,0.1)' }
    : { background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(255,255,255,0.85)' };
  const textPrimary   = dark ? '#eef2ff' : '#111827';
  const textTertiary  = dark ? 'rgba(238,242,255,0.32)' : 'rgba(17,24,39,0.32)';
  const inputBorder   = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <div
      style={{
        ...glassPanel,
        backdropFilter: 'blur(32px) saturate(180%)',
        WebkitBackdropFilter: 'blur(32px) saturate(180%)',
        borderRadius: 18, width: 332,
        overflow: 'hidden',
        boxShadow: '0 16px 56px rgba(0,0,0,0.22)',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Search header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px',
          borderBottom: `1px solid ${inputBorder}`,
        }}
      >
        <Search size={13} style={{ color: textTertiary, flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search GIFs..."
          style={{
            flex: 1, border: 'none', outline: 'none',
            background: 'transparent', fontSize: 13,
            color: textPrimary, fontFamily: "'DM Sans', sans-serif",
          }}
        />
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: textTertiary, padding: 0, display: 'flex', alignItems: 'center' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* GIF grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 3, padding: 8,
          maxHeight: 300, overflowY: 'auto',
        }}
      >
        {loading && (
          <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '28px 0', color: textTertiary, fontSize: 12 }}>
            Loading...
          </div>
        )}
        {!loading && gifs.length === 0 && (
          <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '28px 0', color: textTertiary, fontSize: 12 }}>
            No results found.
          </div>
        )}
        {!loading && gifs.map(gif => {
          const preview = gif.media?.[0]?.tinygif?.url || gif.media?.[0]?.gif?.url;
          const full    = gif.media?.[0]?.gif?.url;
          if (!preview || !full) return null;
          return (
            <button
              key={gif.id}
              type="button"
              onClick={() => onSelect({ url: full, preview, title: gif.title || 'GIF' })}
              style={{
                border: 'none', padding: 0, borderRadius: 8, overflow: 'hidden',
                background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                cursor: 'pointer', lineHeight: 0, aspectRatio: '1',
                transition: 'transform 0.12s ease, opacity 0.12s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';    e.currentTarget.style.opacity = '1'; }}
            >
              <img
                src={preview}
                alt={gif.title || 'gif'}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </button>
          );
        })}
      </div>

      {/* Tenor attribution */}
      <div style={{ padding: '5px 12px 8px', textAlign: 'right' }}>
        <span style={{ fontSize: 9, color: textTertiary, letterSpacing: '0.04em', fontWeight: 500 }}>
          Powered by Tenor
        </span>
      </div>
    </div>
  );
}
