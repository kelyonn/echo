import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight,
  Edit3, Eye, EyeOff, Film, Lock, LogOut, MapPin, Menu, Mic, Moon,
  Paperclip, Pin, Plus, RefreshCw, Reply, Search, Shield, ShieldCheck,
  Sun, Timer, Trash2, Volume2, VolumeX, X, Smile,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useMqtt } from '../context/MqttContext';
import { useToast } from '../context/ToastContext';
import { useIdentity } from '../context/IdentityContext';
import { formatMessage, parseMessage } from '../utils/messageFormatter';
import { getLocation } from '../utils/location';
import { isValidUrl, getUrlPreview } from '../utils/url';
import {
  isSameOneToOneTopic,
  normalizeUsername,
  parseOneToOneTopic,
  normalizeOneToOneTopic,
} from '../utils/topic';
import FileUpload from './FileUpload';
import EmojiPickerButton from './EmojiPickerButton';
import MessageSearch from './MessageSearch';
import MessageReactions from './MessageReactions';
import EnhancedFilePreview from './EnhancedFilePreview';
import LocationShare from './LocationShare';
import UrlPreview from './UrlPreview';
import AddChatFormModal from './Form/AddChatFormModal';
import VoiceRecorder from './VoiceRecorder';
import GifPicker from './GifPicker';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: 'rgba(30,58,138,0.14)',  text: '#1e3a8a' },
  { bg: 'rgba(13,110,74,0.14)',  text: '#0d6e4a' },
  { bg: 'rgba(109,30,138,0.14)', text: '#6d1e8a' },
  { bg: 'rgba(138,61,30,0.14)',  text: '#8a3d1e' },
  { bg: 'rgba(30,106,138,0.14)', text: '#1e6a8a' },
  { bg: 'rgba(138,110,30,0.14)', text: '#8a6e1e' },
];

function getAvatarColor(user) {
  let h = 0;
  for (let i = 0; i < user.length; i++) h = user.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function Avatar({ user, size = 32 }) {
  const c = getAvatarColor(user);
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: c.bg, color: c.text,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 600, fontSize: size * 0.38, flexShrink: 0,
        border: `1.5px solid ${c.text}44`,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {user[0].toUpperCase()}
    </div>
  );
}

function formatChatLabel(topic, username) {
  const parsed = parseOneToOneTopic(topic);
  if (!parsed) return topic;
  const me = normalizeUsername(username);
  return normalizeUsername(parsed.userA) === me ? parsed.userB : parsed.userA;
}

function nowTime() {
  const n = new Date();
  return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}`;
}

function safeParse(raw) {
  try {
    return parseMessage(raw);
  } catch {
    return {
      id: `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type: 'text',
      content: raw,
      sender: 'system',
      timestamp: new Date().toISOString(),
    };
  }
}

const LS_PREFIX = 'echo_msgs_';
const MAX_STORED = 200;

function lsLoad(topic) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + topic);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function lsSave(topic, msgs) {
  try {
    localStorage.setItem(LS_PREFIX + topic, JSON.stringify(msgs.slice(-MAX_STORED)));
  } catch {}
}

// ─── Date divider helper ──────────────────────────────────────────────────────

function formatDateDivider(ts) {
  const d    = new Date(ts);
  const now  = new Date();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString())  return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], {
    month: 'short', day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

marked.setOptions({ breaks: true, gfm: true });

function MarkdownText({ text }) {
  // Highlight @mentions before markdown processing
  const processed = (text || '').replace(/@(\w+)/g, '<span class="md-mention">@$1</span>');
  const html = DOMPurify.sanitize(marked.parse(processed), {
    ADD_TAGS: ['span'],
    ADD_ATTR: ['class'],
  });
  return (
    <div
      className="md-content"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ margin: 0 }}
    />
  );
}

// ─── Slash commands ────────────────────────────────────────────────────────────

const SLASH_CMDS = [
  { cmd: 'me',    args: '<action>', desc: 'Broadcast an action' },
  { cmd: 'shrug', args: '',         desc: 'Send ¯\\_(ツ)_/¯' },
  { cmd: 'clear', args: '',         desc: 'Clear chat history' },
  { cmd: 'help',  args: '',         desc: 'Show all commands' },
];

// ─── Disappearing message options ────────────────────────────────────────────

const EXPIRY_OPTIONS = [
  { label: 'Off', ms: 0 },
  { label: '30s', ms: 30_000 },
  { label: '5m',  ms: 5 * 60_000 },
  { label: '1h',  ms: 60 * 60_000 },
  { label: '24h', ms: 24 * 60 * 60_000 },
];

// ─── IconBtn ─────────────────────────────────────────────────────────────────

