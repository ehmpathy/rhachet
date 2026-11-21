import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { genSampleBrainAuthUsage } from '@src/.test/assets/genSampleBrainAuthUsage';
import { genSampleBrainAuthUsageWindow } from '@src/.test/assets/genSampleBrainAuthUsageWindow';

import { asBrainAuthUsageTree } from './asBrainAuthUsageTree';

const now = asIsoTimeStamp('2026-11-14T12:00:00Z');

const usageA = genSampleBrainAuthUsage({
  email: 'a@example.com',
  status: 'read',
  windows: [
    genSampleBrainAuthUsageWindow({
      slug: 'session',
      usedShare: 0.92,
      resetsAt: '2026-11-14T18:00:00Z',
    }),
    genSampleBrainAuthUsageWindow({
      slug: 'week',
      usedShare: 0.4,
      resetsAt: '2026-11-18T12:00:00Z',
    }),
  ],
  savedResets: 2,
  signedIn: true,
});

const usageC = genSampleBrainAuthUsage({
  email: 'c@example.com',
  status: 'read',
  windows: [
    genSampleBrainAuthUsageWindow({
      slug: 'session',
      usedShare: 0.1,
      resetsAt: '2026-11-14T12:25:00Z',
    }),
    genSampleBrainAuthUsageWindow({
      slug: 'week',
      usedShare: 1,
      resetsAt: '2026-11-15T12:00:00Z',
    }),
  ],
  renewed: true,
});

const usageD = genSampleBrainAuthUsage({
  email: 'd@example.com',
  status: 'dead',
});

