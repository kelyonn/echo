import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

export default function MessageSearch({ messages, onSearchResultClick, dark = false }) {
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState([]);

  const textPrimary   = dark ? '#eef2ff' : '#111827';
  const textSecondary = dark ? 'rgba(238,242,255,0.55)' : 'rgba(17,24,39,0.5)';
  const textTertiary  = dark ? 'rgba(238,242,255,0.3)' : 'rgba(17,24,39,0.3)';

  const inputStyle = {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: textPrimary,
    fontFamily: "'DM Sans', sans-serif",
    padding: '11px 0',
  };

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setResults(
      messages.filter((m) => {
        if (typeof m === 'string') return m.toLowerCase().includes(query.toLowerCase());
        return (
          m.content?.toLowerCase().includes(query.toLowerCase()) ||
          m.sender?.toLowerCase().includes(query.toLowerCase())
        );
      })
    );
  }, [query, messages]);

  const highlight = (text, q) => {
    if (!q || !text) return text;
    const parts = text.split(new RegExp(`(${q})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase()
        ? <mark key={i} style={{ background: 'rgba(250,204,21,0.4)', color: 'inherit', borderRadius: 3, padding: '0 2px' }}>{part}</mark>
        : <span key={i}>{part}</span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Search input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.6)',
          border: dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.75)',
          borderRadius: 14,
          padding: '0 14px',
        }}
      >
        <Search size={15} style={{ color: textTertiary, flexShrink: 0 }} />
        <input
          autoFocus
          placeholder="Search messages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={inputStyle}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: textTertiary, flexShrink: 0, padding: 0 }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {results.map((msg, i) => {
            const sender  = typeof msg === 'string' ? msg.split(':')[0] : msg.sender;
            const content = typeof msg === 'string' ? msg : msg.content || '';
            const time    = typeof msg === 'string'
              ? ''
              : new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <button
                key={i}
                type="button"
                onClick={() => { onSearchResultClick(msg); setQuery(''); }}
                style={{
                  background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)',
                  border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.7)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: textPrimary }}>{sender}</span>
                  <span style={{ fontSize: 11, color: textTertiary }}>{time}</span>
                </div>
                <div style={{ fontSize: 13, color: textSecondary, lineHeight: 1.45 }}>
                  {highlight(content, query)}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {query && results.length === 0 && (
        <div style={{ textAlign: 'center', fontSize: 13, color: textTertiary, padding: '12px 0' }}>
          No messages found
        </div>
      )}
    </div>
  );
}
