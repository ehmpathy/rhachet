import { given, then, when } from 'test-fns';

import { asClaudeUsageReplyDrift } from './asClaudeUsageReplyDrift';

const TEST_CASES = [
  {
    description: 'a reply with both windows fits',
    given: {
      reply: {
        five_hour: { utilization: 18, resets_at: null },
        seven_day: { utilization: 42, resets_at: null },
      },
    },
    expect: { reason: null },
  },
  {
    description: 'a window present as null fits: the plan has no such limit',
    given: {
      reply: { five_hour: null, seven_day: { utilization: 0 } },
    },
    expect: { reason: null },
  },
  {
    description: 'a reply that is not an object drifted',
    given: { reply: 'oops' },
    expect: { reason: 'claude usage reply is not an object' },
  },
  {
    description: 'an array drifted',
    given: { reply: [] },
    expect: { reason: 'claude usage reply is not an object' },
  },
  {
    description: 'a window key absent drifted, and names the key',
    given: { reply: { seven_day: { utilization: 10 } } },
    expect: { reason: 'claude usage reply lacks a window key (five_hour)' },
  },
  {
    description: 'a window with no numeric utilization drifted',
    given: {
      reply: { five_hour: { utilization: '18%' }, seven_day: null },
    },
    expect: {
      reason: 'claude usage window lacks a numeric utilization (five_hour)',
    },
  },
];

describe('asClaudeUsageReplyDrift', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the reply is checked for drift', () => {
        then(`it reads drift reason = ${thisCase.expect.reason}`, () => {
          const drift = asClaudeUsageReplyDrift({
            reply: thisCase.given.reply,
          });
          expect(drift?.reason ?? null).toEqual(thisCase.expect.reason);
        });
      });
    }),
  );

  given(
    `[case${TEST_CASES.length + 1}] a reply with unknown keys and values`,
    () => {
      when('[t0] the reply is checked for drift', () => {
        then(
          'the drift names the keys the reply held, never their values',
          () => {
            const drift = asClaudeUsageReplyDrift({
              reply: { weekly: { used: 4 }, session: 'x' },
            });
            expect(drift?.keys).toEqual(['weekly', 'session']);
            expect(JSON.stringify(drift)).not.toContain('used');
          },
        );
      });
    },
  );
});
