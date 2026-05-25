import React, { useEffect, useRef, useState } from 'react';
import Login from './components/Login';
import ChatPage from './components/ChatPage';
import InstallPrompt from './components/InstallPrompt';
import { useToast } from './context/ToastContext';
import { useMqtt } from './context/MqttContext';

// Bump this string any time you want to force-wipe all cached data for all users
const STORAGE_VERSION = 'v4';

function wipeStaleStorage() {
  const saved = localStorage.getItem('echo_storage_version');
  if (saved === STORAGE_VERSION) return;

  // Clear everything except the stable client ID and storage version marker
  const keep = new Set(['echo_cid']);
  Object.keys(localStorage)
    .filter(k => k.startsWith('echo_') && !keep.has(k))
    .forEach(k => localStorage.removeItem(k));

  localStorage.setItem('echo_storage_version', STORAGE_VERSION);
}
wipeStaleStorage();

function App() {
  const [username, setUsername] = useState(() => localStorage.getItem('echo_username') || '');
  const [dark, setDark]         = useState(() => localStorage.getItem('echo_dark') === 'true');
  const { showToast }           = useToast();
  const { status, error, connect, disconnect } = useMqtt();
  const lastStatusRef = useRef(status);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('echo_dark', String(dark));
  }, [dark]);

  // Auto-reconnect on page reload if a username was saved
  useEffect(() => {
    const saved = localStorage.getItem('echo_username');
    if (saved) connect(saved).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async (nextUsername) => {
    try {
      await connect(nextUsername);
      setUsername(nextUsername);
      localStorage.setItem('echo_username', nextUsername);
    } catch (err) {
      console.error('[Echo] connect failed:', err);
      showToast({
        title: 'Connection failed.',
        description: err?.message || 'Could not reach the broker. Check your network.',
        status: 'error',
        duration: 6000,
      });
    }
  };

  useEffect(() => {
    if (lastStatusRef.current === status) return;

    if (status === 'error' && error) {
      showToast({
        title: 'Connection error.',
        description: error.message || 'Something went wrong.',
        status: 'error',
        duration: 4000,
      });
    }

    lastStatusRef.current = status;
  }, [status, error, showToast]);

  const handleSignOut = () => {
    disconnect();
    setUsername('');
    localStorage.removeItem('echo_username');
  };

  if (!username) {
    return <Login onEnter={handleConnect} dark={dark} onToggleDark={() => setDark(d => !d)} />;
  }

  return (
    <>
      <ChatPage
        username={username}
        dark={dark}
        onToggleDark={() => setDark(d => !d)}
        onSignOut={handleSignOut}
      />
      <InstallPrompt dark={dark} />
    </>
  );
}

export default App;
