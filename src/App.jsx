import React, { useEffect, useRef, useState } from 'react';
import Login from './components/Login';
import ChatPage from './components/ChatPage';
import InstallPrompt from './components/InstallPrompt';
import { useToast } from './context/ToastContext';
import { useMqtt } from './context/MqttContext';

function App() {
  const [username, setUsername] = useState('');
  const [dark, setDark] = useState(false);
  const { showToast } = useToast();
  const { status, error, connect, disconnect } = useMqtt();
  const lastStatusRef = useRef(status);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const handleToggleDark = () => {
    setDark((current) => !current);
  };

  const handleConnect = async (nextUsername) => {
    try {
      await connect(nextUsername);
      setUsername(nextUsername);
      showToast({
        title: 'Connection successful.',
        description: 'You have connected successfully, welcome to Echo!',
        status: 'success',
        duration: 4000,
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
    if (lastStatusRef.current === status) {
      return;
    }

    if (status === 'disconnected') {
      showToast({
        title: 'Oops..',
        description:
          'You have been disconnected. Either by timeout or voluntarily by another user connected with your username',
        status: 'warning',
        duration: 4000,
      });
      setUsername('');
    }

    if (status === 'error' && error) {
      showToast({
        title: 'Oops..',
        description: 'An error has occurred: ' + error.message,
        status: 'error',
        duration: 4000,
      });
    }

    lastStatusRef.current = status;
  }, [status, error, showToast]);

  const handleSignOut = () => {
    disconnect();
    setUsername('');
  };

  if (!username) {
    return (
      <Login onEnter={handleConnect} dark={dark} onToggleDark={handleToggleDark} />
    );
  }

  return (
    <>
      <ChatPage
        username={username}
        dark={dark}
        onToggleDark={handleToggleDark}
        onSignOut={handleSignOut}
      />
      <InstallPrompt dark={dark} />
    </>
  );
}

export default App;
