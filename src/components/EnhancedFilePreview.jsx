import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Eye, File, FileText, Music, Video, X } from 'lucide-react';

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024)               return `${bytes} B`;
  if (bytes < 1024 * 1024)        return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getIcon(type) {
  if (type?.startsWith('video/'))  return Video;
  if (type?.startsWith('audio/'))  return Music;
  if (
    type === 'application/pdf' ||
    type?.includes('word') ||
    type?.includes('excel') ||
    type?.includes('spreadsheet') ||
    type?.includes('text')
  ) return FileText;
  return File;
}

export default function EnhancedFilePreview({ file, dark = false, isSelf = false, onImageClick = null }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const isImage = file.type?.startsWith('image/');
  const isVideo = file.type?.startsWith('video/');
  const isAudio = file.type?.startsWith('audio/');
  const isPdf   = file.type === 'application/pdf';

  // ── Colour tokens that work on top of either bubble background ────────────
  const textMain   = isSelf ? 'rgba(255,255,255,0.95)' : (dark ? '#eef2ff'                    : '#111827');
  const textSub    = isSelf ? 'rgba(255,255,255,0.55)' : (dark ? 'rgba(238,242,255,0.45)'     : 'rgba(17,24,39,0.45)');
  const cardBg     = isSelf ? 'rgba(0,0,0,0.12)'       : (dark ? 'rgba(255,255,255,0.06)'     : 'rgba(0,0,0,0.03)');
  const cardBorder = isSelf ? 'rgba(255,255,255,0.18)'  : (dark ? 'rgba(255,255,255,0.1)'      : 'rgba(0,0,0,0.08)');
  const btnBg      = isSelf ? 'rgba(255,255,255,0.15)'  : (dark ? 'rgba(255,255,255,0.09)'     : 'rgba(0,0,0,0.05)');
  const btnBorder  = isSelf ? 'rgba(255,255,255,0.22)'  : (dark ? 'rgba(255,255,255,0.12)'     : 'rgba(0,0,0,0.09)');

  const primaryBtn = {
    background: isSelf ? 'rgba(255,255,255,0.22)' : (dark ? 'rgba(96,165,250,0.18)'  : 'rgba(30,74,170,0.09)'),
    border:     isSelf ? '1px solid rgba(255,255,255,0.3)' : (dark ? '1px solid rgba(96,165,250,0.3)' : '1px solid rgba(30,74,170,0.2)'),
    color:      isSelf ? '#fff' : (dark ? '#60a5fa' : '#1e4aaa'),
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = file.content;
    a.download = file.name;
    a.click();
  };

  // ── Image ──────────────────────────────────────────────────────────────────
  if (isImage && file.content) {
    const handleImageClick = () => {
      if (onImageClick) onImageClick(file);
      else setLightboxOpen(true);
    };
    return (
      <>
        <div
          onClick={handleImageClick}
          style={{ cursor: 'zoom-in', lineHeight: 0, borderRadius: 10, overflow: 'hidden' }}
        >
          <img
            src={file.content}
            alt={file.name}
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: 280,
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>

        {file.name && (
          <div style={{ fontSize: 11, color: textSub, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file.name}{file.size ? ` · ${formatSize(file.size)}` : ''}
          </div>
        )}

        {/* Full-screen lightbox via portal */}
        {lightboxOpen && createPortal(
          <div
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.92)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'zoom-out',
            }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
              style={{
                position: 'absolute', top: 16, right: 16,
                width: 40, height: 40, borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
                color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                outline: 'none', zIndex: 1,
              }}
            >
              <X size={18} />
            </button>

            {/* Download button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDownload(); }}
              style={{
                position: 'absolute', top: 16, right: 64,
                width: 40, height: 40, borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
                color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                outline: 'none', zIndex: 1,
              }}
            >
              <Download size={16} />
            </button>

            <img
              src={file.content}
              alt={file.name}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '88vw', maxHeight: '84vh',
                objectFit: 'contain',
                borderRadius: 10,
                boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              }}
            />

            <div style={{
              position: 'absolute', bottom: 20,
              left: '50%', transform: 'translateX(-50%)',
              fontSize: 12, color: 'rgba(255,255,255,0.45)',
              fontFamily: "'DM Sans', sans-serif",
              whiteSpace: 'nowrap',
            }}>
              {file.name}{file.size ? ` · ${formatSize(file.size)}` : ''}
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  // ── Video ──────────────────────────────────────────────────────────────────
  if (isVideo && file.content) {
    return (
      <div style={{ lineHeight: 0 }}>
        <video
          src={file.content}
          controls
          style={{
            display: 'block', maxWidth: '100%', maxHeight: 260,
            borderRadius: 10,
          }}
        />
        {file.name && (
          <div style={{ fontSize: 11, color: textSub, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>
            {file.name}{file.size ? ` · ${formatSize(file.size)}` : ''}
          </div>
        )}
      </div>
    );
  }

  // ── Audio ──────────────────────────────────────────────────────────────────
  if (isAudio && file.content) {
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif", minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: btnBg, border: `1px solid ${btnBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Music size={15} style={{ color: textSub }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.name}
            </div>
            {file.size > 0 && (
              <div style={{ fontSize: 11, color: textSub }}>{formatSize(file.size)}</div>
            )}
          </div>
        </div>
        <audio src={file.content} controls style={{ width: '100%', height: 32 }} />
      </div>
    );
  }

  // ── Document / PDF / generic ───────────────────────────────────────────────
  const IconComp = getIcon(file.type);

  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 12,
        padding: '10px 12px',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minWidth: 200,
      }}
    >
      {/* File info row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: btnBg, border: `1px solid ${btnBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconComp size={19} style={{ color: textSub }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 500, color: textMain,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {file.name || 'Untitled file'}
          </div>
          <div style={{ fontSize: 11, color: textSub, marginTop: 1 }}>
            {file.size > 0 ? formatSize(file.size) : file.type || 'File'}
          </div>
        </div>
      </div>

      {/* Action chips */}
      <div style={{ display: 'flex', gap: 6 }}>
        {isPdf && (
          <button
            type="button"
            onClick={() => window.open(file.content, '_blank')}
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 8,
              cursor: 'pointer', fontSize: 12, fontWeight: 500,
              outline: 'none', fontFamily: "'DM Sans', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              transition: 'all 0.15s ease',
              ...primaryBtn,
            }}
          >
            <Eye size={13} />
            Preview
          </button>
        )}
        <button
          type="button"
          onClick={handleDownload}
          style={{
            flex: 1, padding: '6px 10px', borderRadius: 8,
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
            outline: 'none', fontFamily: "'DM Sans', sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            background: btnBg, border: `1px solid ${btnBorder}`, color: textMain,
            transition: 'all 0.15s ease',
          }}
        >
          <Download size={13} />
          Download
        </button>
      </div>
    </div>
  );
}
