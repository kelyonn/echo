import React, { useRef, useState, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { Smile } from 'lucide-react';

/**
 * Reactions format: { [emoji]: string[] }  where the strings are usernames.
 * The `username` prop is the current user (me) — used to highlight my own reactions.
 */
export default function MessageReactions({
  messageId,
  reactions = {},   // { [emoji]: string[] }  — reactions for this specific message
  onReactionAdd,
  onReactionRemove,
  dark = false,
  username = '',
}) {
  const [isOpen, setIsOpen]       = useState(false);
  const [pickerPos, setPickerPos] = useState({});
  const buttonRef = useRef(null);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e) => {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect    = buttonRef.current.getBoundingClientRect();
      const pickerW = 350;
      const pickerH = 420;
      const gap     = 8;

      const left = Math.max(gap, Math.min(rect.right - pickerW, window.innerWidth - pickerW - gap));
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      const pos = spaceAbove >= pickerH || spaceAbove >= spaceBelow
        ? { bottom: window.innerHeight - rect.top + gap, left }
        : { top: rect.bottom + gap, left };

      setPickerPos(pos);
    }
    setIsOpen((v) => !v);
  };

  const handleEmojiClick = (emojiData) => {
    onReactionAdd(messageId, emojiData?.emoji || '');
    setIsOpen(false);
  };

  const handleReactionClick = (emoji) => {
    const users = reactions[emoji] || [];
    if (users.includes(username)) {
      onReactionRemove(messageId, emoji);
    } else {
      onReactionAdd(messageId, emoji);
    }
  };

  const textPrimary = dark ? '#eef2ff' : '#111827';
  const hasReactions = Object.keys(reactions).some(e => (reactions[e] || []).length > 0);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: hasReactions ? 4 : 2, flexWrap: 'wrap' }}>
        {Object.entries(reactions).map(([emoji, users]) => {
          if (!users?.length) return null;
          const active = users.includes(username);
          return (
            <button
              key={emoji}
              type="button"
              title={users.join(', ')}
              onClick={() => handleReactionClick(emoji)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 13,
                border: active
                  ? dark ? '1px solid rgba(96,165,250,0.4)' : '1px solid rgba(30,80,180,0.25)'
                  : dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)',
                background: active
                  ? dark ? 'rgba(96,165,250,0.15)' : 'rgba(30,80,180,0.08)'
                  : dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <span>{emoji}</span>
              {users.length > 1 && (
                <span style={{ fontSize: 10, color: textPrimary }}>{users.length}</span>
              )}
            </button>
          );
        })}

        {/* Add reaction button */}
        <button
          ref={buttonRef}
          type="button"
          aria-label="Add reaction"
          onClick={handleToggle}
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)',
            background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            outline: 'none',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
        >
          <Smile size={13} />
        </button>
      </div>

      {isOpen && (
        <div
          ref={pickerRef}
          style={{
            position: 'fixed',
            bottom: pickerPos.bottom,
            left: pickerPos.left,
            zIndex: 9999,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: dark
              ? '0 16px 48px rgba(0,0,0,0.5)'
              : '0 16px 48px rgba(0,0,0,0.18)',
          }}
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={dark ? 'dark' : 'light'}
            height={420}
            width={350}
          />
        </div>
      )}
    </>
  );
}