describe('asBrainAuthUsageTree', () => {
  given(
    '[case1] three accounts: signed in, one renewed and capped, one dead',
    () => {
      when('[t0] the tree is rendered', () => {
        const tree = asBrainAuthUsageTree({
          usages: [usageA, usageC, usageD],
          owner: 'ehmpath',
          now,
        });

        then('one branch per account, the signed-in one marked', () => {
          expect(tree).toContain('├─ a@example.com (signed in)');
          expect(tree).toContain('├─ d@example.com');
        });

        then('only the login this read rotated is marked renewed', () => {
          expect(tree).toContain('├─ c@example.com (renewed)');
          expect(tree).not.toContain('d@example.com (renewed)');
          expect(tree).not.toContain('a@example.com (renewed)');
        });

        then('it closes on one note of what a renewal wrote', () => {
          expect(tree).toContain(
            '└─ note = each (renewed) login was rotated by this read; its new token is parked back in the keyrack',
          );
        });

        then(
          'a capped window reads capped, never a percent, on a full bar',
          () => {
            expect(tree).toContain('week = ██████████ capped, resets in 1d');
          },
        );

        then('each window shows a bar, its used share, and its reset', () => {
          expect(tree).toContain('session = █████████░ 92% used, resets in 6h');
          expect(tree).toContain(
            'session = █░░░░░░░░░ 10% used, resets in 25m',
          );
        });

        then('a dead account names the next move, for that account', () => {
          expect(tree).toContain(
            'run `rhx brains auth set --brain claude --account d@example.com`',
          );
        });

        then('the owner leads the tree', () => {
          expect(tree.split('\n')[1]).toEqual('   ├─ owner = ehmpath');
        });

        then('the tree matches its snapshot', () => {
          expect(tree.split('\n')[0]).toEqual('🧠 brains auth get');
          expect(tree).toMatchSnapshot();
        });
      });
    },
  );

  given('[case2] no accounts held', () => {
    when('[t0] the tree is rendered', () => {
      const tree = asBrainAuthUsageTree({ usages: [], owner: 'ehmpath', now });

      then('it names the owner it read, and the set that adds one', () => {
        expect(tree).toContain('├─ owner = ehmpath');
        expect(tree).toContain('rhx brains auth set');
        expect(tree).toContain('rhx keyrack init --owner ehmpath');
        expect(tree).toMatchSnapshot();
      });
    });
  });

  given(
    '[case3] no stored login rotated: one read, one dead, one rate-limited',
    () => {
      when('[t0] the tree is rendered', () => {
        const tree = asBrainAuthUsageTree({
          usages: [
            usageA,
            usageD,
            genSampleBrainAuthUsage({
              email: 'e@example.com',
              status: 'rate-limited',
            }),
          ],
          owner: 'ehmpath',
          now,
        });

        then(
          'no row is marked renewed, and no renewal note closes the tree',
          () => {
            expect(tree).not.toContain('(renewed)');
            expect(tree).toContain('└─ e@example.com');
          },
        );

        then('the tree matches its snapshot', () => {
          expect(tree.split('\n')[0]).toEqual('🧠 brains auth get');
          expect(tree).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case4] a signed-in login whose token lapsed, and a stored one the provider could not reach',
    () => {
      when('[t0] the tree is rendered', () => {
        const tree = asBrainAuthUsageTree({
          usages: [
            genSampleBrainAuthUsage({
              email: 'a@example.com',
              status: 'unverified',
              signedIn: true,
            }),
            genSampleBrainAuthUsage({
              email: 'f@example.com',
              status: 'unreadable',
            }),
          ],
          owner: 'ehmpath',
          now,
        });

        then('the lapsed login reads unverified, with how it renews', () => {
          expect(tree).toContain('├─ a@example.com (signed in)');
          expect(tree).toContain(
            'unverified — the signed-in token lapsed, and a read never refreshes it; any claude session renews it',
          );
        });

        then('the unreached login reads unreadable, with a retry', () => {
          expect(tree).toContain('└─ f@example.com');
          expect(tree).toContain(
            'unreadable — server, network, or a reply shape rhachet cannot read; a retry may help',
          );
        });

        then('neither row is marked renewed', () => {
          expect(tree).not.toContain('(renewed)');
        });

        then('the tree matches its snapshot', () => {
          expect(tree.split('\n')[0]).toEqual('🧠 brains auth get');
          expect(tree).toMatchSnapshot();
        });
      });
    },
  );

  given('[case5] a signed-in login the provider refused', () => {
    when('[t0] the tree is rendered', () => {
      const tree = asBrainAuthUsageTree({
        usages: [
          genSampleBrainAuthUsage({
            email: 'a@example.com',
            status: 'dead',
            signedIn: true,
          }),
        ],
        owner: 'ehmpath',
        now,
      });

      then('the fix is a claude login, never a stored-login set', () => {
        expect(tree).toContain('└─ a@example.com (signed in)');
        expect(tree).toContain('run `/login` in any claude session');
        expect(tree).not.toContain('rhx brains auth set');
        expect(tree).toMatchSnapshot();
      });
    });
  });

  given('[case7] a stored login the keyrack will not open', () => {
    when('[t0] the tree is rendered beside a read row', () => {
      const tree = asBrainAuthUsageTree({
        usages: [
          usageA,
          genSampleBrainAuthUsage({ email: 'h@example.com', status: 'locked' }),
        ],
        owner: 'ehmpath',
        now,
      });

      then(
        'the locked row names the unlock, and the read row still renders',
        () => {
          expect(tree).toContain('├─ a@example.com (signed in)');
          expect(tree).toContain('└─ h@example.com');
          expect(tree).toContain(
            'locked — the keyrack holds this login but will not open it; run `rhx keyrack unlock --owner ehmpath --env prep`',
          );
          expect(tree).toMatchSnapshot();
        },
      );
    });
  });

  given('[case6] windows the provider reports with no reset time', () => {
    when('[t0] one window holds use, one holds none', () => {
      const tree = asBrainAuthUsageTree({
        usages: [
          genSampleBrainAuthUsage({
            email: 'g@example.com',
            status: 'read',
            windows: [
              genSampleBrainAuthUsageWindow({
                slug: 'session',
                usedShare: 0.2,
                resetsAt: null,
              }),
              genSampleBrainAuthUsageWindow({
                slug: 'week',
                usedShare: 0,
                resetsAt: null,
              }),
            ],
          }),
        ],
        owner: 'ehmpath',
        now,
      });

      then(
        'a window with use reads reset unknown, never not yet opened',
        () => {
          expect(tree).toContain(
            'session = ██░░░░░░░░ 20% used, reset unknown',
          );
          expect(tree).not.toContain('20% used, not yet opened');
        },
      );

      then('a window with no use reads not yet opened', () => {
        expect(tree).toContain('week = ░░░░░░░░░░ 0% used, not yet opened');
        expect(tree).toMatchSnapshot();
      });
    });
  });
});
