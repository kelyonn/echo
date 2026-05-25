export const ONE_TO_ONE_PREFIX = 'oneToOne/';
export const ONE_TO_ONE_SEPARATOR = 'talkWith';

export const normalizeUsername = (value) => value.trim().toLowerCase();

export const normalizeTopicName = (topic) => topic.trim();

export const isValidTopicName = (topic) => {
  if (!topic) {
    return false;
  }
  const trimmed = topic.trim();
  if (!trimmed) {
    return false;
  }
  return /^[a-zA-Z0-9/_-]+$/.test(trimmed);
};

export const normalizeOneToOneTopic = (userA, userB) => {
  const a = normalizeUsername(userA);
  const b = normalizeUsername(userB);
  const [first, second] = [a, b].sort();
  return `${ONE_TO_ONE_PREFIX}${first}${ONE_TO_ONE_SEPARATOR}${second}`;
};

export const parseOneToOneTopic = (topic) => {
  if (!topic || !topic.startsWith(ONE_TO_ONE_PREFIX)) {
    return null;
  }
  const rest = topic.slice(ONE_TO_ONE_PREFIX.length);
  const parts = rest.split(ONE_TO_ONE_SEPARATOR);
  if (parts.length !== 2) {
    return null;
  }
  const [userA, userB] = parts;
  if (!userA || !userB) {
    return null;
  }
  return {
    userA,
    userB,
    normalized: normalizeOneToOneTopic(userA, userB),
  };
};

export const isSameOneToOneTopic = (topicA, topicB) => {
  const parsedA = parseOneToOneTopic(topicA);
  const parsedB = parseOneToOneTopic(topicB);
  if (!parsedA || !parsedB) {
    return false;
  }
  return parsedA.normalized === parsedB.normalized;
};
