import { given, then, when } from 'test-fns';

import { computeCloneMessages } from './computeCloneMessages';

const assistantLine = (text: string): string =>
  JSON.stringify({
    type: 'assistant',
    message: { content: [{ type: 'text', text }] },
  });

const userLine = (text: string): string =>
  JSON.stringify({ type: 'user', message: { content: text } });

const toolResultLine = (): string =>
  JSON.stringify({
    type: 'user',
    message: { content: [{ type: 'tool_result', content: 'x' }] },
  });

describe('computeCloneMessages', () => {
  given('[case1] one episode with a say, a tool result, and a reply', () => {
    when('[t0] the episode is folded', () => {
      then(
        'it yields the say (in) and the reply (out), tool result dropped',
        () => {
          const content =
            [userLine('poke'), toolResultLine(), assistantLine('ack')].join(
              '\n',
            ) + '\n';
          expect(computeCloneMessages({ episodes: [{ content }] })).toEqual([
            { direction: 'in', text: 'poke', at: null },
            { direction: 'out', text: 'ack', at: null },
          ]);
        },
      );
    });
  });

  given('[case2] two episodes', () => {
    when('[t0] both are folded', () => {
      then('the messages concat in episode order', () => {
        expect(
          computeCloneMessages({
            episodes: [
              { content: assistantLine('older') + '\n' },
              { content: assistantLine('newer') + '\n' },
            ],
          }),
        ).toEqual([
          { direction: 'out', text: 'older', at: null },
          { direction: 'out', text: 'newer', at: null },
        ]);
      });
    });
  });

  given(
    '[case3] an episode whose final line is torn (no final newline)',
    () => {
      when('[t0] the episode is folded', () => {
        then('the torn final line is held back via slice(0, -1)', () => {
          // a complete reply, then a half-written torn json line with no newline
          const content = assistantLine('done') + '\n' + '{"type":"assist';
          expect(computeCloneMessages({ episodes: [{ content }] })).toEqual([
            { direction: 'out', text: 'done', at: null },
          ]);
        });
      });
    },
  );
});
