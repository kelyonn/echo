import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { Smile } from 'lucide-react';

export default function EmojiPickerButton({ onEmojiSelect, dark = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState({ bottom: 0, right: 0 });
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
      const rect        = buttonRef.current.getBoundingClientRect();
      const pickerW     = 350;
      const fromRight   = window.innerWidth - rect.right;
      // Clamp so picker never bleeds off either edge
      const right       = Math.max(8, Math.min(fromRight, window.innerWidth - pickerW - 8));
      setPickerPos({
        bottom: window.innerHeight - rect.top + 8,
        right,
      });
    }
    setIsOpen((v) => !v);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Add emoji"
        onClick={handleToggle}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: dark
            ? '1px solid rgba(255,255,255,0.12)'
            : '1px solid rgba(255,255,255,0.65)',
          background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 0,
          flexShrink: 0,
          transition: 'all 0.18s ease',
          outline: 'none',
          color: dark ? 'rgba(238,242,255,0.6)' : 'rgba(17,24,39,0.55)',
        }}
      >
        <Smile size={17} />
      </button>

      {isOpen && (
        <div
          ref={pickerRef}
          style={{
            position: 'fixed',
            bottom: pickerPos.bottom,
            right: pickerPos.right,
            zIndex: 9999,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: dark
              ? '0 16px 48px rgba(0,0,0,0.5)'
              : '0 16px 48px rgba(0,0,0,0.18)',
          }}
        >
          <EmojiPicker
            onEmojiClick={(emojiData) => {
              onEmojiSelect(emojiData?.emoji || '');
              setIsOpen(false);
            }}
            theme={dark ? 'dark' : 'light'}
          />
        </div>
      )}
    </>
  );
}