function IconBtn({ onClick, title, children, dark, active = false, style = {} }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 36, height: 36, borderRadius: '50%',
        border: dark
          ? (active || hovered ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.1)')
          : (active || hovered ? '1px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.55)'),
        background: dark
          ? (hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)')
          : (hovered ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.5)'),
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.18s ease',
        outline: 'none',
        color: dark ? 'rgba(238,242,255,0.6)' : 'rgba(17,24,39,0.55)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── ActionIconBtn (message hover toolbar) ───────────────────────────────────

function ActionIconBtn({ onClick, title, children, danger = false, active = false }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 26, height: 26, borderRadius: 6, border: 'none',
        background: hovered
          ? (danger ? 'rgba(239,68,68,0.14)' : 'rgba(96,165,250,0.13)')
          : 'transparent',
        cursor: 'pointer', outline: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: danger
          ? (hovered ? '#ef4444' : 'inherit')
          : (active ? '#60a5fa' : 'inherit'),
        transition: 'all 0.12s ease',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

// Simple beep for incoming messages (WebAudio, no asset needed)
function playNotificationSound() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

export default function ChatPage({ username = 'me', dark = false, onToggleDark, onSignOut }) {
  const { client, status, catching, publishRetained } = useMqtt();
  const { showToast } = useToast();
  const {
    identity, isReady: identityReady, fingerprint, publicProfile,
    peerKeys, setPeerKey, sign, verify, encrypt, decrypt, resetIdentity,
  } = useIdentity();

  // ── Core state ─────────────────────────────────────────────────────────────
  const [chats, setChats]               = useState([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isAddChatOpen, setIsAddChatOpen]   = useState(false);
  const [sidebarOpen, setSidebarOpen]       = useState(() => window.innerWidth >= 768);
  const [isMobile, setIsMobile]             = useState(() => window.innerWidth < 768);

  const [messagesByTopic, setMessagesByTopic] = useState({ chat: [] });
  const [input, setInput]         = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [urlPreview, setUrlPreview]     = useState(null);
  const [isFileOpen, setIsFileOpen]     = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // reactions: { [msgId]: { [emoji]: string[] } }  where string[] = usernames
  const [reactions, setReactions]       = useState({});

  // ── New state ──────────────────────────────────────────────────────────────
  const [isAtBottom, setIsAtBottom]   = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState({}); // { topic: Set<string> }

  // ── Phase 2 state ──────────────────────────────────────────────────────────
  const [replyTo, setReplyTo]             = useState(null); // { id, sender, content, type }
  const [editingId, setEditingId]         = useState(null);
  const [editingText, setEditingText]     = useState('');
  const [pinnedByTopic, setPinnedByTopic] = useState(() => {
    try { return JSON.parse(localStorage.getItem('echo_pins') || '{}'); }
    catch { return {}; }
  });
  const [hoveredMsgId, setHoveredMsgId]   = useState(null);
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionQuery, setMentionQuery]   = useState('');
  const [lastReceivedByTopic, setLastReceivedByTopic] = useState({});

  // ── Phase 4 state ──────────────────────────────────────────────────────────
  const [galleryState, setGalleryState] = useState(null); // { images: [...msgs], index: n }
  const [isGifOpen, setIsGifOpen]       = useState(false);

  // ── Phase 5 state ──────────────────────────────────────────────────────────
  const [expiryIndex, setExpiryIndex]   = useState(0); // index into EXPIRY_OPTIONS
  const [viewOnce, setViewOnce]         = useState(false); // for current attachment
  const [seenViewOnce, setSeenViewOnce] = useState({}); // { [msgId]: true }

  // ── Identity / security state ──────────────────────────────────────────────
  // reactions: { [msgId]: { [emoji]: string[] } }  — usernames who reacted
  const [verifiedMsgs, setVerifiedMsgs] = useState({}); // { [msgId]: boolean }
  const [mutedTopics, setMutedTopics]   = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('echo_muted') || '[]')); }
    catch { return new Set(); }
  });
  const [showIdentityPanel, setShowIdentityPanel] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const messagesEndRef       = useRef(null);
  const messagesContainerRef = useRef(null);
  const tabsRef              = useRef([]);
  const isAtBottomRef        = useRef(true);
  const prevMsgCountRef      = useRef(0);
  const typingTimersRef      = useRef({});
  const typingThrottleRef    = useRef(0);
  const titleFlashRef        = useRef(null);
  const originalTitleRef     = useRef(document.title);
  // Always-current ref so async callbacks never use stale peerKeys state
  const peerKeysRef          = useRef(peerKeys);
  // Queue of { parsedMsg, targetTopic } waiting for a peer key to arrive
  const pendingDecryptRef    = useRef({});

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const tabs = useMemo(
    () => [
      { label: 'General', topic: 'chat' },
      ...chats.map((chat) => ({
        label: formatChatLabel(chat.name, username),
        topic: chat.name,
      })),
    ],
    [chats, username]
  );

  useEffect(() => { tabsRef.current = tabs; }, [tabs]);

  const activeTab      = tabs[activeTabIndex] || tabs[0];
  const currentMessages = messagesByTopic[activeTab?.topic] || [];

  // ── localStorage: load on mount ────────────────────────────────────────────
  useEffect(() => {
    const loaded = {};
    const now = Date.now();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(LS_PREFIX)) continue;
      const topic = key.slice(LS_PREFIX.length);
      const msgs  = lsLoad(topic);
      if (!msgs?.length) continue;
      // Filter already-expired messages
      loaded[topic] = msgs.filter(m => !m.expiresAt || new Date(m.expiresAt).getTime() > now);
    }
    if (Object.keys(loaded).length === 0) return;
    setMessagesByTopic(prev => ({ ...prev, ...loaded }));
    // Schedule deletion for messages that expire in the future
    Object.values(loaded).flat().forEach(m => {
      if (!m.expiresAt) return;
      const msLeft = new Date(m.expiresAt).getTime() - Date.now();
      if (msLeft > 0) {
        setTimeout(() => {
          setMessagesByTopic(prev => {
            const updated = {};
            Object.entries(prev).forEach(([t, msgs]) => {
              updated[t] = msgs.filter(msg => msg.id !== m.id);
            });
            return updated;
          });
        }, msLeft);
      }
    });
    const restoredTopics = Object.keys(loaded).filter(t => t !== 'chat');
    if (restoredTopics.length > 0) {
      setChats(prev => {
        const existing = new Set(prev.map(c => c.name));
        const toAdd = restoredTopics.filter(t => !existing.has(t));
        return [...prev, ...toAdd.map(t => ({ name: t }))];
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── localStorage: save on change ──────────────────────────────────────────
  useEffect(() => {
    Object.entries(messagesByTopic).forEach(([topic, msgs]) => {
      if (msgs.length > 0) lsSave(topic, msgs);
    });
  }, [messagesByTopic]);

  // ── Mobile resize ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }
      if (e.key === 'Escape') {
        if (isSearchOpen)  { setIsSearchOpen(false);  return; }
        if (isFileOpen)    { setIsFileOpen(false);     return; }
        if (isAddChatOpen) { setIsAddChatOpen(false);  return; }
        if (isMobile && sidebarOpen) { setSidebarOpen(false); return; }
      }
      if (mod && e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveTabIndex(prev => Math.max(0, prev - 1));
      }
      if (mod && e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveTabIndex(prev => Math.min(tabsRef.current.length - 1, prev + 1));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isSearchOpen, isFileOpen, isAddChatOpen, isMobile, sidebarOpen]);

  // ── Auto-scroll: reset on tab change ─────────────────────────────────────
  useEffect(() => {
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setUnseenCount(0);
    prevMsgCountRef.current = 0;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    });
  }, [activeTabIndex]);

  // ── Auto-scroll: handle new messages ─────────────────────────────────────
  useEffect(() => {
    const prev = prevMsgCountRef.current;
    const curr = currentMessages.length;
    if (curr > prev && curr > 0) {
      if (isAtBottomRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setUnseenCount(c => c + (curr - prev));
      }
      prevMsgCountRef.current = curr;
    }
  }, [currentMessages.length]); // intentionally excludes isAtBottom — use ref instead

  // ── Browser notification permission ──────────────────────────────────────
  useEffect(() => {
    if (status === 'connected' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [status]);

  // ── Clear tab-title flash when tab regains focus ──────────────────────────
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden && titleFlashRef.current) {
        clearInterval(titleFlashRef.current);
        titleFlashRef.current = null;
        document.title = originalTitleRef.current;
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // ── Subscribe to typing channel for general room ──────────────────────────
  useEffect(() => {
    if (!client) return;
    try { client.subscribe('chat/__typing'); } catch {}
  }, [client]);

  // ── Pillar 1: broadcast own public key when connected + identity ready ────
  useEffect(() => {
    if (!client || status !== 'connected' || !identityReady || !publicProfile) return;
    try {
      // Retained so new joiners receive it immediately on subscribe
      publishRetained(
        `users/${username}/key`,
        JSON.stringify({ type: 'key', sender: username, ...publicProfile })
      );
    } catch {}
  }, [client, status, identityReady, publicProfile, username, publishRetained]);

  // ── Keep peerKeysRef in sync so async callbacks always see current keys ───
  useEffect(() => { peerKeysRef.current = peerKeys; }, [peerKeys]);

  // ── Re-decrypt messages that arrived before the peer's key was known ──────
  useEffect(() => {
    const pending = pendingDecryptRef.current;
    const newKeys = peerKeys;
    Object.keys(pending).forEach(async (peerName) => {
      if (!newKeys[peerName]?.ecdhPubKey) return;
      const queue = pending[peerName] || [];
      delete pendingDecryptRef.current[peerName];
      for (const { parsedMsg, targetTopic } of queue) {
        try {
          const decrypted = await decrypt(parsedMsg.encrypted, newKeys[peerName].ecdhPubKey);
          if (decrypted !== null) {
            setMessagesByTopic(prev => {
              const msgs = prev[targetTopic] || [];
              return {
                ...prev,
                [targetTopic]: msgs.map(m =>
                  m.id === parsedMsg.id
                    ? { ...m, content: decrypted, _decrypted: true }
                    : m
                ),
              };
            });
          }
        } catch {}
      }
    });
  }, [peerKeys, decrypt]);

  // ── Persist muted topics ──────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem('echo_muted', JSON.stringify([...mutedTopics])); } catch {}
  }, [mutedTopics]);

  // ── MQTT message handler ──────────────────────────────────────────────────
  const handleMessage = useCallback(
    async (topic, message) => {
      // Typing indicator events
      if (topic.endsWith('/__typing')) {
        const chatTopic = topic.slice(0, topic.length - '/__typing'.length);
        try {
          const { user } = JSON.parse(message.toString());
          if (!user || user === username) return;
          const key = `${chatTopic}/${user}`;
          if (typingTimersRef.current[key]) clearTimeout(typingTimersRef.current[key]);
          setTypingUsers(prev => {
            const s = new Set(prev[chatTopic] || []);
            s.add(user);
            return { ...prev, [chatTopic]: s };
          });
          typingTimersRef.current[key] = setTimeout(() => {
            setTypingUsers(prev => {
              const s = new Set(prev[chatTopic] || []);
              s.delete(user);
              return { ...prev, [chatTopic]: s };
            });
          }, 3000);
        } catch {}
        return;
      }

      // Pillar 1: peer public key announcements (retained, topic: users/<name>/key)
      if (topic.startsWith('users/') && topic.endsWith('/key')) {
        try {
          const payload = JSON.parse(message.toString());
          if (payload.type === 'key' && payload.sender && payload.sender !== username) {
            const tofuStatus = setPeerKey(payload.sender, {
              sigPubKey:  payload.sigPubKey,
              ecdhPubKey: payload.ecdhPubKey,
            });
            if (tofuStatus === 'conflict') {
              showToast({
                title: `${payload.sender}'s key changed`,
                description: 'Their identity was reset (new browser or cleared storage). Messages will re-encrypt with the new key.',
                status: 'warning',
                duration: 6000,
              });
            }
          }
        } catch {}
        return;
      }

      // One-to-one messages
      const normalizedMe = normalizeUsername(username);
      const parsed = parseOneToOneTopic(topic);
      if (parsed) {
        const participants = [
          normalizeUsername(parsed.userA),
          normalizeUsername(parsed.userB),
        ];
        if (participants.includes(normalizedMe)) {
          const normalizedTopic = parsed.normalized;
          setChats((prev) => {
            if (prev.some((c) => c.name === normalizedTopic)) return prev;
            client.subscribe(normalizedTopic);
            return [...prev, { name: normalizedTopic }];
          });
          const parsedMsg = safeParse(message.toString());
          setMessagesByTopic((prev) => ({
            ...prev,
            [normalizedTopic]: [...(prev[normalizedTopic] || []), parsedMsg],
          }));
          return;
        }
      }

      // General room messages
      const currentTabs = tabsRef.current;
      let targetTopic = null;
      for (const tab of currentTabs) {
        if (topic === tab.topic || isSameOneToOneTopic(topic, tab.topic)) {
          targetTopic = tab.topic;
          break;
        }
      }
      if (!targetTopic) return;

      const parsedMsg = safeParse(message.toString());

      // Handle control messages
      if (parsedMsg.type === 'delete') {
        setMessagesByTopic(prev => ({
          ...prev,
          [targetTopic]: (prev[targetTopic] || []).filter(m => m.id !== parsedMsg.targetId),
        }));
        return;
      }
      if (parsedMsg.type === 'edit') {
        setMessagesByTopic(prev => ({
          ...prev,
          [targetTopic]: (prev[targetTopic] || []).map(m =>
            m.id === parsedMsg.targetId ? { ...m, content: parsedMsg.content, edited: true } : m
          ),
        }));
        return;
      }
      // Pillar 4: broadcast reactions
      if (parsedMsg.type === 'reaction') {
        const { targetId, emoji, action, sender: reactSender } = parsedMsg;
        if (!targetId || !emoji || !reactSender) return;
        setReactions(prev => {
          const msgReactions = prev[targetId] || {};
          const users = msgReactions[emoji] || [];
          let nextUsers;
          if (action === 'add') {
            nextUsers = users.includes(reactSender) ? users : [...users, reactSender];
          } else {
            nextUsers = users.filter(u => u !== reactSender);
          }
          const nextMsg = nextUsers.length > 0
            ? { ...msgReactions, [emoji]: nextUsers }
            : (({ [emoji]: _, ...rest }) => rest)(msgReactions);
          return { ...prev, [targetId]: nextMsg };
        });
        return;
      }
      // Pillar 4: broadcast pins
      if (parsedMsg.type === 'pin') {
        const { targetTopic: pinTopic, msgId, action: pinAction } = parsedMsg;
        const effectiveTopic = pinTopic || targetTopic;
        setPinnedByTopic(prev => {
          if (pinAction === 'unpin') {
            const { [effectiveTopic]: _, ...rest } = prev;
            return rest;
          }
          return { ...prev, [effectiveTopic]: msgId };
        });
        return;
      }

      // Drop already-expired messages
      if (parsedMsg.expiresAt && new Date(parsedMsg.expiresAt).getTime() <= Date.now()) return;

      // Pillar 1: verify signature FIRST (before decryption changes content)
      if (parsedMsg.sig && parsedMsg.sigPubKey && parsedMsg.id) {
        // Signing payload = everything except runtime-only fields
        const { sig, sigPubKey } = parsedMsg;
        const { sig: _s, sigPubKey: _pk, ...signingPayload } = parsedMsg;
        const msgId = parsedMsg.id;
        verify(signingPayload, sig, sigPubKey).then(valid => {
          setVerifiedMsgs(prev => ({ ...prev, [msgId]: valid }));
          // Only register key from message if we don't already have a full key for this peer
          // (avoids overwriting ecdhPubKey with undefined when ecdhPubKey isn't in the message)
          if (valid && parsedMsg.sender && sigPubKey) {
            const existing = peerKeysRef.current[parsedMsg.sender];
            const ecdhPubKey = parsedMsg.ecdhPubKey || existing?.ecdhPubKey;
            if (ecdhPubKey) {
              setPeerKey(parsedMsg.sender, { sigPubKey, ecdhPubKey });
            }
          }
        });
      }

      // Pillar 5: E2E decrypt if message has encrypted payload
      if (parsedMsg.encrypted && parsedMsg.sender !== username) {
        const senderKey = peerKeysRef.current[parsedMsg.sender];
        if (senderKey?.ecdhPubKey) {
          try {
            const decrypted = await decrypt(parsedMsg.encrypted, senderKey.ecdhPubKey);
            if (decrypted !== null) {
              parsedMsg.content    = decrypted;
              parsedMsg._decrypted = true;
            }
          } catch {}
        } else {
          // Key not here yet — queue for decryption once the key arrives
          const q = pendingDecryptRef.current[parsedMsg.sender] || [];
          pendingDecryptRef.current[parsedMsg.sender] = [...q, { parsedMsg: { ...parsedMsg }, targetTopic }];
        }
      }
      // Also decrypt own sent messages that bounced back
      if (parsedMsg.encrypted && parsedMsg.sender === username) {
        const dmP = parseOneToOneTopic(targetTopic);
        if (dmP) {
          const peerName = normalizeUsername(dmP.userA) === normalizeUsername(username)
            ? dmP.userB : dmP.userA;
          const peerKey = peerKeysRef.current[peerName];
          if (peerKey?.ecdhPubKey) {
            try {
              const decrypted = await decrypt(parsedMsg.encrypted, peerKey.ecdhPubKey);
              if (decrypted !== null) {
                parsedMsg.content    = decrypted;
                parsedMsg._decrypted = true;
              }
            } catch {}
          }
        }
      }

      setMessagesByTopic((prev) => ({
        ...prev,
        [targetTopic]: [...(prev[targetTopic] || []), parsedMsg],
      }));

      // Schedule auto-deletion for disappearing messages
      if (parsedMsg.expiresAt) {
        const msLeft = new Date(parsedMsg.expiresAt).getTime() - Date.now();
        if (msLeft > 0) {
          setTimeout(() => {
            setMessagesByTopic(prev => ({
              ...prev,
              [targetTopic]: (prev[targetTopic] || []).filter(m => m.id !== parsedMsg.id),
            }));
          }, msLeft);
        }
      }

      // Track last received timestamp for read receipts
      if (parsedMsg.sender !== username && parsedMsg.sender !== 'system') {
        setLastReceivedByTopic(prev => ({
          ...prev,
          [targetTopic]: parsedMsg.timestamp || new Date().toISOString(),
        }));
      }

      // Pillar 3: Notify when tab is hidden and topic is not muted
      if (parsedMsg.sender !== username && parsedMsg.sender !== 'system') {
        if (!mutedTopics.has(targetTopic)) {
          playNotificationSound();
          if (document.hidden) {
            if (Notification.permission === 'granted') {
              const chatLabel = targetTopic === 'chat'
                ? '#general'
                : formatChatLabel(targetTopic, username);
              const n = new Notification(`${parsedMsg.sender} in ${chatLabel}`, {
                body: parsedMsg.type === 'text'
                  ? (parsedMsg.content || '').substring(0, 100)
                  : `Sent a ${parsedMsg.type}`,
                tag:  `echo_${targetTopic}`,
                icon: '/icon-192.png',
              });
              n.onclick = () => { window.focus(); };
            }
            if (!titleFlashRef.current) {
              let tog = false;
              const orig = originalTitleRef.current;
              titleFlashRef.current = setInterval(() => {
                document.title = tog ? orig : `New message — ${parsedMsg.sender}`;
                tog = !tog;
              }, 1000);
            }
          }
        }
      }
    },
    [client, username, peerKeys, decrypt, verify, setPeerKey, mutedTopics, showToast]
  );

  useEffect(() => {
    if (!client) return;
    client.on('message', handleMessage);
    return () => client.off('message', handleMessage);
  }, [client, handleMessage]);

  // ── Scroll handler ────────────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    isAtBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
    if (atBottom) setUnseenCount(0);
  }, []);

  const scrollToBottom = useCallback(() => {
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setUnseenCount(0);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollToMessage = useCallback((id) => {
    const el = document.getElementById(`message-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.transition = 'background-color 0.2s ease';
    el.style.backgroundColor = 'rgba(255,255,100,0.22)';
    setTimeout(() => { el.style.backgroundColor = ''; el.style.transition = ''; }, 2200);
  }, []);

  // ── Persist pinned messages ───────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem('echo_pins', JSON.stringify(pinnedByTopic)); }
    catch {}
  }, [pinnedByTopic]);

  // ── Drag-anywhere file drop ───────────────────────────────────────────────
  const { getRootProps: getDragRootProps, getInputProps: getDragInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      if (files[0]) {
        handleFileSelect(files[0]);
        showToast({ title: 'File attached', description: files[0].name, status: 'success', duration: 2000 });
      }
    },
    onDropRejected: () => showToast({ title: 'File rejected', description: 'Max 10 MB. Images, PDF, docs, and text only.', status: 'warning', duration: 3000 }),
    noClick: true,
    noKeyboard: true,
    multiple: false,
    maxSize: 10 * 1024 * 1024,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
    },
  });

  // ── Input handlers ────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInput(text);
    const url = text.split(' ').find((w) => isValidUrl(w));
    if (url) {
      getUrlPreview(url).then((preview) => { if (preview) setUrlPreview(preview); });
    } else {
      setUrlPreview(null);
    }
    // @mention detection
    const atMatch = text.match(/@(\w*)$/);
    if (atMatch) {
      setMentionActive(true);
      setMentionQuery(atMatch[1].toLowerCase());
    } else {
      setMentionActive(false);
      setMentionQuery('');
    }
    // Throttled typing indicator (max once per second)
    if (client && activeTab && text.trim()) {
      const now = Date.now();
      if (now - typingThrottleRef.current > 1000) {
        typingThrottleRef.current = now;
        try {
          client.publish(
            `${activeTab.topic}/__typing`,
            JSON.stringify({ user: username })
          );
        } catch {}
      }
    }
  };

  const send = async () => {
    if (!input.trim() && !selectedFile) return;
    if (!client || !activeTab) return;

    // ── Slash commands ──────────────────────────────────────────────────────
    const trimmed = input.trim();
    if (trimmed.startsWith('/')) {
      const [rawCmd, ...args] = trimmed.slice(1).split(' ');
      const cmd = rawCmd.toLowerCase();
      switch (cmd) {
        case 'me':
          if (args.length > 0) {
            client.publish(activeTab.topic, JSON.stringify(
              formatMessage('text', `_${username} ${args.join(' ')}_`, username)
            ));
          }
          setInput('');
          return;
        case 'shrug':
          client.publish(activeTab.topic, JSON.stringify(
            formatMessage('text', '¯\\_(ツ)_/¯', username)
          ));
          setInput('');
          return;
        case 'clear':
          setMessagesByTopic(prev => ({ ...prev, [activeTab.topic]: [] }));
          localStorage.removeItem(LS_PREFIX + activeTab.topic);
          setInput('');
          showToast({ title: 'History cleared', status: 'info', duration: 2000 });
          return;
        case 'help':
          showToast({
            title: 'Slash commands',
            description: '/me <action>  ·  /shrug  ·  /clear  ·  /help',
            status: 'info',
            duration: 5000,
          });
          setInput('');
          return;
        default:
          showToast({ title: `Unknown command: /${cmd}`, description: 'Type /help for a list.', status: 'warning', duration: 2500 });
          return;
      }
    }

    const expiryMs = EXPIRY_OPTIONS[expiryIndex].ms;
    const expiresAt = expiryMs > 0
      ? new Date(Date.now() + expiryMs).toISOString()
      : undefined;

    let messageData;
    if (selectedFile) {
      messageData = formatMessage('file', selectedFile.content, username, null, {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        ...(replyTo   ? { replyTo }         : {}),
        ...(viewOnce  ? { viewOnce: true }   : {}),
        ...(expiresAt ? { expiresAt }        : {}),
      });
      setSelectedFile(null);
      setViewOnce(false);
    } else if (urlPreview) {
      messageData = formatMessage('url', input.trim(), username, null, {
        ...urlPreview,
        ...(expiresAt ? { expiresAt } : {}),
      });
      setUrlPreview(null);
    } else {
      messageData = formatMessage('text', input.trim(), username, null, {
        ...(replyTo   ? { replyTo }   : {}),
        ...(expiresAt ? { expiresAt } : {}),
      });
    }

    // Schedule self-deletion for own disappearing messages
    if (expiresAt && messageData.id) {
      const msLeft = new Date(expiresAt).getTime() - Date.now();
      setTimeout(() => {
        setMessagesByTopic(prev => ({
          ...prev,
          [activeTab.topic]: (prev[activeTab.topic] || []).filter(m => m.id !== messageData.id),
        }));
      }, msLeft);
    }

    // Pillar 5: E2E encrypt text DMs when peer key is available
    const dmParsed = parseOneToOneTopic(activeTab.topic);
    if (dmParsed && messageData.type === 'text' && identity) {
      const peerName = normalizeUsername(dmParsed.userA) === normalizeUsername(username)
        ? dmParsed.userB : dmParsed.userA;
      const peerKey = peerKeys[peerName];
      if (peerKey?.ecdhPubKey) {
        try {
          const encData = await encrypt(messageData.content, peerKey.ecdhPubKey);
          if (encData) {
            messageData = { ...messageData, encrypted: encData, content: '[Encrypted]' };
          }
        } catch {}
      }
    }

    // Pillar 1: sign the message
    if (identity) {
      try {
        const { sig, sigPubKey } = (await sign(messageData)) || {};
        if (sig) {
          messageData = { ...messageData, sig, sigPubKey };
        }
      } catch {}
    }

    client.publish(activeTab.topic, JSON.stringify(messageData));
    setInput('');
    setReplyTo(null);
    // Always scroll to bottom after sending
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setUnseenCount(0);
    requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
  };

  const handleFileSelect = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedFile({ name: file.name, type: file.type, size: file.size, content: e.target.result });
    };
    reader.readAsDataURL(file);
  };

  const handleLocationShare = async () => {
    try {
      const location = await getLocation();
      client.publish(activeTab.topic, JSON.stringify(formatMessage('location', location, username)));
      showToast({ title: 'Location shared', description: 'Your location has been shared.', status: 'success', duration: 3000 });
    } catch {
      showToast({ title: 'Location error', description: 'Could not get location. Enable location services.', status: 'error', duration: 3000 });
    }
  };

  const handleDisconnectChat = (topic) => {
    client.unsubscribe(topic);
    client.publish(topic, JSON.stringify(formatMessage('text', `${username}: has disconnected`, 'system')));
    setChats((prev) => prev.filter((c) => c.name !== topic));
    setActiveTabIndex(0);
  };

  const handleReactionAdd = (messageId, emoji) => {
    // Update local state
    setReactions(prev => {
      const msg   = prev[messageId] || {};
      const users = msg[emoji] || [];
      if (users.includes(username)) return prev;
      return { ...prev, [messageId]: { ...msg, [emoji]: [...users, username] } };
    });
    // Pillar 4: broadcast over MQTT
    if (client && activeTab) {
      client.publish(activeTab.topic, JSON.stringify({
        id: `react_${Date.now()}`,
        type: 'reaction',
        targetId: messageId,
        emoji,
        action: 'add',
        sender: username,
        timestamp: new Date().toISOString(),
      }));
    }
  };

  const handleReactionRemove = (messageId, emoji) => {
    // Update local state
    setReactions(prev => {
      const msg   = prev[messageId] || {};
      const users = (msg[emoji] || []).filter(u => u !== username);
      const nextMsg = users.length > 0
        ? { ...msg, [emoji]: users }
        : (({ [emoji]: _, ...rest }) => rest)(msg);
      return { ...prev, [messageId]: nextMsg };
    });
    // Pillar 4: broadcast over MQTT
    if (client && activeTab) {
      client.publish(activeTab.topic, JSON.stringify({
        id: `react_${Date.now()}`,
        type: 'reaction',
        targetId: messageId,
        emoji,
        action: 'remove',
        sender: username,
        timestamp: new Date().toISOString(),
      }));
    }
  };

  const handleSearchResultClick = (message) => {
    setIsSearchOpen(false);
    scrollToMessage(message.id);
  };

  // ── Phase 2 handlers ───────────────────────────────────────────────────────

  const handleEdit = (msgId) => {
    const msg = currentMessages.find(m => m.id === msgId);
    if (!msg) return;
    setEditingId(msgId);
    setEditingText(msg.content || '');
  };

  const submitEdit = (msgId) => {
    if (!editingText.trim() || !client || !activeTab) return;
    client.publish(activeTab.topic, JSON.stringify({
      id: `edit_${Date.now()}`,
      type: 'edit',
      targetId: msgId,
      content: editingText.trim(),
      sender: username,
      timestamp: new Date().toISOString(),
    }));
    setEditingId(null);
    setEditingText('');
  };

  const handleDelete = (msgId) => {
    if (!client || !activeTab) return;
    client.publish(activeTab.topic, JSON.stringify({
      id: `del_${Date.now()}`,
      type: 'delete',
      targetId: msgId,
      sender: username,
      timestamp: new Date().toISOString(),
    }));
  };

  const handlePin = (msgId) => {
    const topic = activeTab?.topic;
    if (!topic) return;
    const currentlyPinned = pinnedByTopic[topic] === msgId;
    // Update local state
    setPinnedByTopic(prev => {
      if (currentlyPinned) {
        const { [topic]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [topic]: msgId };
    });
    // Pillar 4: broadcast pin event
    if (client) {
      client.publish(topic, JSON.stringify({
        id: `pin_${Date.now()}`,
        type: 'pin',
        targetTopic: topic,
        msgId: currentlyPinned ? null : msgId,
        action: currentlyPinned ? 'unpin' : 'pin',
        sender: username,
        timestamp: new Date().toISOString(),
      }));
    }
  };

  const insertMention = (user) => {
    setInput(prev => prev.replace(/@(\w*)$/, `@${user} `));
    setMentionActive(false);
    setMentionQuery('');
  };

  const handleGifSelect = (gif) => {
    if (!client || !activeTab) return;
    setIsGifOpen(false);
    client.publish(activeTab.topic, JSON.stringify({
      id: crypto.randomUUID(),
      type: 'gif',
      content: gif.title,
      gifUrl: gif.url,
      sender: username,
      timestamp: new Date().toISOString(),
    }));
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
  };

  // ── Theme tokens ────────────────────────────────────────────────────────────
  const bg = dark
    ? 'linear-gradient(145deg, #070b12 0%, #090e18 50%, #07100e 100%)'
    : 'linear-gradient(145deg, #dce8f5 0%, #e8e0f8 50%, #d4eee4 100%)';

  const glassPanel = dark
    ? { background: 'rgba(8,14,24,0.72)', border: '1px solid rgba(255,255,255,0.08)' }
    : { background: 'rgba(255,255,255,0.52)', border: '1px solid rgba(255,255,255,0.72)' };

  const glassSurface = dark
    ? { background: 'rgba(10,16,26,0.65)', border: '1px solid rgba(255,255,255,0.09)' }
    : { background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.78)' };

  const textPrimary   = dark ? '#eef2ff' : '#111827';
  const textSecondary = dark ? 'rgba(238,242,255,0.52)' : 'rgba(17,24,39,0.48)';
  const textTertiary  = dark ? 'rgba(238,242,255,0.28)' : 'rgba(17,24,39,0.28)';
  const dividerColor  = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

  const myBubble = { background: 'linear-gradient(135deg, #1e4aaa, #0a5e40)', color: '#fff' };
  const otherBubble = dark
    ? { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: textPrimary }
    : { background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.85)', color: textPrimary };

  const canSend = !!(input.trim() || selectedFile);

  // ── Connection status ──────────────────────────────────────────────────────
  const statusColor = status === 'connected' ? '#10b981'
    : status === 'connecting'  ? '#f59e0b'
    : '#ef4444';

  // ── Typing users for active tab ────────────────────────────────────────────
  const activeTypers = Array.from(typingUsers[activeTab?.topic] || []);

  // ── Phase 2 computed ───────────────────────────────────────────────────────
  const knownUsers = useMemo(() => {
    const s = new Set();
    currentMessages.forEach(m => {
      if (m.sender && m.sender !== 'system' && m.sender !== username) s.add(m.sender);
    });
    return Array.from(s);
  }, [currentMessages, username]);

  const mentionSuggestions = mentionActive
    ? knownUsers.filter(u => u.toLowerCase().startsWith(mentionQuery))
    : [];

  const pinnedMsgId = pinnedByTopic[activeTab?.topic] || null;
  const pinnedMsg   = pinnedMsgId ? currentMessages.find(m => m.id === pinnedMsgId) : null;

  // ── Phase 4 computed — image list for gallery ──────────────────────────────
  const imageMessages = useMemo(
    () => currentMessages.filter(m => m.type === 'file' && m.fileType?.startsWith('image/') && m.content),
    [currentMessages]
  );

  // Gallery keyboard navigation
  useEffect(() => {
    if (!galleryState) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  setGalleryState(s => s && { ...s, index: Math.max(0, s.index - 1) });
      if (e.key === 'ArrowRight') setGalleryState(s => s && { ...s, index: Math.min(s.images.length - 1, s.index + 1) });
      if (e.key === 'Escape')     setGalleryState(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [galleryState]);

  const openGallery = useCallback((file) => {
    const idx = imageMessages.findIndex(m => m.content === file.content);
    setGalleryState({ images: imageMessages, index: Math.max(0, idx) });
  }, [imageMessages]);

  // ── Message renderer ────────────────────────────────────────────────────────
  const renderMessage = (msg, index) => {
    const isSelf   = msg.sender === username;
    const isSystem = msg.sender === 'system';
    const key      = msg.id || index;
    const prevMsg  = currentMessages[index - 1];
    const showAvatar = !isSelf && !isSystem && prevMsg?.sender !== msg.sender;
    const isGrouped  = !isSelf && !isSystem && prevMsg?.sender === msg.sender;

    // Date divider — show when day changes between adjacent messages
    const showDivider = msg.timestamp && (
      !prevMsg?.timestamp ||
      new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString()
    );

    const dateDivider = showDivider ? (
      <div
        key={`divider-${key}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 0 8px',
        }}
      >
        <div style={{ flex: 1, height: 1, background: dividerColor }} />
        <span style={{
          fontSize: 11, fontWeight: 500, color: textTertiary,
          letterSpacing: '0.04em', whiteSpace: 'nowrap',
          background: dark ? 'rgba(8,14,24,0.7)' : 'rgba(255,255,255,0.6)',
          padding: '3px 10px', borderRadius: 99,
          border: `1px solid ${dividerColor}`,
          backdropFilter: 'blur(8px)',
        }}>
          {formatDateDivider(msg.timestamp)}
        </span>
        <div style={{ flex: 1, height: 1, background: dividerColor }} />
      </div>
    ) : null;

    if (isSystem) {
      return (
        <React.Fragment key={key}>
          {dateDivider}
          <div style={{ textAlign: 'center', fontSize: 11, color: textTertiary, padding: '6px 0' }}>
            {msg.content}
          </div>
        </React.Fragment>
      );
    }

    const timeStr = msg.timestamp
      ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : nowTime();

    // Read receipt: double-check when we've received any message after ours in this topic
    const lastRec = lastReceivedByTopic[activeTab?.topic] || '';
    const isRead  = isSelf && lastRec && lastRec >= (msg.timestamp || '');

    return (
      <React.Fragment key={key}>
        {dateDivider}
        <div
          id={msg.id ? `message-${msg.id}` : undefined}
          style={{
            display: 'flex',
            flexDirection: isSelf ? 'row-reverse' : 'row',
            alignItems: 'flex-end',
            gap: 10,
            marginTop: isGrouped ? 2 : 14,
            position: 'relative',
          }}
          onMouseEnter={() => setHoveredMsgId(key)}
          onMouseLeave={() => setHoveredMsgId(null)}
        >
          {!isSelf && (
            <div style={{ width: 32, flexShrink: 0 }}>
              {showAvatar && <Avatar user={msg.sender || '?'} size={32} />}
            </div>
          )}
          <div style={{ maxWidth: '62%', display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', position: 'relative' }}>
            {showAvatar && (
              <span style={{ fontSize: 11, fontWeight: 500, color: textTertiary, marginBottom: 4, paddingLeft: 2 }}>
                {msg.sender}
              </span>
            )}

            {/* Hover action toolbar */}
            {hoveredMsgId === key && editingId !== key && msg.id && (
              <div
                style={{
                  position: 'absolute',
                  top: showAvatar ? 18 : -36,
                  [isSelf ? 'right' : 'left']: 0,
                  display: 'flex', gap: 2,
                  background: dark ? 'rgba(8,14,24,0.94)' : 'rgba(255,255,255,0.96)',
                  border: dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 10, padding: '3px 5px',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  zIndex: 12,
                  color: dark ? 'rgba(238,242,255,0.7)' : 'rgba(17,24,39,0.6)',
                }}
              >
                <ActionIconBtn
                  title="Reply"
                  onClick={() => setReplyTo({ id: msg.id, sender: msg.sender, content: msg.content, type: msg.type })}
                >
                  <Reply size={13} />
                </ActionIconBtn>
                {isSelf && msg.type === 'text' && (
                  <ActionIconBtn title="Edit" onClick={() => handleEdit(msg.id)}>
                    <Edit3 size={13} />
                  </ActionIconBtn>
                )}
                <ActionIconBtn
                  title={pinnedMsgId === msg.id ? 'Unpin' : 'Pin'}
                  active={pinnedMsgId === msg.id}
                  onClick={() => handlePin(msg.id)}
                >
                  <Pin size={13} />
                </ActionIconBtn>
                {isSelf && (
                  <ActionIconBtn title="Delete" danger onClick={() => handleDelete(msg.id)}>
                    <Trash2 size={13} />
                  </ActionIconBtn>
                )}
              </div>
            )}

            <div
              style={{
                ...(isSelf ? myBubble : otherBubble),
                backdropFilter: isSelf ? 'none' : 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: isSelf ? 'none' : 'blur(20px) saturate(180%)',
                boxShadow: isSelf
                  ? '0 4px 20px rgba(30,80,180,0.28)'
                  : dark ? '0 2px 12px rgba(0,0,0,0.22)' : '0 2px 12px rgba(0,0,0,0.07)',
                padding: '10px 15px',
                borderRadius: isSelf ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                fontSize: 14,
                lineHeight: 1.55,
                wordBreak: 'break-word',
              }}
            >
              {/* Reply quote strip */}
              {msg.replyTo && (
                <div
                  onClick={() => msg.replyTo.id && scrollToMessage(msg.replyTo.id)}
                  style={{
                    borderLeft: `2px solid ${isSelf ? 'rgba(255,255,255,0.38)' : (dark ? 'rgba(96,165,250,0.5)' : 'rgba(30,74,170,0.35)')}`,
                    paddingLeft: 8, marginBottom: 8,
                    cursor: msg.replyTo.id ? 'pointer' : 'default',
                    opacity: 0.8,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                    {msg.replyTo.sender}
                  </div>
                  <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260, opacity: 0.75 }}>
                    {msg.replyTo.type === 'text'
                      ? (msg.replyTo.content || '').slice(0, 80)
                      : `[${msg.replyTo.type}]`}
                  </div>
                </div>
              )}

              {/* Inline editor */}
              {editingId === msg.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <textarea
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(msg.id); }
                      if (e.key === 'Escape') { setEditingId(null); setEditingText(''); }
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.28)',
                      borderRadius: 8, padding: '6px 10px',
                      color: 'inherit', resize: 'none',
                      fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                      outline: 'none', width: '100%', minHeight: 60,
                    }}
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => { setEditingId(null); setEditingText(''); }}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'inherit', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => submitEdit(msg.id)}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.22)', color: 'inherit', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {msg.type === 'text' && <MarkdownText text={msg.content} />}
                  {msg.type === 'file' && msg.viewOnce && msg.fileType?.startsWith('image/') ? (
                    seenViewOnce[msg.id] ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', opacity: 0.5, fontSize: 12 }}>
                        <EyeOff size={14} />
                        Photo opened
                      </div>
                    ) : (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSeenViewOnce(prev => ({ ...prev, [msg.id]: true }))}
                        onKeyDown={e => e.key === 'Enter' && setSeenViewOnce(prev => ({ ...prev, [msg.id]: true }))}
                        style={{ cursor: 'pointer', position: 'relative', lineHeight: 0, borderRadius: 10, overflow: 'hidden', userSelect: 'none' }}
                      >
                        <img
                          src={msg.content}
                          alt="view once"
                          style={{ display: 'block', maxWidth: '100%', maxHeight: 200, filter: 'blur(22px)', borderRadius: 10 }}
                        />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(0,0,0,0.22)' }}>
                          <Eye size={22} color="#fff" />
                          <span style={{ fontSize: 12, color: '#fff', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Tap to view</span>
                        </div>
                      </div>
                    )
                  ) : msg.type === 'file' ? (
                    <EnhancedFilePreview
                      file={{ name: msg.fileName, type: msg.fileType || '', size: msg.fileSize || 0, content: msg.content }}
                      dark={dark}
                      isSelf={isSelf}
                      onImageClick={msg.fileType?.startsWith('image/') ? openGallery : null}
                    />
                  ) : null}
                  {msg.type === 'gif' && msg.gifUrl && (
                    <div style={{ lineHeight: 0 }}>
                      <img
                        src={msg.gifUrl}
                        alt={msg.content || 'GIF'}
                        style={{ display: 'block', maxWidth: '100%', maxHeight: 260, borderRadius: 10, cursor: 'pointer' }}
                        onClick={() => window.open(msg.gifUrl, '_blank')}
                      />
                      <div style={{ fontSize: 10, color: isSelf ? 'rgba(255,255,255,0.45)' : textTertiary, marginTop: 4 }}>
                        GIF
                      </div>
                    </div>
                  )}
                  {msg.type === 'location' && <LocationShare location={msg} dark={dark} />}
                  {msg.type === 'url' && (
                    <UrlPreview url={msg.url} title={msg.title} description={msg.description} image={msg.image} theme={dark ? 'dark' : 'light'} />
                  )}
                </>
              )}
            </div>

            {/* Timestamp + verified badge + edited + expiry + read receipt */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, paddingLeft: 2, paddingRight: 2 }}>
              <span style={{ fontSize: 10, color: textTertiary }}>{timeStr}</span>
              {/* Pillar 1: signature verification badge */}
              {msg.sig && msg.id && (
                <span
                  title={verifiedMsgs[msg.id] === true ? 'Signature verified' : verifiedMsgs[msg.id] === false ? 'Signature invalid!' : 'Verifying...'}
                  style={{ display: 'flex', alignItems: 'center', color: verifiedMsgs[msg.id] === true ? '#10b981' : verifiedMsgs[msg.id] === false ? '#ef4444' : textTertiary }}
                >
                  {verifiedMsgs[msg.id] === true
                    ? <ShieldCheck size={10} />
                    : <Shield size={10} />}
                </span>
              )}
              {/* Pillar 5: E2E lock indicator */}
              {msg._decrypted && (
                <span title="End-to-end encrypted" style={{ display: 'flex', alignItems: 'center', color: '#10b981' }}>
                  <Lock size={9} />
                </span>
              )}
              {msg.edited && (
                <span style={{ fontSize: 9, color: textTertiary, fontStyle: 'italic' }}>(edited)</span>
              )}
              {msg.expiresAt && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 9, color: '#f59e0b' }}>
                  <Timer size={9} />
                </span>
              )}
              {msg.viewOnce && !seenViewOnce[msg.id] && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 9, color: '#a78bfa' }}>
                  <Eye size={9} />
                </span>
              )}
              {isSelf && (
                <span style={{ color: isRead ? (dark ? '#60a5fa' : '#1e4aaa') : textTertiary, display: 'flex', alignItems: 'center' }}>
                  {isRead ? <CheckCheck size={12} /> : <Check size={12} />}
                </span>
              )}
            </div>

            {msg.id && (
              <MessageReactions
                messageId={msg.id}
                reactions={reactions[msg.id] || {}}
                onReactionAdd={handleReactionAdd}
                onReactionRemove={handleReactionRemove}
                dark={dark}
                username={username}
              />
            )}
          </div>
        </div>
      </React.Fragment>
    );
  };

  // ── Slash command hint menu ────────────────────────────────────────────────
  const slashWord = input.startsWith('/') ? input.slice(1).split(' ')[0].toLowerCase() : '';
  const slashMatches = input.startsWith('/') && !input.slice(1).includes(' ')
    ? SLASH_CMDS.filter(c => c.cmd.startsWith(slashWord))
    : [];

  // ── Sidebar content (shared between desktop and mobile) ────────────────────
  const sidebarContent = (
    <>
      {/* Wordmark */}
      <div style={{ padding: '20px 20px 14px', borderBottom: `1px solid ${dividerColor}` }}>
        <div
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 22, fontStyle: 'italic', lineHeight: 1,
            backgroundImage: dark
              ? 'linear-gradient(135deg, #e0eaff 0%, #88c8f0 100%)'
              : 'linear-gradient(135deg, #111827 0%, #1e4aaa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Echo
        </div>
        <div style={{ fontSize: 10, color: textTertiary, marginTop: 4, letterSpacing: '0.06em', fontWeight: 600 }}>
          SECURE MESH CHAT
        </div>
      </div>

      {/* Profile row */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${dividerColor}`,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar user={username} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {username}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: textTertiary }}>{status}</span>
            </div>
          </div>
          <IconBtn dark={dark} title={dark ? 'Light mode' : 'Dark mode'} onClick={onToggleDark}>
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </IconBtn>
        </div>
        {/* Identity fingerprint */}
        {fingerprint && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 8px', borderRadius: 8,
              background: dark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)',
              border: '1px solid rgba(16,185,129,0.2)',
              cursor: 'pointer',
            }}
            title="Your identity fingerprint. Click to show options."
            onClick={() => setShowIdentityPanel(v => !v)}
          >
            <ShieldCheck size={11} color="#10b981" />
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#10b981', letterSpacing: '0.06em' }}>
              {fingerprint}
            </span>
          </div>
        )}
        {/* Identity panel */}
        {showIdentityPanel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm('This will erase your current identity and generate a new one. Peers will see your key as changed. Continue?')) return;
                await resetIdentity();
                setShowIdentityPanel(false);
                showToast({ title: 'Identity reset', description: 'New keypair generated.', status: 'info', duration: 3000 });
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                width: '100%', padding: '7px 10px', borderRadius: 8,
                border: '1px solid rgba(239,68,68,0.25)',
                background: 'rgba(239,68,68,0.07)',
                cursor: 'pointer', fontSize: 11,
                color: '#ef4444', fontFamily: "'DM Sans', sans-serif",
                textAlign: 'left',
              }}
            >
              <RefreshCw size={11} />
              Reset identity
            </button>
          </div>
        )}
      </div>

      {/* Chats list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 8px' }}>
          <span style={{ fontSize: 10, color: textTertiary, letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase' }}>
            Chats
          </span>
          <button
            type="button"
            title="New chat"
            onClick={() => setIsAddChatOpen(true)}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              border: dark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(0,0,0,0.12)',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: textTertiary,
              transition: 'all 0.18s ease',
            }}
          >
            <Plus size={13} />
          </button>
        </div>

        {tabs.map((tab, index) => {
          const active = activeTabIndex === index;
          return (
            <div
              key={tab.topic}
              onClick={() => {
                setActiveTabIndex(index);
                if (isMobile) setSidebarOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px',
                borderRadius: 12,
                border: active
                  ? dark ? '1px solid rgba(148,163,184,0.18)' : '1px solid rgba(30,80,180,0.16)'
                  : '1px solid transparent',
                background: active
                  ? dark ? 'rgba(96,165,250,0.1)' : 'rgba(30,80,180,0.07)'
                  : 'transparent',
                cursor: 'pointer',
                marginBottom: 3,
                transition: 'all 0.18s ease',
                color: active ? textPrimary : textSecondary,
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: active
                  ? dark ? '#60a5fa' : '#1e4aaa'
                  : dark ? 'rgba(255,255,255,0.18)' : 'rgba(17,24,39,0.18)',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: active ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tab.label}
                </div>
              </div>
              {index > 0 && (
                <button
                  type="button"
                  title="Leave chat"
                  onClick={(e) => { e.stopPropagation(); handleDisconnectChat(tab.topic); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: textTertiary, padding: 0, lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Sign out */}
      <div style={{ padding: '10px 12px 16px' }}>
        <button
          type="button"
          onClick={onSignOut}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 12,
            border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
            background: 'transparent', cursor: 'pointer',
            fontSize: 12, color: textTertiary,
            fontFamily: "'DM Sans', sans-serif",
            transition: 'all 0.2s ease', textAlign: 'left',
            letterSpacing: '0.01em',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        display: 'flex',
        fontFamily: "'DM Sans', sans-serif",
        background: bg, color: textPrimary,
        overflow: 'hidden',
        transition: 'background 0.5s ease',
      }}
    >
      {/* Background orbs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        {dark ? (
          <>
            <div style={{ position: 'absolute', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, #0f2050 0%, transparent 70%)', top: -140, left: -120, filter: 'blur(80px)', opacity: 0.55 }} />
            <div style={{ position: 'absolute', width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle, #072a1c 0%, transparent 70%)', bottom: -100, right: -100, filter: 'blur(80px)', opacity: 0.55 }} />
          </>
        ) : (
          <>
            <div style={{ position: 'absolute', width: 640, height: 640, borderRadius: '50%', background: 'radial-gradient(circle, #b8d4f0 0%, transparent 70%)', top: -160, left: -130, filter: 'blur(80px)', opacity: 0.55 }} />
            <div style={{ position: 'absolute', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, #c4e8d4 0%, transparent 70%)', bottom: -110, right: -90, filter: 'blur(80px)', opacity: 0.55 }} />
          </>
        )}
      </div>

      {/* Modals */}
      <AddChatFormModal
        isOpen={isAddChatOpen}
        onClose={() => setIsAddChatOpen(false)}
        setChats={setChats}
        client={client}
        chats={chats}
        username={username}
        dark={dark}
      />

      {/* ── Mobile sidebar overlay backdrop ────────────────────────────── */}
      {isMobile && sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 19,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <aside
          style={{
            width: 248, flexShrink: 0,
            ...glassPanel,
            backdropFilter: 'blur(32px) saturate(200%)',
            WebkitBackdropFilter: 'blur(32px) saturate(200%)',
            borderLeft: 'none', borderTop: 'none', borderBottom: 'none',
            borderRight: glassPanel.border,
            display: 'flex', flexDirection: 'column',
            zIndex: isMobile ? 20 : 10,
            // On mobile, sidebar slides over main content
            ...(isMobile ? {
              position: 'fixed', inset: '0 auto 0 0',
            } : {
              position: 'relative',
            }),
          }}
        >
          {sidebarContent}
        </aside>
      )}

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <header
          style={{
            ...glassSurface,
            backdropFilter: 'blur(32px) saturate(200%)',
            WebkitBackdropFilter: 'blur(32px) saturate(200%)',
            borderLeft: 'none', borderRight: 'none', borderTop: 'none',
            borderBottom: glassSurface.border,
            padding: '12px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
            zIndex: 5, flexShrink: 0,
          }}
        >
          <IconBtn dark={dark} title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={16} />
          </IconBtn>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
              <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeTab?.topic === 'chat' ? '#general' : activeTab?.label}
              </span>
              {/* Pillar 5: E2E lock indicator for DMs */}
              {activeTab && parseOneToOneTopic(activeTab.topic) && (() => {
                const dmP = parseOneToOneTopic(activeTab.topic);
                const peerName = dmP && normalizeUsername(dmP.userA) === normalizeUsername(username)
                  ? dmP.userB : dmP?.userA;
                const hasPeerKey = peerName && peerKeys[peerName]?.ecdhPubKey && identity;
                return hasPeerKey ? (
                  <Lock size={12} color="#10b981" title="End-to-end encrypted" />
                ) : null;
              })()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: textTertiary }}>
                {status === 'connected'
                  ? activeTab?.topic === 'chat' ? 'General room' : `Direct message with ${activeTab?.label}`
                  : status}
              </span>
            </div>
          </div>

          {/* Mute toggle for current chat */}
          <IconBtn
            dark={dark}
            title={mutedTopics.has(activeTab?.topic) ? 'Unmute notifications' : 'Mute notifications'}
            active={mutedTopics.has(activeTab?.topic)}
            onClick={() => {
              const topic = activeTab?.topic;
              if (!topic) return;
              setMutedTopics(prev => {
                const next = new Set(prev);
                if (next.has(topic)) next.delete(topic);
                else next.add(topic);
                return next;
              });
            }}
          >
            {mutedTopics.has(activeTab?.topic) ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </IconBtn>
          <IconBtn dark={dark} title="Search messages (⌘K)" onClick={() => setIsSearchOpen(true)}>
            <Search size={15} />
          </IconBtn>
        </header>

        {/* Pinned message banner */}
        {pinnedMsg && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => scrollToMessage(pinnedMsgId)}
            onKeyDown={e => e.key === 'Enter' && scrollToMessage(pinnedMsgId)}
            style={{
              ...glassSurface,
              borderLeft: 'none', borderRight: 'none', borderTop: 'none',
              borderBottom: glassSurface.border,
              padding: '7px 20px',
              display: 'flex', alignItems: 'center', gap: 10,
              flexShrink: 0, zIndex: 4, cursor: 'pointer',
            }}
          >
            <Pin size={12} style={{ color: dark ? '#60a5fa' : '#1e4aaa', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 6, alignItems: 'baseline' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: dark ? '#60a5fa' : '#1e4aaa', flexShrink: 0 }}>
                {pinnedMsg.sender}
              </span>
              <span style={{ fontSize: 11, color: textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pinnedMsg.type === 'text' ? (pinnedMsg.content || '').slice(0, 80) : `[${pinnedMsg.type}]`}
              </span>
            </div>
            <button
              type="button"
              aria-label="Unpin"
              onClick={e => { e.stopPropagation(); handlePin(pinnedMsgId); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: textTertiary, padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Messages — drag-anywhere wrapper */}
        <div
          {...getDragRootProps()}
          style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          <input {...getDragInputProps()} />

          {/* Drop overlay */}
          {isDragActive && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none',
              background: dark ? 'rgba(96,165,250,0.06)' : 'rgba(30,74,170,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                background: dark ? 'rgba(8,14,24,0.88)' : 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                border: dark ? '1px solid rgba(96,165,250,0.35)' : '1px solid rgba(30,74,170,0.25)',
                borderRadius: 18, padding: '20px 36px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              }}>
                <Paperclip size={26} style={{ color: dark ? '#60a5fa' : '#1e4aaa' }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: dark ? '#60a5fa' : '#1e4aaa', fontFamily: "'DM Sans', sans-serif" }}>
                  Drop to attach
                </span>
              </div>
            </div>
          )}

          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 28px 12px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
          {/* Pillar 2: catch-up indicator shown after reconnect */}
          {catching && (
            <div style={{ textAlign: 'center', color: '#f59e0b', fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
              Catching up on missed messages...
            </div>
          )}
          {currentMessages.length === 0 && !catching && (
            <div style={{ textAlign: 'center', color: textTertiary, fontSize: 13, marginTop: 60 }}>
              No messages yet. Say hello!
            </div>
          )}
          {currentMessages.map((msg, i) => renderMessage(msg, i))}

          {/* Typing indicator */}
          {activeTypers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 4px', marginTop: 6 }}>
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: textTertiary,
                      animation: `typing-bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 12, color: textTertiary, fontStyle: 'italic' }}>
                {activeTypers.join(', ')} {activeTypers.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />

          {/* New messages pill — sticky at bottom of scroll area */}
          {unseenCount > 0 && (
            <button
              type="button"
              onClick={scrollToBottom}
              style={{
                position: 'sticky',
                bottom: 12,
                alignSelf: 'center',
                background: 'linear-gradient(135deg, #1e4aaa, #0a5e40)',
                color: '#fff',
                border: 'none',
                borderRadius: 20,
                padding: '6px 16px',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(30,80,180,0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.18s ease',
              }}
            >
              <ChevronDown size={13} />
              {unseenCount} new {unseenCount === 1 ? 'message' : 'messages'}
            </button>
          )}
          </div>{/* end inner scroll div */}
        </div>{/* end drag wrapper */}

        {/* Slash command hint menu */}
        {slashMatches.length > 0 && (
          <div
            style={{
              ...glassSurface,
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
              borderTop: glassSurface.border,
              padding: '6px 10px',
              flexShrink: 0,
              display: 'flex', flexDirection: 'column', gap: 2,
            }}
          >
            {slashMatches.map(c => (
              <button
                key={c.cmd}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setInput(`/${c.cmd}${c.args ? ' ' : ''}`); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid transparent',
                  cursor: 'pointer', textAlign: 'left', outline: 'none',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: dark ? '#60a5fa' : '#1e4aaa', minWidth: 80 }}>
                  /{c.cmd}
                </span>
                {c.args && (
                  <span style={{ fontSize: 12, color: textTertiary }}>{c.args}</span>
                )}
                <span style={{ fontSize: 12, color: textSecondary, marginLeft: 'auto' }}>{c.desc}</span>
              </button>
            ))}
          </div>
        )}

        {/* @mention suggestions popup */}
        {mentionSuggestions.length > 0 && (
          <div
            style={{
              ...glassSurface,
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
              borderTop: glassSurface.border,
              padding: '6px 10px',
              flexShrink: 0,
              display: 'flex', flexDirection: 'column', gap: 2,
            }}
          >
            {mentionSuggestions.map(user => (
              <button
                key={user}
                type="button"
                onMouseDown={e => { e.preventDefault(); insertMention(user); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '6px 10px', borderRadius: 8,
                  background: 'transparent', border: '1px solid transparent',
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  color: textPrimary, fontSize: 13, textAlign: 'left',
                  transition: 'background 0.12s ease', outline: 'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Avatar user={user} size={22} />
                <span style={{ fontWeight: 500 }}>@{user}</span>
              </button>
            ))}
          </div>
        )}

        {/* Reply-to strip */}
        {replyTo && (
          <div
            style={{
              ...glassSurface,
              borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
              borderTop: glassSurface.border,
              padding: '8px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
              flexShrink: 0,
            }}
          >
            <Reply size={13} style={{ color: dark ? '#60a5fa' : '#1e4aaa', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: dark ? '#60a5fa' : '#1e4aaa', marginRight: 6 }}>
                {replyTo.sender}
              </span>
              <span style={{ fontSize: 12, color: textSecondary, display: 'inline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {replyTo.type === 'text' ? (replyTo.content || '').slice(0, 60) : `[${replyTo.type}]`}
              </span>
            </div>
            <button
              type="button"
              aria-label="Cancel reply"
              onClick={() => setReplyTo(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: textTertiary, padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Selected file preview */}
        {selectedFile && (
          <div
            style={{
              ...glassSurface,
              borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
              borderTop: glassSurface.border,
              padding: '10px 20px',
              display: 'flex', alignItems: 'center', gap: 10,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 13, color: textSecondary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedFile.name}
            </span>
            {/* View-once toggle — only for images */}
            {selectedFile.type?.startsWith('image/') && (
              <button
                type="button"
                title={viewOnce ? 'View once enabled' : 'Enable view once'}
                onClick={() => setViewOnce(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 9px', borderRadius: 8, cursor: 'pointer', outline: 'none',
                  border: viewOnce ? '1px solid rgba(167,139,250,0.4)' : `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                  background: viewOnce ? 'rgba(167,139,250,0.12)' : 'transparent',
                  color: viewOnce ? '#a78bfa' : textTertiary,
                  fontSize: 11, fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <Eye size={12} />
                {viewOnce ? 'View once' : 'Once'}
              </button>
            )}
            <button
              type="button"
              onClick={() => { setSelectedFile(null); setViewOnce(false); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: textTertiary, display: 'flex', alignItems: 'center', flexShrink: 0 }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* URL preview */}
        {urlPreview && (
          <div
            style={{
              ...glassSurface,
              borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
              borderTop: glassSurface.border,
              padding: '10px 20px',
              flexShrink: 0,
            }}
          >
            <UrlPreview {...urlPreview} theme={dark ? 'dark' : 'light'} />
          </div>
        )}

        {/* Input bar */}
        <div
          style={{
            ...glassSurface,
            backdropFilter: 'blur(32px) saturate(200%)',
            WebkitBackdropFilter: 'blur(32px) saturate(200%)',
            borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
            borderTop: glassSurface.border,
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0,
          }}
        >
          <IconBtn dark={dark} title="Attach file" onClick={() => setIsFileOpen(true)}>
            <Paperclip size={17} />
          </IconBtn>
          <IconBtn dark={dark} title="Share location" onClick={handleLocationShare}>
            <MapPin size={17} />
          </IconBtn>
          <VoiceRecorder
            dark={dark}
            onRecordingComplete={(file) => {
              setSelectedFile(file);
              showToast({ title: 'Voice note ready', description: 'Press send to share.', status: 'success', duration: 2000 });
            }}
          />
          {/* Disappearing messages timer */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              title={`Disappearing messages: ${EXPIRY_OPTIONS[expiryIndex].label}`}
              onClick={() => setExpiryIndex(i => (i + 1) % EXPIRY_OPTIONS.length)}
              style={{
                height: 36, borderRadius: 18,
                padding: expiryIndex > 0 ? '0 10px' : '0',
                width: expiryIndex > 0 ? 'auto' : 36,
                border: expiryIndex > 0
                  ? '1px solid rgba(245,158,11,0.4)'
                  : dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.55)',
                background: expiryIndex > 0
                  ? 'rgba(245,158,11,0.12)'
                  : dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.5)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                cursor: 'pointer', outline: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                flexShrink: 0,
                color: expiryIndex > 0 ? '#f59e0b' : dark ? 'rgba(238,242,255,0.6)' : 'rgba(17,24,39,0.55)',
                transition: 'all 0.18s ease',
                fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
              }}
            >
              <Timer size={15} />
              {expiryIndex > 0 && EXPIRY_OPTIONS[expiryIndex].label}
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <IconBtn dark={dark} title="Send GIF" onClick={() => setIsGifOpen(v => !v)}>
              <Film size={16} />
            </IconBtn>
            {isGifOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 10px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 60,
                }}
              >
                <GifPicker
                  dark={dark}
                  onSelect={handleGifSelect}
                  onClose={() => setIsGifOpen(false)}
                />
              </div>
            )}
          </div>

          {/* Text input */}
          <div
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center',
              background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)',
              border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.75)',
              borderRadius: 14,
              padding: '0 14px',
              gap: 8, minHeight: 44,
            }}
          >
            <input
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder={`Message ${activeTab?.topic === 'chat' ? '#general' : activeTab?.label}... (Shift+Enter for newline)`}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 14, padding: '10px 0',
                color: textPrimary, fontFamily: "'DM Sans', sans-serif",
              }}
            />
            <EmojiPickerButton
              onEmojiSelect={(emoji) => setInput((prev) => prev + emoji)}
              dark={dark}
            />
          </div>

          {/* Send */}
          <button
            type="button"
            onClick={send}
            title="Send message"
            style={{
              width: 44, height: 44, borderRadius: '50%',
              border: 'none',
              background: canSend
                ? 'linear-gradient(135deg, #1e4aaa, #0a5e40)'
                : dark ? 'rgba(255,255,255,0.08)' : 'rgba(200,210,220,0.4)',
              color: canSend ? '#fff' : textTertiary,
              cursor: canSend ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: canSend ? '0 4px 18px rgba(30,80,180,0.32)' : 'none',
              transition: 'all 0.2s ease',
              flexShrink: 0, outline: 'none',
            }}
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </main>

      {/* ── File upload modal ──────────────────────────────────────────── */}
      {isFileOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: dark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.28)',
            padding: 16,
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsFileOpen(false); }}
        >
          <div
            style={{
              ...glassPanel,
              backdropFilter: 'blur(32px) saturate(200%)',
              WebkitBackdropFilter: 'blur(32px) saturate(200%)',
              borderRadius: 24, padding: 28,
              width: '100%', maxWidth: 480,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: textPrimary }}>Attach File</span>
              <IconBtn dark={dark} title="Close" onClick={() => setIsFileOpen(false)} style={{ width: 32, height: 32 }}>
                <X size={15} />
              </IconBtn>
            </div>
            <FileUpload onFileSelect={(file) => { handleFileSelect(file); setIsFileOpen(false); }} dark={dark} />
          </div>
        </div>
      )}

      {/* ── Image gallery lightbox ────────────────────────────────────── */}
      {galleryState && (() => {
        const { images, index } = galleryState;
        const current = images[index];
        if (!current) return null;
        return (
          <div
            onClick={() => setGalleryState(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.93)',
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'zoom-out',
            }}
          >
            {/* Top bar */}
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
              }}
            >
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>
                {index + 1} / {images.length}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  title="Download"
                  onClick={() => { const a = document.createElement('a'); a.href = current.content; a.download = current.fileName || 'image'; a.click(); }}
                  style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <button
                  type="button"
                  title="Close"
                  onClick={() => setGalleryState(null)}
                  style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Prev arrow */}
            {index > 0 && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setGalleryState(s => ({ ...s, index: s.index - 1 })); }}
                style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none', zIndex: 1 }}
              >
                <ChevronLeft size={20} />
              </button>
            )}

            {/* Image */}
            <img
              src={current.content}
              alt={current.fileName || ''}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '84vw', maxHeight: '76vh', objectFit: 'contain', borderRadius: 10, boxShadow: '0 24px 80px rgba(0,0,0,0.6)', userSelect: 'none' }}
            />

            {/* Next arrow */}
            {index < images.length - 1 && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setGalleryState(s => ({ ...s, index: s.index + 1 })); }}
                style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none', zIndex: 1 }}
              >
                <ChevronRight size={20} />
              </button>
            )}

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  display: 'flex', justifyContent: 'center', gap: 6,
                  padding: '14px 20px',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                  overflowX: 'auto',
                }}
              >
                {images.map((img, i) => (
                  <button
                    key={img.id || i}
                    type="button"
                    onClick={() => setGalleryState(s => ({ ...s, index: i }))}
                    style={{
                      width: 44, height: 44, borderRadius: 8, overflow: 'hidden',
                      border: i === index ? '2px solid rgba(255,255,255,0.9)' : '2px solid transparent',
                      padding: 0, cursor: 'pointer', flexShrink: 0,
                      opacity: i === index ? 1 : 0.55,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <img src={img.content} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            )}

            {/* Caption */}
            <div style={{ position: 'absolute', bottom: images.length > 1 ? 80 : 20, left: '50%', transform: 'translateX(-50%)', fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
              {current.fileName}
            </div>
          </div>
        );
      })()}

      {/* ── Search modal ───────────────────────────────────────────────── */}
      {isSearchOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: dark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.28)',
            padding: 16,
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsSearchOpen(false); }}
        >
          <div
            style={{
              ...glassPanel,
              backdropFilter: 'blur(32px) saturate(200%)',
              WebkitBackdropFilter: 'blur(32px) saturate(200%)',
              borderRadius: 24, padding: 28,
              width: '100%', maxWidth: 560,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: textPrimary }}>Search Messages</span>
              <IconBtn dark={dark} title="Close" onClick={() => setIsSearchOpen(false)} style={{ width: 32, height: 32 }}>
                <X size={15} />
              </IconBtn>
            </div>
            <MessageSearch messages={currentMessages} onSearchResultClick={handleSearchResultClick} dark={dark} />
          </div>
        </div>
      )}
    </div>
  );
}
