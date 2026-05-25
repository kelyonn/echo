import { describe, expect, it } from 'vitest';
import { formatMessage, parseMessage } from './messageFormatter';

describe('messageFormatter', () => {
  it('adds an id to formatted messages', () => {
    const message = formatMessage('text', 'hello', 'bob');
    expect(message.id).toBeTruthy();
    expect(message.type).toBe('text');
    expect(message.content).toBe('hello');
  });

  it('preserves id when parsing JSON', () => {
    const raw = JSON.stringify({
      id: 'msg_1',
      type: 'text',
      content: 'hi',
      sender: 'bob',
      timestamp: new Date().toISOString(),
    });
    const parsed = parseMessage(raw);
    expect(parsed.id).toBe('msg_1');
  });

  it('adds an id when parsing legacy text', () => {
    const parsed = parseMessage('alice: hello');
    expect(parsed.id).toBeTruthy();
    expect(parsed.sender).toBe('alice');
  });
});
