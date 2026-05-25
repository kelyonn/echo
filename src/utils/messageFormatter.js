const createMessageId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

export const formatMessage = (type, content, sender, timestamp, metadata = {}) => {
  const baseMessage = {
    id: createMessageId(),
    type,
    content,
    sender,
    timestamp: timestamp || new Date().toISOString(),
  };

  switch (type) {
    case 'text':
      return {
        ...baseMessage,
        content: content.trim(),
        ...(metadata.replyTo ? { replyTo: metadata.replyTo } : {}),
      };
    case 'file':
      return {
        ...baseMessage,
        fileName: metadata.fileName,
        fileType: metadata.fileType,
        fileSize: metadata.fileSize,
        ...(metadata.replyTo ? { replyTo: metadata.replyTo } : {}),
      };
    case 'location':
      return {
        ...baseMessage,
        latitude: content.latitude,
        longitude: content.longitude,
        accuracy: content.accuracy,
      };
    case 'url':
      return {
        ...baseMessage,
        url: content,
        title: metadata.title,
        description: metadata.description,
        image: metadata.image,
      };
    default:
      return baseMessage;
  }
};

export const parseMessage = (message) => {
  try {
    const parsed = JSON.parse(message);
    if (!parsed.id) {
      parsed.id = createMessageId();
    }
    return parsed;
  } catch (e) {
    // Handle legacy messages
    const match = message.match(/^([\w\s-]+):\s*(.*)/);
    if (match) {
      return {
        id: createMessageId(),
        type: 'text',
        content: message,
        sender: match[1],
        timestamp: new Date().toISOString(),
      };
    }
    return {
      id: createMessageId(),
      type: 'text',
      content: message,
      sender: 'system',
      timestamp: new Date().toISOString(),
    };
  }
}; 