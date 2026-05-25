import React, { useEffect, useMemo, useState } from 'react';
import Chat from './Chat';
import { MdAdd, MdClose } from 'react-icons/md';
import AddChatFormModal from './Form/AddChatFormModal';
import { useMqtt } from '../context/MqttContext';
import { normalizeUsername, parseOneToOneTopic } from '../utils/topic';

const TabChat = ({ username, dark = false, onToggleDark, onSignOut }) => {
  const [chats, setChats] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const { client } = useMqtt();

  const tabs = useMemo(
    () => [{ label: 'General Chat', topic: 'chat' }, ...chats.map((chat) => ({
      label: chat.name,
      topic: chat.name,
    }))],
    [chats]
  );

  const handleDisconnectChat = topicMqtt => {
    client.unsubscribe(topicMqtt);
    client.publish(topicMqtt, `${username}: has just disconnected`);
    setChats(chats.filter(chat => chat.name !== topicMqtt));
    setActiveTab(0);
  };

  useEffect(() => {
    if (!client) {
      return undefined;
    }
    // Subscribe to all topics starting with "sensor/"

    const normalizedUsername = normalizeUsername(username);

    // Handler for new messages received
    const handleMessage = function (topic, message) {
      // Check if the topic is new
      console.log({ topic, message });
      const parsed = parseOneToOneTopic(topic);
      if (!parsed) {
        return;
      }

      const participants = [normalizeUsername(parsed.userA), normalizeUsername(parsed.userB)];
      if (!participants.includes(normalizedUsername)) {
        return;
      }

      const normalizedTopic = parsed.normalized;
      setChats(prevChats => {
        const chatExists = prevChats.some(chat => chat.name === normalizedTopic);
        if (chatExists) {
          return prevChats;
        }
        client.subscribe(normalizedTopic);
        client.publish(normalizedTopic, `${username}: has just connected`);
        return [...prevChats, { name: normalizedTopic }];
      });
    };

    client.on('message', handleMessage);

    // Cleanup on disconnect
    return () => {
      client.off('message', handleMessage);
    };
  }, [client, username]);

  return (
    <div className="w-full space-y-4">
      <AddChatFormModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        setChats={setChats}
        client={client}
        chats={chats}
        username={username}
      />
      <div className="glass-surface flex flex-wrap items-center gap-2 rounded-full px-3 py-2">
        {tabs.map((tab, index) => (
          <button
            key={tab.topic}
            type="button"
            onClick={() => setActiveTab(index)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
              activeTab === index
                ? 'bg-white/70 text-slate-800 shadow'
                : 'text-slate-500 hover:bg-white/40'
            }`}
          >
            <span className="truncate max-w-[160px]">{tab.label}</span>
            {index > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  handleDisconnectChat(tab.topic);
                }}
                className="rounded-full p-1 text-slate-400 hover:text-slate-600"
              >
                <MdClose />
              </span>
            )}
          </button>
        ))}
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="ml-2 rounded-full border border-white/60 bg-white/40 px-4 py-2 text-sm text-slate-600 hover:bg-white/60"
          >
            Sign out
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="ml-auto flex items-center justify-center rounded-full border border-white/60 bg-white/40 px-3 py-2 text-slate-600 hover:bg-white/60"
        >
          <MdAdd />
        </button>
      </div>

      {client && (
        <Chat
          username={username}
          client={client}
          topicMqtt={tabs[activeTab]?.topic}
          dark={dark}
          onToggleDark={onToggleDark}
        />
      )}
    </div>
  );
};

export default TabChat;
