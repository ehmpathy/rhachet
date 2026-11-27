import { asIsoTimeStamp } from 'iso-time';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import {
  genMockedContextBrainAuthAccount,
  setSampleGroveLogin,
} from '@src/.test/assets/genMockedContextBrainAuthAccount';
import { genSampleBrainAuthAccount } from '@src/.test/assets/genSampleBrainAuthAccount';

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { asBrainAuthUsageTree } from './asBrainAuthUsageTree';
import { getAllBrainAuthUsage } from './getAllBrainAuthUsage';

/**
 * .mock = the claude oauth provider and the keyrack, via the op's context (never jest.mock)
 * .why = a real read rotates every parked login it touches; it must run only on seats set aside
 *   for tests (fulcrum F6). the grove file is real, in a temp home
 * .real = the seat proof of `get` against `brains.auth.usage`, owed with F6
 */

const accounts = ['a', 'b', 'c', 'd'].map((name) =>
  genSampleBrainAuthAccount({ email: `${name}@example.com` }),
);
const now = asIsoTimeStamp('2026-11-14T12:00:00Z');

/**
 * .what = a temp home signed in on a; b and c parked live, d parked spent, and c rate-limited
 */
const genScene = (input: { slug: string }) => {
  const home = genTempDir({ slug: input.slug });
  const mocked = genMockedContextBrainAuthAccount({
    accounts,
    options: { mintRateLimited: ['c@example.com'] },
  });
  const groveA = mocked.provider.issueLogin({ email: 'a@example.com' });
  setSampleGroveLogin({ home, pair: groveA });

  // a's keyrack copy sits beside the grove, as a past `set` of the signed-in account leaves it
  mocked.keyrack.set('a@example.com', 'refresh.a@example.com.stale');
  const parkedB = mocked.provider.issueLogin({ email: 'b@example.com' });
  mocked.keyrack.set('b@example.com', parkedB.refreshToken);
  mocked.keyrack.set(
    'c@example.com',
    mocked.provider.issueLogin({ email: 'c@example.com' }).refreshToken,
  );
  mocked.keyrack.set('d@example.com', 'refresh.d@example.com.spent');
  return { home, mocked, groveA, parkedB };
};

