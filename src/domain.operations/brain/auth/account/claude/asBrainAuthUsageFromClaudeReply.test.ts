import { getError, given, then, when } from 'test-fns';

import { genSampleBrainAuthAccount } from '@src/.test/assets/genSampleBrainAuthAccount';

import { asBrainAuthUsageFromClaudeReply } from './asBrainAuthUsageFromClaudeReply';

const account = genSampleBrainAuthAccount({ email: 'b@example.com' });

const TEST_CASES = [
  {
    description: 'reads both windows with headroom, and sums the saved resets',
    given: {
      reply: {
        five_hour: { utilization: 18, resets_at: '2026-11-14T18:10:00Z' },
        seven_day: { utilization: 42, resets_at: '2026-11-18T12:00:00Z' },
        cedar_ember: {
          grants: [{ resets_left: 1 }, { resets_left: 2 }, { resets_left: 0 }],
        },
      },
    },
    expect: {
      windows: [
        {
          slug: 'session',
          usedShare: 0.18,
          resetsAt: '2026-11-14T18:10:00Z',
          capped: false,
        },
        {
          slug: 'week',
          usedShare: 0.42,
          resetsAt: '2026-11-18T12:00:00Z',
          capped: false,
        },
      ],
      savedResets: 3,
    },
  },
  {
    description: 'marks a window at 100% as capped',
    given: {
      reply: {
        five_hour: { utilization: 40, resets_at: '2026-11-14T18:10:00Z' },
        seven_day: { utilization: 100, resets_at: '2026-11-14T20:00:00Z' },
        cedar_ember: { grants: [] },
      },
    },
    expect: {
      windows: [
        {
          slug: 'session',
          usedShare: 0.4,
          resetsAt: '2026-11-14T18:10:00Z',
          capped: false,
        },
        {
          slug: 'week',
          usedShare: 1,
          resetsAt: '2026-11-14T20:00:00Z',
          capped: true,
        },
      ],
      savedResets: 0,
    },
  },
  {
    description:
      'omits a window the plan lacks (null), and holds a window not yet opened',
    given: {
      reply: {
        five_hour: null,
        seven_day: { utilization: 0, resets_at: null },
      },
    },
    expect: {
      windows: [{ slug: 'week', usedShare: 0, resetsAt: null, capped: false }],
      savedResets: null,
    },
  },
  {
    description:
      'leaves saved resets unknown when the endpoint did not see the claude cli',
    given: {
      reply: {
        five_hour: { utilization: 10, resets_at: '2026-11-14T18:10:00Z' },
        seven_day: { utilization: 10, resets_at: '2026-11-18T12:00:00Z' },
        cedar_ember: {
          grants: [{ resets_left: 5 }],
          ineligible_reason: 'surface',
        },
      },
    },
    expect: {
      windows: [
        {
          slug: 'session',
          usedShare: 0.1,
          resetsAt: '2026-11-14T18:10:00Z',
          capped: false,
        },
        {
          slug: 'week',
          usedShare: 0.1,
          resetsAt: '2026-11-18T12:00:00Z',
          capped: false,
        },
      ],
      savedResets: null,
    },
  },
];

describe('asBrainAuthUsageFromClaudeReply', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the reply is cast to usage', () => {
        then('it yields the expected windows and saved resets', () => {
          const usage = asBrainAuthUsageFromClaudeReply({
            reply: thisCase.given.reply,
            account,
            signedIn: false,
            renewed: false,
          });
          expect(usage.status).toEqual('read');
          expect(usage.account).toEqual(account);
          expect(usage.signedIn).toEqual(false);
          expect(usage.savedResets).toEqual(thisCase.expect.savedResets);
          expect(usage.windows.map((window) => ({ ...window }))).toEqual(
            thisCase.expect.windows,
          );
        });
      });
    }),
  );

  const DRIFT_CASES = [
    {
      description: 'a reply whose window key is absent',
      reply: { seven_day: { utilization: 10, resets_at: null } },
      message: 'lacks a window key',
    },
    {
      description: 'a reply whose window has no numeric utilization',
      reply: { five_hour: { utilization: '18%' }, seven_day: null },
      message: 'lacks a numeric utilization',
    },
    {
      description: 'a reply that is not an object',
      reply: 'oops',
      message: 'is not an object',
    },
  ];

  DRIFT_CASES.map((thisCase, index) =>
    given(
      `[case${TEST_CASES.length + index + 1}] ${thisCase.description}`,
      () => {
        when('[t0] the reply is cast to usage', () => {
          then('it fails loud, and names the drift', async () => {
            const error = await getError(() =>
              asBrainAuthUsageFromClaudeReply({
                reply: thisCase.reply,
                account,
                signedIn: false,
                renewed: false,
              }),
            );
            expect(error.message).toContain(thisCase.message);
          });
        });
      },
    ),
  );
});
