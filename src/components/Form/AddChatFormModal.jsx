import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  isValidTopicName,
  normalizeOneToOneTopic,
  normalizeTopicName,
  normalizeUsername,
} from '../../utils/topic';

export default function AddChatFormModal({ isOpen, onClose, setChats, chats, client, username, dark = false }) {
  const { showToast } = useToast();
  const [topicMqtt, setTopicMqtt]   = useState('');
  const [isOneToOne, setIsOneToOne] = useState(false);
  const [focused, setFocused]       = useState(false);

  const textPrimary   = dark ? '#eef2ff' : '#111827';
  const textSecondary = dark ? 'rgba(238,242,255,0.55)' : 'rgba(17,24,39,0.5)';
  const textTertiary  = dark ? 'rgba(238,242,255,0.3)'  : 'rgba(17,24,39,0.3)';
  const glassPanel    = dark
    ? { background: 'rgba(8,14,24,0.82)',   border: '1px solid rgba(255,255,255,0.1)' }
    : { background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.82)' };

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const trimmed = topicMqtt.trim();
      if (!trimmed) {
        showToast({ title: 'Invalid input', description: 'Please enter a valid topic or username.', status: 'warning', duration: 4000 });
        return;
      }

      if (isOneToOne) {
        const target  = normalizeUsername(trimmed);
        const current = normalizeUsername(username);
        if (!target) {
          showToast({ title: 'Invalid username', description: 'Please enter a valid username.', status: 'warning', duration: 4000 });
          return;
        }
        if (target === current) {
          showToast({ title: 'Invalid username', description: 'You cannot chat with yourself.', status: 'warning', duration: 4000 });
          return;
        }
        const topic = normalizeOneToOneTopic(current, target);
        if (chats.some((c) => c.name === topic)) {
          showToast({ title: 'Already joined', description: 'You are already in this chat.', status: 'info', duration: 4000 });
          return;
        }
        client.subscribe(topic, { qos: 1 });
        setChats([...chats, { name: topic }]);
      } else {
        if (!isValidTopicName(trimmed)) {
          showToast({ title: 'Invalid topic', description: 'Topics may only contain letters, numbers, "/", "_", "-".', status: 'warning', duration: 4000 });
          return;
        }
        const topic = normalizeTopicName(trimmed);
        if (chats.some((c) => c.name === topic)) {
          showToast({ title: 'Already joined', description: 'You are already in this chat.', status: 'info', duration: 4000 });
          return;
        }
        client.subscribe(topic, { qos: 1 });
        setChats([...chats, { name: topic }]);
      }

      showToast({ title: 'Chat created', description: 'Your new chat is ready.', status: 'success', duration: 3000 });
      onClose();
      setTopicMqtt('');
      setIsOneToOne(false);
    } catch {
      showToast({ title: 'Error', description: 'Something went wrong.', status: 'error', duration: 4000 });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: dark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.28)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        padding: 16,
        fontFamily: "'DM Sans', sans-serif",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          ...glassPanel,
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          borderRadius: 24,
          padding: 28,
          width: '100%',
          maxWidth: 440,
          boxShadow: dark ? '0 24px 64px rgba(0,0,0,0.5)' : '0 24px 64px rgba(0,0,0,0.14)',
          color: textPrimary,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>New Chat</div>
            <div style={{ fontSize: 12, color: textTertiary, marginTop: 3 }}>Create or join a channel</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              border: dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)',
              background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: textTertiary, outline: 'none',
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* One-to-one toggle */}
          <label
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)',
              border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.7)',
              borderRadius: 14,
              padding: '12px 16px',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 13, color: textSecondary }}>Direct message (1:1)</span>
            <div
              style={{
                width: 40, height: 22, borderRadius: 11,
                background: isOneToOne
                  ? 'linear-gradient(135deg, #1e4aaa, #0a5e40)'
                  : dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                position: 'relative',
                transition: 'background 0.22s ease',
                flexShrink: 0,
              }}
              onClick={() => setIsOneToOne((v) => !v)}
            >
              <div
                style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: 3,
                  left: isOneToOne ? 21 : 3,
                  transition: 'left 0.22s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }}
              />
            </div>
          </label>

          {/* Description */}
          <p style={{ fontSize: 12, color: textTertiary, margin: 0, paddingLeft: 2 }}>
            {isOneToOne
              ? 'Enter the username of the person you want to message.'
              : 'Enter a channel name to create or join it.'}
          </p>

          {/* Input */}
          <div
            style={{
              display: 'flex', alignItems: 'center',
              background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.6)',
              border: focused
                ? dark ? '1px solid rgba(160,200,255,0.35)' : '1px solid rgba(30,80,160,0.28)'
                : dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.75)',
              boxShadow: focused
                ? dark ? '0 0 0 3px rgba(100,160,255,0.1)' : '0 0 0 3px rgba(30,80,160,0.07)'
                : 'none',
              borderRadius: 14,
              padding: '0 16px',
              transition: 'all 0.18s ease',
            }}
          >
            <input
              autoFocus
              placeholder={isOneToOne ? "e.g. sam" : "e.g. team-alpha"}
              value={topicMqtt}
              onChange={(e) => setTopicMqtt(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 14, color: textPrimary,
                fontFamily: "'DM Sans', sans-serif",
                padding: '13px 0',
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px', borderRadius: 12,
                border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                cursor: 'pointer', fontSize: 13, color: textSecondary,
                fontFamily: "'DM Sans', sans-serif", outline: 'none',
                transition: 'all 0.18s ease',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 20px', borderRadius: 12, border: 'none',
                background: topicMqtt.trim()
                  ? 'linear-gradient(135deg, #1e4aaa, #0a5e40)'
                  : dark ? 'rgba(255,255,255,0.1)' : 'rgba(200,210,220,0.4)',
                cursor: topicMqtt.trim() ? 'pointer' : 'default',
                fontSize: 13, fontWeight: 500, color: topicMqtt.trim() ? '#fff' : textTertiary,
                fontFamily: "'DM Sans', sans-serif", outline: 'none',
                boxShadow: topicMqtt.trim() ? '0 4px 16px rgba(30,80,180,0.28)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Join
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