describe('getAllBrainAuthUsage', () => {
  given('[case1] a grove on a, with b, c and d parked (case=2)', () => {
    when('[t0] every account is read', () => {
      const scene = useBeforeAll(async () => {
        const built = genScene({ slug: 'brains-auth-get-all' });
        const usages = await getAllBrainAuthUsage(
          { owner: null, home: built.home, account: '@all' },
          built.mocked.context,
        );
        return { ...built, usages };
      });

      then('the grove comes first, then each parked one in turn', () => {
        expect(scene.usages.map((usage) => usage.email)).toEqual([
          'a@example.com',
          'b@example.com',
          'c@example.com',
          'd@example.com',
        ]);
      });

      then(
        'the signed-in account is read through the grove, never minted',
        () => {
          expect(scene.usages[0]?.signedIn).toEqual(true);
          expect(scene.usages[0]?.renewed).toEqual(false);
          expect(scene.mocked.provider.mints).not.toContain('a@example.com');
        },
      );

      then('each row says whether this read rotated its login', () => {
        expect(
          scene.usages.map((usage) => [
            usage.email,
            usage.status,
            usage.renewed,
          ]),
        ).toEqual([
          ['a@example.com', 'read', false],
          ['b@example.com', 'read', true],
          ['c@example.com', 'rate-limited', false],
          ['d@example.com', 'dead', false],
        ]);
      });

      then(
        "b's rotated login is parked back, and is the one that mints now",
        () => {
          const parked = scene.mocked.keyrack.get('b@example.com') ?? '';
          expect(parked).not.toEqual(scene.parkedB.refreshToken);
          expect(
            scene.mocked.provider.isLive({ refreshToken: parked }),
          ).toEqual(true);
        },
      );

      then('the populated tree matches its snapshot', () => {
        const tree = asBrainAuthUsageTree({
          usages: scene.usages,
          owner: 'ehmpath',
          now,
        });
        expect(tree).toContain('├─ b@example.com (renewed)');
        expect(tree).not.toContain('c@example.com (renewed)');
        expect(tree).toMatchSnapshot();
      });

      then('the json rows match their snapshot, with no token in them', () => {
        expect(JSON.stringify(scene.usages)).not.toContain('refresh.');
        // the snapshot holds no clock: this fixture names no reset, and the clamp below fails
        //   loud if a fixture change ever puts a reset instant into a snapped row
        expect(
          scene.usages.flatMap((usage) =>
            usage.windows.map((window) => window.resetsAt),
          ),
        ).toEqual([null, null, null, null]);
        expect(scene.usages).toMatchSnapshot();
      });
    });

    when('[t1] one parked account is asked for', () => {
      const scene = useBeforeAll(async () => {
        const built = genScene({ slug: 'brains-auth-get-one' });
        const usages = await getAllBrainAuthUsage(
          { owner: null, home: built.home, account: 'b@example.com' },
          built.mocked.context,
        );
        return { ...built, usages };
      });

      then('only that account is read, and only its login rotates', () => {
        expect(scene.usages.map((usage) => usage.email)).toEqual([
          'b@example.com',
        ]);
        expect(scene.mocked.provider.mints).toEqual(['b@example.com']);
      });
    });

    when('[t2] the signed-in account is asked for', () => {
      then('the grove read answers it, and naught is minted', async () => {
        const built = genScene({ slug: 'brains-auth-get-signed-in' });
        const usages = await getAllBrainAuthUsage(
          { owner: null, home: built.home, account: 'a@example.com' },
          built.mocked.context,
        );
        expect(usages.map((usage) => usage.signedIn)).toEqual([true]);
        expect(built.mocked.provider.mints).toEqual([]);
      });
    });

    when('[t3] an account the keyrack does not hold is asked for', () => {
      then(
        'it refuses, with the accounts held, and naught is minted',
        async () => {
          const built = genScene({ slug: 'brains-auth-get-absent' });
          const error = await getError(
            getAllBrainAuthUsage(
              { owner: null, home: built.home, account: 'z@example.com' },
              built.mocked.context,
            ),
          );
          expect(error.constructor.name).toEqual('ConstraintError');
          expect(error.message).toContain(
            'no stored credential for z@example.com',
          );
          expect(built.mocked.provider.mints).toEqual([]);
          expect(error).toMatchSnapshot();
        },
      );
    });
  });

  given('[case3] a parked account whose usage reply has drifted', () => {
    when('[t0] every account is read', () => {
      then(
        'that row alone reads unreadable; every other row still renders',
        async () => {
          const home = genTempDir({ slug: 'brains-auth-get-drift' });
          const mocked = genMockedContextBrainAuthAccount({
            accounts,
            options: {
              usageReplies: {
                'b@example.com': { five_hour: null, weekly: { used: 4 } },
              },
            },
          });
          setSampleGroveLogin({
            home,
            pair: mocked.provider.issueLogin({ email: 'a@example.com' }),
          });
          ['b@example.com', 'c@example.com'].forEach((email) =>
            mocked.keyrack.set(
              email,
              mocked.provider.issueLogin({ email }).refreshToken,
            ),
          );
          const usages = await getAllBrainAuthUsage(
            { owner: null, home, account: '@all' },
            mocked.context,
          );
          expect(
            usages.map((usage) => [usage.email, usage.status, usage.renewed]),
          ).toEqual([
            ['a@example.com', 'read', false],
            ['b@example.com', 'unreadable', true],
            ['c@example.com', 'read', true],
          ]);
          expect(
            asBrainAuthUsageTree({ usages, owner: 'ehmpath', now }),
          ).toContain('reply shape rhachet cannot read');
        },
      );
    });
  });

  given('[case4] a keyrack that holds c but will not open it', () => {
    when('[t0] every account is read', () => {
      const scene = useBeforeAll(async () => {
        const built = genScene({ slug: 'brains-auth-get-locked' });
        const usages = await getAllBrainAuthUsage(
          { owner: null, home: built.home, account: '@all' },
          {
            ...built.mocked.context,
            getSlotToken: async (call) =>
              call.email === 'c@example.com'
                ? { status: 'locked' as const, fix: null }
                : built.mocked.context.getSlotToken(call),
          },
        );
        return { ...built, usages };
      });

      then("c's row reads locked, and is never minted", () => {
        expect(
          scene.usages.find((usage) => usage.email === 'c@example.com')?.status,
        ).toEqual('locked');
        expect(scene.mocked.provider.mints).not.toContain('c@example.com');
      });

      then('every other row still reads', () => {
        expect(
          scene.usages.map((usage) => [usage.email, usage.status]),
        ).toEqual([
          ['a@example.com', 'read'],
          ['b@example.com', 'read'],
          ['c@example.com', 'locked'],
          ['d@example.com', 'dead'],
        ]);
      });
    });
  });

  given('[case5] a peer use moves the grove login mid-read', () => {
    when('[t0] every account is read, and d reads spent', () => {
      const scene = useBeforeAll(async () => {
        const built = genScene({ slug: 'brains-auth-get-in-motion' });
        const usages = await getAllBrainAuthUsage(
          { owner: null, home: built.home, account: '@all' },
          {
            ...built.mocked.context,
            getSlotToken: async (call) => {
              // as d is read, a peer use installs a fresh login in the grove
              if (call.email === 'd@example.com')
                setSampleGroveLogin({
                  home: built.home,
                  pair: built.mocked.provider.issueLogin({
                    email: 'a@example.com',
                  }),
                });
              return built.mocked.context.getSlotToken(call);
            },
          },
        );
        return { ...built, usages };
      });

      then("d's row reads unreadable, never dead", () => {
        expect(
          scene.usages.find((usage) => usage.email === 'd@example.com')?.status,
        ).toEqual('unreadable');
      });

      then('the rows read before the motion keep their status', () => {
        expect(
          scene.usages.map((usage) => [usage.email, usage.status]),
        ).toEqual([
          ['a@example.com', 'read'],
          ['b@example.com', 'read'],
          ['c@example.com', 'rate-limited'],
          ['d@example.com', 'unreadable'],
        ]);
      });
    });
  });

  given('[case2] a grove whose live token has lapsed (case=5 [t3])', () => {
    when('[t0] every account is read', () => {
      then(
        'the signed-in row reads unverified, and its token is never refreshed',
        async () => {
          const built = genScene({ slug: 'brains-auth-get-lapsed' });
          setSampleGroveLogin({
            home: built.home,
            pair: built.groveA,
            lapsed: true,
          });
          writeFileSync(
            join(built.home, '.claude.json'),
            JSON.stringify({
              numStartups: 2,
              oauthAccount: {
                accountUuid: accounts[0]!.accountUuid,
                emailAddress: 'a@example.com',
              },
            }),
          );
          const usages = await getAllBrainAuthUsage(
            { owner: null, home: built.home, account: '@all' },
            built.mocked.context,
          );

          // claude's record names a, so a's row is the grove's, read as unverified
          const rowA = usages.find((usage) => usage.email === 'a@example.com');
          expect(rowA?.signedIn).toEqual(true);
          expect(rowA?.status).toEqual('unverified');
          expect(rowA?.renewed).toEqual(false);

          // the lapsed grove login is never refreshed, nor a's keyrack copy minted
          expect(built.mocked.provider.mints).not.toContain('a@example.com');
          expect(
            built.mocked.provider.isLive({
              refreshToken: built.groveA.refreshToken,
            }),
          ).toEqual(true);

          // the parked rows still read
          expect(usages.map((usage) => usage.email)).toContain('b@example.com');
        },
      );
    });
  });
});
