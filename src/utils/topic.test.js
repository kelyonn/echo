import { describe, expect, it } from 'vitest';
import {
  isValidTopicName,
  normalizeOneToOneTopic,
  parseOneToOneTopic,
} from './topic';

describe('topic utilities', () => {
  it('normalizes one-to-one topics with sorted usernames', () => {
    const topic = normalizeOneToOneTopic('Zoe', 'amy');
    expect(topic).toBe('oneToOne/amy' + 'talkWith' + 'zoe');
  });

  it('parses one-to-one topics', () => {
    const parsed = parseOneToOneTopic('oneToOne/alice' + 'talkWith' + 'bob');
    expect(parsed.userA).toBe('alice');
    expect(parsed.userB).toBe('bob');
  });

  it('validates topic names', () => {
    expect(isValidTopicName('chat/general')).toBe(true);
    expect(isValidTopicName('bad topic')).toBe(false);
  });
});
