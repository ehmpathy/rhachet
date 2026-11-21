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
import { getBrainAuthPath } from '@src/domain.operations/brain/auth/getBrainAuthPath';

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setBrainAuthAccountInUseAtGrove } from './setBrainAuthAccountInUseAtGrove';

/**
 * .mock = the claude oauth provider and the keyrack, via the op's context (never jest.mock)
 * .why = a real run needs two claude seats set aside for tests (fulcrum F6), and a read or a swap
 *   on any other seat rotates a login a human works on. the grove file, claude.json, and claude's
 *   own write lock are real, in a temp home
 * .real = the seat proofs, owed with F6; the real provider's refusal half is pinned in
 *   `getOneClaudeOauthReply.integration.test.ts`, the real keyrack in
 *   `vaultAdapterOsSecure.integration.test.ts`
 */

const accountA = genSampleBrainAuthAccount({
  email: 'a@example.com',
  orgId: 'org-a',
});
const accountB = genSampleBrainAuthAccount({
  email: 'b@example.com',
  orgId: 'org-b',
});

/**
 * .what = a temp home signed in on a, with b parked in the keyrack
 */
const genScene = (input: { slug: string }) => {
  const home = genTempDir({ slug: input.slug });
  const mocked = genMockedContextBrainAuthAccount({
    accounts: [accountA, accountB],
  });
  const groveA = mocked.provider.issueLogin({ email: 'a@example.com' });
  setSampleGroveLogin({ home, pair: groveA });
  writeFileSync(
    join(home, '.claude.json'),
    JSON.stringify({
      numStartups: 2,
      oauthAccount: {
        accountUuid: accountA.accountUuid,
        emailAddress: 'a@example.com',
      },
    }),
  );
  const parkedB = mocked.provider.issueLogin({ email: 'b@example.com' });
  mocked.keyrack.set('b@example.com', parkedB.refreshToken);
  return { home, mocked, groveA, parkedB };
};

const readGrove = (input: { home: string }) =>
  JSON.parse(readFileSync(getBrainAuthPath({ home: input.home }), 'utf8'))
    .claudeAiOauth as { accessToken: string; refreshToken: string };

