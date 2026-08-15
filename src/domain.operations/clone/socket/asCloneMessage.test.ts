import { getError } from 'test-fns';

import type { CloneMessage } from './asCloneMessage';
import { asCloneMessage } from './asCloneMessage';

const assistantLine = (blocks: unknown): string =>
  JSON.stringify({ type: 'assistant', message: { content: blocks } });

const userLine = (content: unknown): string =>
  JSON.stringify({ type: 'user', message: { content } });

const TEST_CASES: {
  description: string;
  given: { line: string };
  expect: CloneMessage | null;
}[] = [
  {
    description: 'an assistant text record → an OUTbound message',
    given: { line: assistantLine([{ type: 'text', text: 'on it 🐢' }]) },
    expect: { direction: 'out', text: 'on it 🐢', at: null },
  },
  {
    description: 'a record carries its `timestamp` through as `at`',
    given: {
      line: JSON.stringify({
        type: 'assistant',
        timestamp: '2026-08-14T12:00:00Z',
        message: { content: [{ type: 'text', text: 'hi' }] },
      }),
    },
    expect: { direction: 'out', text: 'hi', at: '2026-08-14T12:00:00Z' },
  },
  {
    description: 'an assistant record joins every text block',
    given: {
      line: assistantLine([
        { type: 'text', text: 'part one, ' },
        { type: 'text', text: 'part two' },
      ]),
    },
    expect: { direction: 'out', text: 'part one, part two', at: null },
  },
  {
    description: 'a user record with bare-string content → an INbound message',
    given: { line: userLine('wrap up and commit') },
    expect: { direction: 'in', text: 'wrap up and commit', at: null },
  },
  {
    description: 'a user record with a text block → an INbound message',
    given: { line: userLine([{ type: 'text', text: 'poke abc' }]) },
    expect: { direction: 'in', text: 'poke abc', at: null },
  },
  {
    description: 'a tool-result-only user record → null (textless, filtered)',
    given: { line: userLine([{ type: 'tool_result', content: 'x' }]) },
    expect: null,
  },
  {
    description: 'a tool-use-only assistant record → null (textless, filtered)',
    given: {
      line: assistantLine([{ type: 'tool_use', name: 'bash', input: {} }]),
    },
    expect: null,
  },
  {
    description: 'a non-turn record type (a system event) → null',
    given: { line: JSON.stringify({ type: 'system', subtype: 'init' }) },
    expect: null,
  },
];

describe('asCloneMessage', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asCloneMessage(thisCase.given)).toEqual(thisCase.expect);
    }),
  );

  test('a corrupt (unparseable) line fails loud', async () => {
    const error = await getError(async () =>
      asCloneMessage({ line: '{"type":"assist' }),
    );
    expect(error.message).toContain('corrupt');
  });
});
