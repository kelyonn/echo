import React, { useEffect, useRef, useState } from 'react';
import { FiPaperclip, FiMapPin, FiX, FiSearch } from 'react-icons/fi';
import FileUpload from './FileUpload';
import UrlPreview from './UrlPreview';
import LocationShare from './LocationShare';
import EmojiPickerButton from './EmojiPickerButton';
import MessageSearch from './MessageSearch';
import MessageReactions from './MessageReactions';
import EnhancedFilePreview from './EnhancedFilePreview';
import { formatMessage, parseMessage } from '../utils/messageFormatter';
import { getLocation } from '../utils/location';
import { isValidUrl, getUrlPreview } from '../utils/url';
import { isSameOneToOneTopic } from '../utils/topic';
import { useToast } from '../context/ToastContext';

const Chat = ({ username, client, topicMqtt, dark = false, onToggleDark }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [urlPreview, setUrlPreview] = useState(null);
  const messagesEndRef = useRef(null);
  const { showToast } = useToast();
  const [isFileOpen, setIsFileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [theme, setTheme] = useState(dark ? 'dark' : 'light'); // 'light', 'dark', 'ocean', 'forest', 'sunset'
  const [reactions, setReactions] = useState({});

  const themeColors = {
    light: {
      bg: 'white',
      text: 'black',
      primary: 'blue.500',
      secondary: 'gray.100',
      accent: 'blue.200',
      messageBg: 'gray.100',
      messageText: 'black',
      inputBg: 'white',
      inputBorder: 'gray.200',
      modalBg: 'white',
      modalText: 'black'
    },
    dark: {
      bg: 'gray.900',
      text: 'white',
      primary: 'blue.300',
      secondary: 'gray.800',
      accent: 'blue.400',
      messageBg: 'gray.700',
      messageText: 'white',
      inputBg: 'gray.700',
      inputBorder: 'gray.600',
      modalBg: 'gray.800',
      modalText: 'white'
    },
    ocean: {
      bg: 'blue.900',
      text: 'white',
      primary: 'cyan.300',
      secondary: 'blue.800',
      accent: 'cyan.400',
      messageBg: 'blue.700',
      messageText: 'white',
      inputBg: 'blue.700',
      inputBorder: 'blue.600',
      modalBg: 'blue.800',
      modalText: 'white'
    },
    forest: {
      bg: 'green.900',
      text: 'white',
      primary: 'green.300',
      secondary: 'green.800',
      accent: 'green.400',
      messageBg: 'green.700',
      messageText: 'white',
      inputBg: 'green.700',
      inputBorder: 'green.600',
      modalBg: 'green.800',
      modalText: 'white'
    },
    sunset: {
      bg: 'orange.900',
      text: 'white',
      primary: 'orange.300',
      secondary: 'orange.800',
      accent: 'orange.400',
      messageBg: 'orange.700',
      messageText: 'white',
      inputBg: 'orange.700',
      inputBorder: 'orange.600',
      modalBg: 'orange.800',
      modalText: 'white'
    }
  };

  const currentTheme = themeColors[theme];

  useEffect(() => {
    const storedTheme = localStorage.getItem('chatTheme');
    if (storedTheme && themeColors[storedTheme]) {
      setTheme(storedTheme);
    } else if (dark) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    if (dark) {
      setTheme('dark');
    }
  }, [dark]);

  useEffect(() => {
    localStorage.setItem('chatTheme', theme);
  }, [theme]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleMessageChange = event => {
    const text = event.target.value;
    setMessage(text);

    // Check for URLs in the message
    const words = text.split(' ');
    const url = words.find(word => isValidUrl(word));
    if (url) {
      getUrlPreview(url).then(preview => {
        if (preview) setUrlPreview(preview);
      });
    } else {
      setUrlPreview(null);
    }
  };

  const handleSubmit = event => {
    event.preventDefault();
    if (!message.trim() && !selectedFile && !currentLocation) return;

    let messageData;
    if (selectedFile) {
      messageData = formatMessage('file', selectedFile.content, username, null, {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
      });
      setSelectedFile(null);
    } else if (currentLocation) {
      messageData = formatMessage('location', currentLocation, username);
      setCurrentLocation(null);
    } else if (urlPreview) {
      messageData = formatMessage('url', message.trim(), username, null, urlPreview);
      setUrlPreview(null);
    } else {
      messageData = formatMessage('text', message, username);
    }

    client.publish(topicMqtt, JSON.stringify(messageData));
    setMessage('');
  };

  const handleFileSelect = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedFile({
        name: file.name,
        type: file.type,
        size: file.size,
        content: e.target.result,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleLocationShare = async () => {
    try {
      const location = await getLocation();
      const messageData = formatMessage('location', location, username);
      client.publish(topicMqtt, JSON.stringify(messageData));
      showToast({
        title: 'Location shared',
        description: 'Your location has been shared with the chat',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Could not get location. Please make sure location services are enabled.',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleEmojiSelect = (emoji) => {
    setMessage(prev => prev + emoji);
  };

  const handleReactionAdd = (messageId, emoji) => {
    if (!messageId) {
      return;
    }
    setReactions(prev => {
      const current = prev[emoji] || [];
      if (current.includes(messageId)) {
        return prev;
      }
      return {
        ...prev,
        [emoji]: [...current, messageId],
      };
    });
  };

  const handleReactionRemove = (messageId, emoji) => {
    if (!messageId) {
      return;
    }
    setReactions(prev => {
      const current = prev[emoji] || [];
      const next = current.filter(id => id !== messageId);
      if (next.length === 0) {
        const { [emoji]: _removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [emoji]: next,
      };
    });
  };

  const handleMessage = (currentTopic, message) => {
    const isMatchingTopic =
      currentTopic === topicMqtt || isSameOneToOneTopic(currentTopic, topicMqtt);

    if (isMatchingTopic) {
      const parsedMessage = parseMessage(message.toString());
      setMessages(messages => [...messages, parsedMessage]);

      // Update users list
      if (parsedMessage.sender && !users.includes(parsedMessage.sender)) {
        setUsers(users => [...users, parsedMessage.sender]);
      }
    }
  };

  useEffect(() => {
    client.on('message', handleMessage);
    return () => {
      client.off('message', handleMessage);
    };
  }, [client, topicMqtt]);

  const renderMessage = (message, index) => {
    const isCurrentUser = message.sender === username;
    const isSystem = message.sender === 'system';
    const messageKey = message.id || index;

    if (isSystem) {
      return (
        <div
          key={messageKey}
          id={message.id ? `message-${message.id}` : undefined}
          className="mx-auto w-fit px-4 py-2 text-xs text-slate-500"
        >
          {message.content}
        </div>
      );
    }

    return (
      <div
        key={messageKey}
        id={message.id ? `message-${message.id}` : undefined}
        className={`flex w-full items-end gap-2 px-1 py-2 ${
          isCurrentUser ? 'justify-end' : 'justify-start'
        }`}
      >
        {!isCurrentUser && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60 text-xs font-semibold text-slate-600">
            {message.sender?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        <div className="flex max-w-[70%] flex-col items-start gap-1">
          <div
            className={`w-full rounded-2xl px-4 py-3 text-sm shadow ${
              isCurrentUser
                ? 'bg-blue-600 text-white'
                : 'bg-white/70 text-slate-700'
            }`}
          >
            {message.type === 'text' && <p>{message.content}</p>}
            {message.type === 'file' && (
              <EnhancedFilePreview
                file={{
                  name: message.fileName,
                  type: message.fileType || '',
                  size: message.fileSize || 0,
                  content: message.content,
                }}
              />
            )}
            {message.type === 'location' && <LocationShare location={message} theme={theme} />}
            {message.type === 'url' && (
              <UrlPreview
                url={message.url}
                title={message.title}
                description={message.description}
                image={message.image}
                theme={theme}
              />
            )}
            <div className={`mt-2 text-[10px] ${isCurrentUser ? 'text-white/70' : 'text-slate-400'}`}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
          {message.id && (
            <MessageReactions
              messageId={message.id}
              reactions={reactions}
              onReactionAdd={handleReactionAdd}
              onReactionRemove={handleReactionRemove}
            />
          )}
        </div>
        {isCurrentUser && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-200 text-xs font-semibold text-blue-700">
            {message.sender?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
      </div>
    );
  };

  const handleMessageClick = (message) => {
    setIsSearchOpen(false);
    // Scroll to the message
    const messageElement = document.getElementById(`message-${message.id}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth' });
      messageElement.style.backgroundColor = 'yellow';
      setTimeout(() => {
        messageElement.style.backgroundColor = '';
      }, 2000);
    }
  };

  return (
    <div className="flex min-h-[70vh] flex-col gap-3">
      <div className="glass-surface flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold text-slate-800">Chat</div>
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs text-slate-600"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="ocean">Ocean</option>
            <option value="forest">Forest</option>
            <option value="sunset">Sunset</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="rounded-full border border-white/60 bg-white/60 p-2 text-slate-600 hover:bg-white"
        >
          <FiSearch />
        </button>
        {onToggleDark && (
          <button
            type="button"
            onClick={onToggleDark}
            className="rounded-full border border-white/60 bg-white/60 p-2 text-slate-600 hover:bg-white"
          >
            <span className="text-xs font-semibold">Theme</span>
          </button>
        )}
      </div>

      <div className="glass-panel flex-1 overflow-y-auto p-4">
        {messages.map((message, index) => renderMessage(message, index))}
        <div ref={messagesEndRef} />
      </div>

      {selectedFile && (
        <div className="glass-surface flex items-center justify-between px-4 py-2">
          <span className="text-sm text-slate-600">{selectedFile.name}</span>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="rounded-full p-2 text-slate-500 hover:bg-white/60"
          >
            <FiX />
          </button>
        </div>
      )}

      {urlPreview && (
        <div className="glass-surface p-3">
          <UrlPreview {...urlPreview} theme={theme} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full">
        <div className="glass-surface flex flex-col gap-2 p-4">
          <div className="flex items-center gap-2">
            <input
              placeholder="Type a message..."
              value={message}
              onChange={handleMessageChange}
              className="flex-1 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={() => setIsFileOpen(true)}
              className="rounded-full border border-white/60 bg-white/60 p-3 text-slate-600 hover:bg-white"
            >
              <FiPaperclip />
            </button>
            <button
              type="button"
              onClick={handleLocationShare}
              className="rounded-full border border-white/60 bg-white/60 p-3 text-slate-600 hover:bg-white"
            >
              <FiMapPin />
            </button>
            <EmojiPickerButton onEmojiSelect={handleEmojiSelect} theme={theme} />
          </div>
          <button
            type="submit"
            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Send
          </button>
        </div>
      </form>

      {isFileOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
          <div className="glass-panel w-full max-w-md p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Upload File</h3>
              <button
                type="button"
                onClick={() => setIsFileOpen(false)}
                className="rounded-full px-2 py-1 text-sm text-slate-500 hover:bg-white/60"
              >
                ✕
              </button>
            </div>
            <div className="mt-4">
              <FileUpload onFileSelect={handleFileSelect} />
            </div>
          </div>
        </div>
      )}

      {isSearchOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
          <div className="glass-panel w-full max-w-lg p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Search Messages</h3>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="rounded-full px-2 py-1 text-sm text-slate-500 hover:bg-white/60"
              >
                ✕
              </button>
            </div>
            <div className="mt-4">
              <MessageSearch messages={messages} onSearchResultClick={handleMessageClick} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
