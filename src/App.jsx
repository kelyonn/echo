import React, { useEffect, useRef, useState } from 'react';
import Login from './components/Login';
import ChatPage from './components/ChatPage';
import InstallPrompt from './components/InstallPrompt';
import { useToast } from './context/ToastContext';
import { useMqtt } from './context/MqttContext';

// One-time cleanup of stale keys from old identity system
function cleanStaleStorage() {
  ['echo_tofu', 'echo_identity'].forEach(k => localStorage.removeItem(k));
}
cleanStaleStorage();

function App() {
  // Persist username so page reload keeps you logged in
  const [username, setUsername] = useState(() => localStorage.getItem('echo_username') || '');
  const [dark, setDark]         = useState(() => localStorage.getItem('echo_dark') === 'true');
  const { showToast }           = useToast();
  const { status, error, connect, disconnect } = useMqtt();
  const lastStatusRef = useRef(status);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('echo_dark', dark);
  }, [dark]);

  // Auto-reconnect on page reload if a username was saved
  useEffect(() => {
    const saved = localStorage.getItem('echo_username');
    if (saved) {
      connect(saved).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async (nextUsername) => {
    try {
      await connect(nextUsername);
      setUsername(nextUsername);
      localStorage.setItem('echo_username', nextUsername);
      showToast({
        title: 'Connected.',
        description: `Welcome to Echo, ${nextUsername}.`,
        status: 'success',
        duration: 3000,
      });
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

    // Disconnected = brief drop, auto-reconnect will fire — don't log the user out
    if (status === 'disconnected' && username) {
      showToast({
        title: 'Connection dropped.',
        description: 'Reconnecting automatically...',
        status: 'warning',
        duration: 3000,
      });
      // Do NOT clear username — let MQTT auto-reconnect restore the session
    }

    if (status === 'error' && error) {
      showToast({
        title: 'Connection error.',
        description: error.message || 'Something went wrong.',
        status: 'error',
        duration: 4000,
      });
    }

    lastStatusRef.current = status;
  }, [status, error, username, showToast]);

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
