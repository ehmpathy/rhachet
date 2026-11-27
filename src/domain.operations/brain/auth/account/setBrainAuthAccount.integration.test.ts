import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genMockedContextBrainAuthAccount } from '@src/.test/assets/genMockedContextBrainAuthAccount';
import { genSampleBrainAuthAccount } from '@src/.test/assets/genSampleBrainAuthAccount';

import { setBrainAuthAccount } from './setBrainAuthAccount';

/**
 * .mock = the claude cli's browser login, the oauth provider, and the keyrack, via the op's context
 * .why = a real `set` needs a human at a browser and a seat set aside for tests (fulcrum F6). the
 *   isolated config dir and its removal are real
 * .real = the seat proof of `set`, owed with F6
 */

const accountB = genSampleBrainAuthAccount({
  email: 'b@example.com',
  orgId: 'org-b',
});
const accountBOtherOrg = genSampleBrainAuthAccount({
  email: 'b@example.com',
  orgId: 'org-other',
});

describe('setBrainAuthAccount', () => {
  given('[case1] an email the keyrack does not hold (case=1)', () => {
    when('[t0] the human logs in as b', () => {
      const scene = useBeforeAll(async () => {
        const mocked = genMockedContextBrainAuthAccount({
          accounts: [accountB],
        });
        mocked.setLoginOnSpawn({ email: 'b@example.com' });
        const result = await setBrainAuthAccount(
          { owner: null, email: null, env: process.env },
          mocked.context,
        );
        return { mocked, result };
      });

      then('b is stored, under its email', () => {
        expect(scene.result.outcome).toEqual('stored');
        expect(scene.result.account.email).toEqual('b@example.com');
      });

      then('the keyrack holds the new login, and it mints', () => {
        const parked = scene.mocked.keyrack.get('b@example.com') ?? '';
        expect(scene.mocked.provider.isLive({ refreshToken: parked })).toEqual(
          true,
        );
      });

      then(
        'the cli runs in its isolated dir, so no repo hooks load into the login',
        () => {
          expect(scene.mocked.spawns).toHaveLength(1);
          expect(scene.mocked.spawns[0]?.cwd).toEqual(
            scene.mocked.spawns[0]?.configDir,
          );
          expect(scene.mocked.spawns[0]?.cwd).not.toEqual(process.cwd());
        },
      );

      then('the result matches its snapshot, with no token in it', () => {
        expect(JSON.stringify(scene.result)).not.toContain('refresh.');
        expect(scene.result).toMatchSnapshot();
      });
    });
  });

  given(
    '[case2] an email the keyrack holds, in the same org (fulcrum F8)',
    () => {
      when('[t0] the human logs in as b again', () => {
        then('the new login replaces the held one, as renewed', async () => {
          const mocked = genMockedContextBrainAuthAccount({
            accounts: [accountB],
          });
          mocked.keyrack.set(
            'b@example.com',
            mocked.provider.issueLogin({ email: 'b@example.com' }).refreshToken,
          );
          mocked.setLoginOnSpawn({ email: 'b@example.com' });
          const result = await setBrainAuthAccount(
            { owner: null, email: null, env: process.env },
            mocked.context,
          );
          expect(result.outcome).toEqual('renewed');
          expect(
            mocked.provider.isLive({
              refreshToken: mocked.keyrack.get('b@example.com') ?? '',
            }),
          ).toEqual(true);
        });
      });
    },
  );

  given('[case3] an email the keyrack holds with a spent login', () => {
    when('[t0] the human logs in as b again', () => {
      then(
        'the spent one has no org to compare, so the renewal lands',
        async () => {
          const mocked = genMockedContextBrainAuthAccount({
            accounts: [accountB],
          });
          mocked.keyrack.set('b@example.com', 'refresh.b@example.com.spent');
          mocked.setLoginOnSpawn({ email: 'b@example.com' });
          const result = await setBrainAuthAccount(
            { owner: null, email: null, env: process.env },
            mocked.context,
          );
          expect(result.outcome).toEqual('renewed');
        },
      );
    });
  });

  given(
    '[case4] an email the keyrack holds for an account in another org (a7)',
    () => {
      when('[t0] the human logs in as b in a new org', () => {
        const scene = useBeforeAll(async () => {
          // the held login opens the other-org account; the new login opens org-b
          const mocked = genMockedContextBrainAuthAccount({
            accounts: [accountB],
          });
          const heldLogin = mocked.provider.issueLogin({
            email: 'b@example.com',
            account: accountBOtherOrg,
          });
          mocked.keyrack.set('b@example.com', heldLogin.refreshToken);
          mocked.setLoginOnSpawn({ email: 'b@example.com' });
          const error = await getError(
            setBrainAuthAccount(
              { owner: null, email: null, env: process.env },
              mocked.context,
            ),
          );
          return { held: mocked, heldLogin, error };
        });

        then('it refuses as a constraint, and names both orgs', () => {
          expect(scene.error.constructor.name).toEqual('ConstraintError');
          expect(scene.error.message).toContain('another org');
          expect(scene.error.message).toContain('org-other');
          expect(scene.error.message).toContain('org-b');
          expect(scene.error).toMatchSnapshot();
        });

        then(
          'the held login is kept, rotated back in place, and still mints',
          () => {
            const parked = scene.held.keyrack.get('b@example.com') ?? '';
            expect(parked).not.toEqual(scene.heldLogin.refreshToken);
            expect(
              scene.held.provider.isLive({ refreshToken: parked }),
            ).toEqual(true);
          },
        );
      });
    },
  );

  given('[case5] the human exits the cli with no login', () => {
    when('[t0] set runs', () => {
      then('it refuses, and names the steps of a login', async () => {
        const mocked = genMockedContextBrainAuthAccount({
          accounts: [accountB],
        });
        const error = await getError(
          setBrainAuthAccount(
            { owner: null, email: null, env: process.env },
            mocked.context,
          ),
        );
        expect(error.constructor.name).toEqual('ConstraintError');
        expect(error.message).toContain('the login did not complete');
        expect(mocked.keyrack.size).toEqual(0);
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('[case6] the claude cli cannot be started', () => {
    when('[t0] set runs', () => {
      then('it fails as a malfunction, and names the install', async () => {
        const mocked = genMockedContextBrainAuthAccount({
          accounts: [accountB],
        });
        const error = await getError(
          setBrainAuthAccount(
            { owner: null, email: null, env: process.env },
            {
              ...mocked.context,
              spawnLogin: () => ({ error: new Error('spawn claude ENOENT') }),
            },
          ),
        );
        expect(error.constructor.name).toEqual('MalfunctionError');
        expect(error.message).toContain('install claude code');
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('[case7] the owner has no keyrack to file a login into', () => {
    when('[t0] set runs', () => {
      const scene = useBeforeAll(async () => {
        const mocked = genMockedContextBrainAuthAccount({
          accounts: [accountB],
        });
        mocked.setLoginOnSpawn({ email: 'b@example.com' });
        const spawns: string[] = [];
        const error = await getError(
          setBrainAuthAccount(
            { owner: 'nokeyrack', email: null, env: process.env },
            {
              ...mocked.context,
              // the refusal the real `assertBrainAuthSlotWritable` gives; proven over the real
              //   keyrack in setBrainAuthSlotToken.integration.test.ts [case0]
              assertSlotWritable: async () => {
                throw new ConstraintError(
                  'no keyrack for this owner, so a login cannot be filed',
                  { hint: 'rhx keyrack init --owner nokeyrack   # then retry' },
                );
              },
              spawnLogin: (args) => {
                spawns.push('claude'); // deliberate mutation: the record of each spawn
                return mocked.context.spawnLogin(args);
              },
            },
          ),
        );
        return { mocked, spawns, error };
      });

      then('it refuses as a constraint, and names the keyrack init', () => {
        expect(scene.error.constructor.name).toEqual('ConstraintError');
        expect(scene.error.message).toContain(
          'rhx keyrack init --owner nokeyrack',
        );
        expect(scene.error).toMatchSnapshot();
      });

      then('the human is never asked to log in', () => {
        expect(scene.spawns).toEqual([]);
        expect(scene.mocked.keyrack.size).toEqual(0);
      });
    });
  });

  given(
    '[case8] the human asked for one account, and logged in as another',
    () => {
      when('[t0] set runs with --account c', () => {
        then('it refuses before aught is filed, and names both', async () => {
          const mocked = genMockedContextBrainAuthAccount({
            accounts: [accountB],
          });
          mocked.setLoginOnSpawn({ email: 'b@example.com' });
          const error = await getError(
            setBrainAuthAccount(
              { owner: null, email: 'c@example.com', env: process.env },
              mocked.context,
            ),
          );
          expect(error.constructor.name).toEqual('ConstraintError');
          expect(error.message).toContain(
            'the login opened a different account than the one asked for',
          );
          expect(error.message).toContain('c@example.com');
          expect(error.message).toContain('b@example.com');
          expect(mocked.keyrack.size).toEqual(0);
          expect(error).toMatchSnapshot();
        });
      });
      when('[t1] set runs with --account b, and b logs in', () => {
        then('it files the login as asked', async () => {
          const mocked = genMockedContextBrainAuthAccount({
            accounts: [accountB],
          });
          mocked.setLoginOnSpawn({ email: 'b@example.com' });
          const result = await setBrainAuthAccount(
            { owner: null, email: 'b@example.com', env: process.env },
            mocked.context,
          );
          expect(result.outcome).toEqual('stored');
        });
      });
    },
  );

  given('[case9] the keyrack write of the new login faults', () => {
    when('[t0] it faults once, then lands', () => {
      then('the write is retried, and the login is filed', async () => {
        const mocked = genMockedContextBrainAuthAccount({
          accounts: [accountB],
        });
        mocked.setLoginOnSpawn({ email: 'b@example.com' });
        const tries: string[] = [];
        const result = await setBrainAuthAccount(
          { owner: null, email: null, env: process.env },
          {
            ...mocked.context,
            setSlotToken: async (slot) => {
              tries.push(slot.email); // deliberate mutation: the record of each try
              if (tries.length === 1) throw new Error('keyrack hiccup');
              return mocked.context.setSlotToken(slot);
            },
          },
        );
        expect(result.outcome).toEqual('stored');
        expect(tries).toEqual(['b@example.com', 'b@example.com']);
        expect(mocked.keyrack.get('b@example.com')).toBeDefined();
      });
    });
    when('[t1] it faults on every try', () => {
      then(
        'it fails loud as a malfunction that says naught was filed',
        async () => {
          const mocked = genMockedContextBrainAuthAccount({
            accounts: [accountB],
          });
          mocked.setLoginOnSpawn({ email: 'b@example.com' });
          const error = await getError(
            setBrainAuthAccount(
              { owner: null, email: null, env: process.env },
              {
                ...mocked.context,
                setSlotToken: async () => {
                  throw new Error('keyrack hiccup');
                },
              },
            ),
          );
          expect(error.constructor.name).toEqual('MalfunctionError');
          expect(error.message).toContain(
            'the new login could not be filed in the keyrack',
          );
          expect(error.message).toContain('naught was filed');
          expect(error.message).not.toContain('refresh.');
          expect(error).toMatchSnapshot();
        },
      );
    });
  });

  given('[case10] the caller passes its own env', () => {
    when('[t0] set runs', () => {
      then(
        'the spawn env is built from that env, never process.env',
        async () => {
          const mocked = genMockedContextBrainAuthAccount({
            accounts: [accountB],
          });
          mocked.setLoginOnSpawn({ email: 'b@example.com' });
          const envs: NodeJS.ProcessEnv[] = [];
          await setBrainAuthAccount(
            {
              owner: null,
              email: null,
              env: { PATH: '/usr/bin', MARKER_OF_THE_CALLER: 'present' },
            },
            {
              ...mocked.context,
              spawnLogin: (args) => {
                envs.push(args.env); // deliberate mutation: the record of each spawn env
                return mocked.context.spawnLogin(args);
              },
            },
          );
          expect(envs[0]?.MARKER_OF_THE_CALLER).toEqual('present');
        },
      );
    });
  });
});