describe('setBrainAuthAccountInUseAtGrove', () => {
  given('[case1] a grove on a, with b parked (case=3)', () => {
    when('[t0] b is put to use', () => {
      const scene = useBeforeAll(async () => {
        const built = genScene({ slug: 'brains-auth-use-swap' });
        const result = await setBrainAuthAccountInUseAtGrove(
          { owner: null, home: built.home, email: 'b@example.com', env: {} },
          built.mocked.context,
        );
        return { ...built, result };
      });

      then('the compare names a before and b after', () => {
        expect(scene.result.outcome).toEqual('swapped');
        expect(scene.result.before?.email).toEqual('a@example.com');
        expect(scene.result.after.email).toEqual('b@example.com');
        expect(scene.result.stowed).toEqual('a@example.com');
      });

      then('the grove file holds b, and a token that still mints', () => {
        const grove = readGrove({ home: scene.home });
        expect(grove.refreshToken).toContain('refresh.b@example.com');
        expect(
          scene.mocked.provider.isLive({ refreshToken: grove.refreshToken }),
        ).toEqual(true);
      });

      then("a's login is stowed in the keyrack, live, as it was", () => {
        expect(scene.mocked.keyrack.get('a@example.com')).toEqual(
          scene.groveA.refreshToken,
        );
        expect(
          scene.mocked.provider.isLive({
            refreshToken: scene.groveA.refreshToken,
          }),
        ).toEqual(true);
      });

      then(
        "b's spent copy is gone from the keyrack: the grove is its one holder",
        () => {
          expect(scene.mocked.keyrack.has('b@example.com')).toEqual(false);
          expect(
            scene.mocked.provider.isLive({
              refreshToken: scene.parkedB.refreshToken,
            }),
          ).toEqual(false);
        },
      );

      then('only b was minted; the grove token was never refreshed', () => {
        expect(scene.mocked.provider.mints).toEqual(['b@example.com']);
      });

      then("claude's own record names b, with its other keys kept", () => {
        const claudeJson = JSON.parse(
          readFileSync(join(scene.home, '.claude.json'), 'utf8'),
        );
        expect(claudeJson.oauthAccount.emailAddress).toEqual('b@example.com');
        expect(claudeJson.numStartups).toEqual(2);
      });

      then('the result matches its snapshot, with no token in it', () => {
        expect(JSON.stringify(scene.result)).not.toContain('refresh.');
        expect(JSON.stringify(scene.result)).not.toContain('access.');
        expect(scene.result).toMatchSnapshot();
      });
    });
  });

  given('[case2] a grove already on the target (case=10 [t2])', () => {
    when('[t0] a is put to use', () => {
      const scene = useBeforeAll(async () => {
        const built = genScene({ slug: 'brains-auth-use-unchanged' });
        const result = await setBrainAuthAccountInUseAtGrove(
          { owner: null, home: built.home, email: 'a@example.com', env: {} },
          built.mocked.context,
        );
        return { ...built, result };
      });

      then('the outcome is unchanged, with naught minted or written', () => {
        expect(scene.result.outcome).toEqual('unchanged');
        expect(scene.result.windowsCapped).toBeNull(); // no usage was read, so none is claimed
        expect(scene.mocked.provider.mints).toEqual([]);
        expect(readGrove({ home: scene.home }).refreshToken).toEqual(
          scene.groveA.refreshToken,
        );
        expect(scene.mocked.keyrack.get('b@example.com')).toEqual(
          scene.parkedB.refreshToken,
        );
      });

      then(
        "claude's own record, already in sync, is left byte for byte",
        () => {
          expect(
            readFileSync(join(scene.home, '.claude.json'), 'utf8'),
          ).toEqual(
            JSON.stringify({
              numStartups: 2,
              oauthAccount: {
                accountUuid: accountA.accountUuid,
                emailAddress: 'a@example.com',
              },
            }),
          );
        },
      );
    });

    when("[t1] a is put to use, and claude's record still names b", () => {
      const scene = useBeforeAll(async () => {
        const built = genScene({ slug: 'brains-auth-use-unchanged-stale' });
        // a prior use swapped the grove, then faulted before its record sync
        writeFileSync(
          join(built.home, '.claude.json'),
          JSON.stringify({
            numStartups: 2,
            oauthAccount: {
              accountUuid: accountB.accountUuid,
              emailAddress: 'b@example.com',
            },
          }),
        );
        const result = await setBrainAuthAccountInUseAtGrove(
          { owner: null, home: built.home, email: 'a@example.com', env: {} },
          built.mocked.context,
        );
        return { ...built, result };
      });

      then('the outcome is unchanged, and naught is minted', () => {
        expect(scene.result.outcome).toEqual('unchanged');
        expect(scene.mocked.provider.mints).toEqual([]);
      });

      then("claude's record is repaired to name a, its other keys kept", () => {
        const claudeJson = JSON.parse(
          readFileSync(join(scene.home, '.claude.json'), 'utf8'),
        );
        expect(claudeJson.oauthAccount.emailAddress).toEqual('a@example.com');
        expect(claudeJson.oauthAccount.accountUuid).toEqual(
          accountA.accountUuid,
        );
        expect(claudeJson.numStartups).toEqual(2);
      });
    });
  });

  given(
    '[case3] an env credential outranks the grove login (case=8 [t0])',
    () => {
      when('[t0] b is put to use', () => {
        const scene = useBeforeAll(async () => {
          const built = genScene({ slug: 'brains-auth-use-outranked' });
          const error = await getError(
            setBrainAuthAccountInUseAtGrove(
              {
                owner: null,
                home: built.home,
                email: 'b@example.com',
                env: { CLAUDE_CODE_OAUTH_TOKEN: 'set-by-the-caller' },
              },
              built.mocked.context,
            ),
          );
          return { ...built, error };
        });

        then(
          'it refuses as a constraint, and names the env key to unset',
          () => {
            expect(scene.error.constructor.name).toEqual('ConstraintError');
            expect(scene.error.message).toContain(
              'an env credential outranks the grove login',
            );
            expect(scene.error.message).not.toContain('use did not land');
            expect(scene.error.message).toContain('CLAUDE_CODE_OAUTH_TOKEN');
            expect(scene.error).toMatchSnapshot();
          },
        );

        then(
          'it refuses before any read or write: the grove still holds a',
          () => {
            expect(readGrove({ home: scene.home }).refreshToken).toEqual(
              scene.groveA.refreshToken,
            );
            expect(scene.mocked.provider.mints).toEqual([]);
          },
        );

        then('b stays parked, and a is not stowed', () => {
          expect(scene.mocked.keyrack.get('b@example.com')).toEqual(
            scene.parkedB.refreshToken,
          );
          expect(scene.mocked.keyrack.has('a@example.com')).toEqual(false);
        });
      });

      when('[t1] two env credentials are set', () => {
        const scene = useBeforeAll(async () => {
          const built = genScene({ slug: 'brains-auth-use-outranked-two' });
          const error = await getError(
            setBrainAuthAccountInUseAtGrove(
              {
                owner: null,
                home: built.home,
                email: 'b@example.com',
                env: {
                  CLAUDE_CODE_OAUTH_TOKEN: 'set-by-the-caller',
                  ANTHROPIC_API_KEY: 'set-by-the-caller',
                },
              },
              built.mocked.context,
            ),
          );
          return { ...built, error };
        });

        then('the hint is one copy-paste unset of both keys', () => {
          expect(scene.error.message).toContain(
            'unset CLAUDE_CODE_OAUTH_TOKEN ANTHROPIC_API_KEY   # in the env where clones spawn',
          );
          expect(scene.error.message).not.toContain('set-by-the-caller');
          expect(scene.error).toMatchSnapshot();
        });
      });
    },
  );

  given(
    "[case3b] the provider is busy when the grove's account is read",
    () => {
      when('[t0] b is put to use', () => {
        const scene = useBeforeAll(async () => {
          const built = genScene({ slug: 'brains-auth-use-grove-busy' });
          const error = await getError(
            setBrainAuthAccountInUseAtGrove(
              {
                owner: null,
                home: built.home,
                email: 'b@example.com',
                env: {},
              },
              {
                ...built.mocked.context,
                getProfile: async () => ({ status: 'rate-limited' }),
              },
            ),
          );
          return { ...built, error };
        });

        then('it fails as a malfunction to retry, never a human fault', () => {
          expect(scene.error.constructor.name).toEqual('MalfunctionError');
          expect(scene.error.message).toContain('could not be read');
          expect(scene.error.message).toContain('rate-limited');
          expect(scene.error.message).not.toContain('run any claude session');
          expect(scene.error).toMatchSnapshot();
        });

        then('naught is minted or written', () => {
          expect(scene.mocked.provider.mints).toEqual([]);
          expect(readGrove({ home: scene.home }).refreshToken).toEqual(
            scene.groveA.refreshToken,
          );
          expect(scene.mocked.keyrack.get('b@example.com')).toEqual(
            scene.parkedB.refreshToken,
          );
        });
      });
    },
  );

  given(
    '[case4] a live session rotates the grove login mid-swap (case=8 [t1])',
    () => {
      when('[t0] b is put to use', () => {
        const scene = useBeforeAll(async () => {
          const built = genScene({ slug: 'brains-auth-use-raced' });

          // the moment b is named, a live session on a refreshes and rewrites the grove file
          built.mocked.provider.onProfile.push(({ email }) => {
            if (email !== 'b@example.com') return;
            setSampleGroveLogin({
              home: built.home,
              pair: built.mocked.provider.issueLogin({
                email: 'a@example.com',
              }),
            });
          });
          const error = await getError(
            setBrainAuthAccountInUseAtGrove(
              {
                owner: null,
                home: built.home,
                email: 'b@example.com',
                env: {},
              },
              built.mocked.context,
            ),
          );
          return { ...built, error };
        });

        then('the use aborts, and says the target stays usable', () => {
          expect(scene.error.message).toContain('grove login changed mid-swap');
          expect(scene.error).toMatchSnapshot();
        });

        then("the session's own rewrite of the grove is kept", () => {
          expect(readGrove({ home: scene.home }).refreshToken).toContain(
            'refresh.a@example.com',
          );
        });

        then(
          "b's rotated login is refiled in the keyrack, and still mints",
          () => {
            const refiled = scene.mocked.keyrack.get('b@example.com') ?? '';
            expect(refiled).not.toEqual(scene.parkedB.refreshToken);
            expect(
              scene.mocked.provider.isLive({ refreshToken: refiled }),
            ).toEqual(true);
          },
        );
      });
    },
  );

  given('[case5] a target the keyrack does not hold (case=5 [t0])', () => {
    when('[t0] c is put to use', () => {
      then('it refuses, with the accounts held', async () => {
        const built = genScene({ slug: 'brains-auth-use-absent' });
        const error = await getError(
          setBrainAuthAccountInUseAtGrove(
            { owner: null, home: built.home, email: 'c@example.com', env: {} },
            built.mocked.context,
          ),
        );
        expect(error.constructor.name).toEqual('ConstraintError');
        expect(error.message).toContain(
          'no stored credential for c@example.com',
        );
        expect(error.message).toContain('b@example.com');
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('[case5b] a target whose parked login is spent (case=5 [t1])', () => {
    when('[t0] b is put to use', () => {
      const scene = useBeforeAll(async () => {
        const built = genScene({ slug: 'brains-auth-use-dead' });
        built.mocked.keyrack.set(
          'b@example.com',
          'refresh.b@example.com.spent',
        );
        const error = await getError(
          setBrainAuthAccountInUseAtGrove(
            { owner: null, home: built.home, email: 'b@example.com', env: {} },
            built.mocked.context,
          ),
        );
        return { ...built, error };
      });

      then(
        'it refuses as a constraint, and names the set that renews it',
        () => {
          expect(scene.error.constructor.name).toEqual('ConstraintError');
          expect(scene.error.message).toContain(
            'the parked login for this account no longer opens it',
          );
          expect(scene.error.message).toContain(
            'rhx brains auth set --brain claude',
          );
          expect(scene.error).toMatchSnapshot();
        },
      );

      then('the grove is untouched: it still holds a', () => {
        expect(readGrove({ home: scene.home }).refreshToken).toEqual(
          scene.groveA.refreshToken,
        );
        expect(
          scene.mocked.provider.isLive({
            refreshToken: scene.groveA.refreshToken,
          }),
        ).toEqual(true);
      });
    });
  });

  given('[case5d] a keyrack that holds the target but is locked', () => {
    when('[t0] b is put to use', () => {
      const scene = useBeforeAll(async () => {
        const built = genScene({ slug: 'brains-auth-use-locked' });
        const error = await getError(
          setBrainAuthAccountInUseAtGrove(
            {
              owner: 'ehmpath',
              home: built.home,
              email: 'b@example.com',
              env: {},
            },
            {
              ...built.mocked.context,
              getSlotToken: async () => ({ status: 'locked', fix: null }),
            },
          ),
        );
        return { ...built, error };
      });

      then('it refuses as a constraint, and names the unlock to run', () => {
        expect(scene.error.constructor.name).toEqual('ConstraintError');
        expect(scene.error.message).toContain(
          'the keyrack holds this account, but will not open it',
        );
        expect(scene.error.message).toContain(
          'rhx keyrack unlock --owner ehmpath --env prep',
        );
        expect(scene.error).toMatchSnapshot();
      });

      then('naught is minted, and the grove still holds a', () => {
        expect(scene.mocked.provider.mints).toEqual([]);
        expect(readGrove({ home: scene.home }).refreshToken).toEqual(
          scene.groveA.refreshToken,
        );
      });
    });
  });

  given('[case5c] the prior account cannot be stowed after the install', () => {
    when('[t0] b is put to use', () => {
      const scene = useBeforeAll(async () => {
        const built = genScene({ slug: 'brains-auth-use-stow-fault' });
        const contextStowFaults = {
          ...built.mocked.context,
          setSlotToken: async (call: {
            owner: string | null;
            email: string;
            token: string;
          }) => {
            if (call.email === 'a@example.com')
              throw new Error('keyrack locked');
            return built.mocked.context.setSlotToken(call);
          },
        };
        const error = await getError(
          setBrainAuthAccountInUseAtGrove(
            { owner: null, home: built.home, email: 'b@example.com', env: {} },
            contextStowFaults,
          ),
        );
        return { ...built, error };
      });

      then(
        'it fails loud: the prior login is named as lost, with its cure',
        () => {
          expect(scene.error.constructor.name).toEqual('MalfunctionError');
          expect(scene.error.message).toContain(
            "a@example.com's login could not be stowed, so it is lost",
          );
          expect(scene.error.message).toContain(
            'rhx brains auth set --brain claude',
          );
          expect(scene.error).toMatchSnapshot();
        },
      );

      then('the grove holds b, the target the use installed', () => {
        expect(readGrove({ home: scene.home }).refreshToken).toContain(
          'refresh.b@example.com',
        );
      });
    });
  });

  given('[case6] a target whose week is full (the capped cell)', () => {
    when('[t0] b is put to use', () => {
      then('the swap lands, and names the capped window', async () => {
        const home = genTempDir({ slug: 'brains-auth-use-capped' });
        const mocked = genMockedContextBrainAuthAccount({
          accounts: [accountA, accountB],
          options: {
            usageReplies: {
              'b@example.com': {
                five_hour: { utilization: 20, resets_at: null },
                seven_day: { utilization: 100, resets_at: null },
              },
            },
          },
        });
        setSampleGroveLogin({
          home,
          pair: mocked.provider.issueLogin({ email: 'a@example.com' }),
        });
        mocked.keyrack.set(
          'b@example.com',
          mocked.provider.issueLogin({ email: 'b@example.com' }).refreshToken,
        );
        const result = await setBrainAuthAccountInUseAtGrove(
          { owner: null, home, email: 'b@example.com', env: {} },
          mocked.context,
        );
        expect(result.outcome).toEqual('swapped');
        expect(result.windowsCapped?.map((window) => window.slug)).toEqual([
          'week',
        ]);
      });
    });

    when('[t1] b is put to use, and its usage cannot be read', () => {
      then(
        'the swap lands, and the caps read as unknown, never as none',
        async () => {
          const home = genTempDir({ slug: 'brains-auth-use-usage-unread' });
          const mocked = genMockedContextBrainAuthAccount({
            accounts: [accountA, accountB],
            options: { usageRateLimited: ['b@example.com'] },
          });
          setSampleGroveLogin({
            home,
            pair: mocked.provider.issueLogin({ email: 'a@example.com' }),
          });
          mocked.keyrack.set(
            'b@example.com',
            mocked.provider.issueLogin({ email: 'b@example.com' }).refreshToken,
          );
          const result = await setBrainAuthAccountInUseAtGrove(
            { owner: null, home, email: 'b@example.com', env: {} },
            mocked.context,
          );
          expect(result.outcome).toEqual('swapped');
          expect(result.windowsCapped).toBeNull();
        },
      );
    });

    when('[t2] b is put to use, and its usage reply has drifted', () => {
      then(
        'the swap lands, and the caps read as unknown: drift never halts the swap',
        async () => {
          const home = genTempDir({ slug: 'brains-auth-use-usage-drift' });
          const mocked = genMockedContextBrainAuthAccount({
            accounts: [accountA, accountB],
            options: {
              usageReplies: {
                'b@example.com': {
                  seven_day: { utilization: '40%', resets_at: null },
                },
              },
            },
          });
          setSampleGroveLogin({
            home,
            pair: mocked.provider.issueLogin({ email: 'a@example.com' }),
          });
          mocked.keyrack.set(
            'b@example.com',
            mocked.provider.issueLogin({ email: 'b@example.com' }).refreshToken,
          );
          const result = await setBrainAuthAccountInUseAtGrove(
            { owner: null, home, email: 'b@example.com', env: {} },
            mocked.context,
          );
          expect(result.outcome).toEqual('swapped');
          expect(result.after.email).toEqual('b@example.com');
          expect(result.windowsCapped).toBeNull();
          expect(readGrove({ home }).refreshToken).toContain(
            'refresh.b@example.com',
          );
        },
      );
    });
  });

  given('[case8] a read-back that disagrees with the target (case=8)', () => {
    /**
     * .what = a context whose profile read of the target answers `answer` on its second call: the
     *   first names the minted target, the second is the read-back from the grove file
     */
    const genContextReadBackAs = (input: {
      context: ReturnType<typeof genMockedContextBrainAuthAccount>['context'];
      answer:
        | { status: 'ok'; account: typeof accountB }
        | { status: 'rate-limited' };
    }) => {
      const reads = { ofTarget: 0 };
      return {
        ...input.context,
        getProfile: async (args: { accessToken: string }) => {
          const profile = await input.context.getProfile(args);
          if (
            profile.status !== 'ok' ||
            profile.account.email !== 'b@example.com'
          )
            return profile;
          reads.ofTarget += 1; // deliberate mutation: the count of target reads
          return reads.ofTarget === 2 ? input.answer : profile;
        },
      };
    };

    when('[t0b] the read-back names b in another org', () => {
      const scene = useBeforeAll(async () => {
        const built = genScene({ slug: 'brains-auth-use-readback-mismatch' });
        const error = await getError(
          setBrainAuthAccountInUseAtGrove(
            { owner: null, home: built.home, email: 'b@example.com', env: {} },
            genContextReadBackAs({
              context: built.mocked.context,
              answer: {
                status: 'ok',
                account: genSampleBrainAuthAccount({
                  email: 'b@example.com',
                  orgId: 'org-other',
                }),
              },
            }),
          ),
        );
        return { ...built, error };
      });

      then('it fails as a malfunction: the use did not land', () => {
        expect(scene.error.constructor.name).toEqual('MalfunctionError');
        expect(scene.error.message).toContain('use did not land');
      });

      then('the error names both sides by email and org', () => {
        expect(scene.error.message).toContain('b@example.com in org-b');
        expect(scene.error.message).toContain('b@example.com in org-other');
        expect(scene.error).toMatchSnapshot();
      });

      then('the email alone never passes for the proof', () => {
        expect(scene.error.message).not.toContain('use landed');
      });
    });

    when('[t0c] the read-back is not answered', () => {
      const scene = useBeforeAll(async () => {
        const built = genScene({ slug: 'brains-auth-use-readback-unread' });
        const error = await getError(
          setBrainAuthAccountInUseAtGrove(
            { owner: null, home: built.home, email: 'b@example.com', env: {} },
            genContextReadBackAs({
              context: built.mocked.context,
              answer: { status: 'rate-limited' },
            }),
          ),
        );
        return { ...built, error };
      });

      then(
        'it says the use landed, unverified, never that it did not land',
        () => {
          expect(scene.error.constructor.name).toEqual('MalfunctionError');
          expect(scene.error.message).toContain(
            'use landed, but its read-back could not be verified',
          );
          expect(scene.error.message).not.toContain('use did not land');
          expect(scene.error).toMatchSnapshot();
        },
      );

      then('the grove holds b, and a is stowed as it was', () => {
        expect(readGrove({ home: scene.home }).refreshToken).toContain(
          'refresh.b@example.com',
        );
        expect(scene.mocked.keyrack.get('a@example.com')).toEqual(
          scene.groveA.refreshToken,
        );
      });
    });
  });

  given('[case7] a grove whose live token has lapsed (case=5 [t3])', () => {
    when('[t0] b is put to use', () => {
      then('it refuses as unverified, and naught is minted', async () => {
        const built = genScene({ slug: 'brains-auth-use-lapsed' });
        setSampleGroveLogin({
          home: built.home,
          pair: built.groveA,
          lapsed: true,
        });
        const error = await getError(
          setBrainAuthAccountInUseAtGrove(
            { owner: null, home: built.home, email: 'b@example.com', env: {} },
            built.mocked.context,
          ),
        );
        expect(error.message).toContain(
          "the grove's signed-in account is unverified",
        );
        expect(error.message).toContain('a@example.com');
        expect(built.mocked.provider.mints).toEqual([]);
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('[case9] a step after the install faults (steps 5-7)', () => {
    when("[t0] b is put to use, and b's spent copy cannot be cleared", () => {
      const scene = useBeforeAll(async () => {
        const built = genScene({ slug: 'brains-auth-use-landed-fault' });
        const error = await getError(
          setBrainAuthAccountInUseAtGrove(
            { owner: null, home: built.home, email: 'b@example.com', env: {} },
            {
              ...built.mocked.context,
              delSlotToken: async () => {
                throw new Error('keyrack locked');
              },
            },
          ),
        );
        return { ...built, error };
      });

      then('it fails loud, and names the use as landed', () => {
        expect(scene.error.constructor.name).toEqual('MalfunctionError');
        expect(scene.error.message).toContain(
          'the use landed, but a step after it faulted',
        );
        expect(scene.error.message).toContain('"landed": true');
        expect(scene.error.message).not.toContain('use did not land');
        expect(scene.error).toMatchSnapshot();
      });

      then('the grove holds b, the target the use installed', () => {
        expect(readGrove({ home: scene.home }).refreshToken).toContain(
          'refresh.b@example.com',
        );
      });

      then('a is stowed, live, as it was', () => {
        expect(scene.mocked.keyrack.get('a@example.com')).toEqual(
          scene.groveA.refreshToken,
        );
      });
    });
  });
});
