import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { keyrack } from '@src/contract/sdk.keyrack';

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { relockKeyrack } from '../session/relockKeyrack';
import { getKeyrackKeySecrets } from './getKeyrackKeySecrets';

/**
 * .what = integration test for the secrets projection over the get-or-unlock core
 * .why = proves a locked key is auto-unlocked then re-got (with.unlock:true), that a locked key
 *        with unlock disabled fails as a caller constraint, and that absent keys fail as
 *        caller-fix constraints (not server malfunctions)
 */
describe('getKeyrackKeySecrets.integration', () => {
  const owner = 'ehmpathy';
  const env = 'test';
  const key = 'XAI_API_KEY';
  const slug = 'ehmpathy.test.XAI_API_KEY';

  /**
   * .what = fail fast (caller-fix) if the given key is not granted on this host
   * .why = an absent host setup is a caller constraint — throw loud with an unlock hint,
   *        not a silent skip. verifies via the lower-level `keyrack.get` primitive rather
   *        than `getKeyrackKeySecrets` (the function under test) so a bug in the function
   *        cannot masquerade as an un-set-up host
   */
  const assertKeyGranted = async (keySlug: string): Promise<void> => {
    const granted = await keyrack
      .get({ for: { key: keySlug }, env, owner })
      .then(({ attempt }) => attempt.status === 'granted')
      .catch(() => false);
    if (!granted)
      throw new ConstraintError(
        `keyrack not set up for ${keySlug} on this host`,
        { hint: 'run: rhx keyrack unlock --owner ehmpathy --env test' },
      );
  };

  given('[case1] a key that was never configured (absent)', () => {
    when('[t0] getKeyrackKeySecrets is called for it', () => {
      then(
        'it throws a ConstraintError — caller must act (absent or blocked)',
        async () => {
          // capture the error directly (not via a useThen proxy, which breaks instanceof)
          const error = await getKeyrackKeySecrets({
            for: { keys: ['NONEXISTENT_KEY_FOR_TEST'] },
            with: { unlock: true },
            owner,
            env,
          }).catch((caught) => caught);

          // absent key is caller-fix, not a server malfunction
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.code.exit).toEqual(2);
          expect(error.message).toContain('NONEXISTENT_KEY_FOR_TEST');

          // the failed attempt carries the specific key + status
          expect(error.metadata.attempts[0].key).toEqual(
            'NONEXISTENT_KEY_FOR_TEST',
          );
          expect(error.metadata.attempts[0].status).toEqual('absent');

          // snapshot the error shape for regression detection (no secret values present)
          expect({
            message: error.message,
            metadata: error.metadata,
          }).toMatchSnapshot();
        },
      );
    });
  });

  given('[case2] a configured key that is currently locked', () => {
    when('[t0] the key is relocked, then requested with unlock enabled', () => {
      const secrets = useThen(
        'it auto-unlocks and returns the secret',
        async () => {
          // fail fast (caller-fix) if the key is not granted on this host
          await assertKeyGranted(slug);

          // force a locked state: purge the key from the daemon
          await relockKeyrack({ owner, slugs: [slug] });

          // get-or-unlock should notice it is locked, unlock it, and grant it
          return getKeyrackKeySecrets({
            for: { keys: [key] },
            with: { unlock: true },
            owner,
            env,
          });
        },
      );

      then('the secret is present and non-empty', () => {
        expect(secrets[key]).toBeDefined();
        expect(typeof secrets[key]).toEqual('string');
        expect(secrets[key]!.length).toBeGreaterThan(10);
      });

      then('only the requested key is returned', () => {
        expect(Object.keys(secrets)).toEqual([key]);
      });

      then('result structure matches snapshot', () => {
        // snapshot keys only, not secret values
        expect({ keys: Object.keys(secrets).sort() }).toMatchSnapshot();
      });
    });
  });

  given(
    '[case3] multiple keys with mixed statuses (one granted, one locked)',
    () => {
      // two real keys configured for env=test on this host
      const keyA = 'XAI_API_KEY';
      const keyB = 'OPENAI_API_KEY';
      const slugA = 'ehmpathy.test.XAI_API_KEY';
      const slugB = 'ehmpathy.test.OPENAI_API_KEY';

      when(
        '[t0] only one of the two keys is relocked, then both requested',
        () => {
          const secrets = useThen(
            'it grants the still-unlocked key and auto-unlocks the locked one',
            async () => {
              // fail fast (caller-fix) if either key is not granted on this host
              await assertKeyGranted(slugA);
              await assertKeyGranted(slugB);

              // relock only keyB — keyA stays granted, keyB becomes locked
              await relockKeyrack({ owner, slugs: [slugB] });

              // get-or-unlock should grant keyA directly and auto-unlock keyB
              return getKeyrackKeySecrets({
                for: { keys: [keyA, keyB] },
                with: { unlock: true },
                owner,
                env,
              });
            },
          );

          then('both secrets are present and non-empty', () => {
            expect(secrets[keyA]!.length).toBeGreaterThan(10);
            expect(secrets[keyB]!.length).toBeGreaterThan(10);
          });

          then('exactly the two requested keys are returned', () => {
            expect(Object.keys(secrets).sort()).toEqual([keyA, keyB].sort());
          });

          then('result structure matches snapshot', () => {
            // snapshot keys only, not secret values
            expect({ keys: Object.keys(secrets).sort() }).toMatchSnapshot();
          });
        },
      );
    },
  );

  /**
   * .what = the export-name collision, reached through THIS operation rather than the guard
   * .why = `getKeyrackKeySecrets` is the one flatten surface with no human at the terminal — a
   *        brain receives the map, so a silent last-wins overwrite hands it one credential with
   *        no hint another was lost. the guard's own unit test proves the ORG branch fires;
   *        this proves the WIRE — that this operation calls it, and that the hint a caller of
   *        THIS contract receives names a fix it can actually perform
   *
   * .note = the door is a repo with NO keyrack.yml. with one, `asKeyrackKeySlug` throws
   *         ORG_MISMATCH and the org axis is closed; without one, `getOneKeyrackGrantByKey`
   *         passes a full slug through verbatim, so two orgs both survive. a brain runs
   *         wherever it is invoked, so a manifest-less checkout is an ordinary shape
   * .note = both slugs are granted by ONE env var, which is the collision stated at its root:
   *         `os.envvar` is keyed by the BARE name, so it answers `ahbode.prep.X` and
   *         `ehmpathy.prep.X` with the same value. that is not a fixture trick — it is the
   *         flat namespace the guard exists to refuse
   */
  given(
    '[case5] two orgs claim one key name, in a repo with no manifest',
    () => {
      const keyShared = 'KEYRACK_ORG_COLLISION_TEST_KEY';
      const tempDir = genTempDir({ slug: 'getKeyrackKeySecrets-orgcollision' });

      when('[t0] both full slugs are asked for at once', () => {
        // .note = a plain summary, never the error itself — a `useThen` proxy breaks
        //         `instanceof`, so the class check is done HERE and its verdict carried out
        const refusal = useThen(
          'it refuses rather than overwrite',
          async () => {
            execSync('git init', { cwd: tempDir, stdio: 'ignore' });

            const cwdBefore = process.cwd();
            process.env[keyShared] = 'plaintext-secret-value';
            process.chdir(tempDir);
            const caught = await getKeyrackKeySecrets({
              for: {
                keys: [
                  `ahbode.prep.${keyShared}`,
                  `ehmpathy.prep.${keyShared}`,
                ],
              },
              with: { unlock: false },
              owner,
              env: 'prep',
            })
              .then((secrets) => ({ threw: false as const, secrets }))
              .catch((error) => ({ threw: true as const, error }))
              .finally(() => {
                process.chdir(cwdBefore);
                delete process.env[keyShared];
              });

            if (!caught.threw)
              return {
                isConstraintError: false,
                exit: null,
                message: '',
                hint: '',
                serialized: JSON.stringify(caught.secrets),
              };
            const error = caught.error;
            return {
              isConstraintError: error instanceof ConstraintError,
              exit: error.code?.exit ?? null,
              message: String(error.message ?? ''),
              hint: String(error.metadata?.hint ?? ''),
              serialized: JSON.stringify({
                message: error.message,
                metadata: error.metadata,
              }),
            };
          },
        );

        then('it is a ConstraintError — the caller must act', () => {
          expect(refusal.isConstraintError).toEqual(true);
          expect(refusal.exit).toEqual(2);
        });

        then('the message names BOTH orgs, so the clash is legible', () => {
          expect(refusal.message).toContain(`ahbode.prep.${keyShared}`);
          expect(refusal.message).toContain(`ehmpathy.prep.${keyShared}`);
        });

        // ⚠️ THE clamp. before the org axis existed, this pair fell to the ENV hint — yet both
        //    keys sit at `prep`, so a caller who obeyed `narrow env` would meet the identical
        //    refusal. the hint must name the axis that actually differs
        //    (rule.require.errors-name-the-fix)
        then(
          'the hint names the ORG, never the env and never a cli flag',
          () => {
            expect(refusal.hint).toContain('one org at a time');
            expect(refusal.hint).not.toContain('narrow `env`');
            expect(refusal.hint).not.toContain('--reach');
          },
        );

        then('no secret value rides the error a brain would log', () => {
          expect(refusal.serialized).not.toContain('plaintext-secret-value');
        });
      });
    },
  );

  given('[case4] an ungettable key with unlock disabled', () => {
    when(
      '[t0] the key (no live source) is requested with with.unlock=false',
      () => {
        then(
          'it throws a ConstraintError instead of an unlock (caller must act)',
          async () => {
            // fail fast (caller-fix) if the key is not granted on this host
            await assertKeyGranted(slug);

            // remove the env-var source and purge the daemon so the key is genuinely
            // ungettable (the harness sources keys into env; this key has no local vault
            // copy on this host, so it lands as `absent` rather than `locked`)
            const envBefore = process.env[key];
            delete process.env[key];
            try {
              await relockKeyrack({ owner, slugs: [slug] });

              // unlock disabled → an ungettable key fails as a caller constraint, no unlock
              const error = await getKeyrackKeySecrets({
                for: { keys: [key] },
                with: { unlock: false },
                owner,
                env,
              }).catch((caught) => caught);

              expect(error).toBeInstanceOf(ConstraintError);
              expect(error.code.exit).toEqual(2);
              expect(error.message).toContain(key);
              expect(error.metadata.attempts[0].status).not.toEqual('granted');
            } finally {
              // restore the env-var so later tests/files still find the key granted
              if (envBefore !== undefined) process.env[key] = envBefore;
            }
          },
        );
      },
    );
  });

  /**
   * .what = the brain-creds path against a repo that DECLARES a reach
   * .why = this map is keyed by BARE key name, so it holds ONE value per name and cannot carry
   *        a reach beside its reachless peer, so a declared reach must be filtered OUT of every
   *        gate rather than fail the fetch. all three flatten surfaces behave alike — the cli
   *        `source`, the sdk `sourceAllKeysIntoEnv`, and this one — so one fact reads one way
   *
   * .note = TWO clamps ride in one case, and they fail in opposite directions:
   *           - the FILTER — a declared-but-absent reach must NOT reach the caller-fix gate.
   *             without it, the enumerate turns every repo that declares a reach into a hard
   *             ConstraintError: the human loses EVERY credential to gain one fact
   *           - the SILENCE — no reach may be announced on stderr. an announce was built here
   *             and cut (2026-08-12); this clamp goes red if one returns by any route
   *         a change that lands one and drops the other goes red here
   * .note = hermetic. `os.envvar` grants the reachless keys from `process.env`, and the declared
   *         reach lands `absent` (a vault keyed by bare name cannot address one, e20/q9) —
   *         which is the honest shape, since absent is the status the notice must survive
   */
  given('[case6] a repo that declares a reach beside a plain key', () => {
    const keyPlain = 'KEYRACK_REACH_NOTICE_PLAIN';
    const keyReached = 'KEYRACK_REACH_NOTICE_REACHED';
    const exid = 'beav@ehmpathy.com';
    const tempDir = genTempDir({ slug: 'getKeyrackKeySecrets-reachnotice' });

    when('[t0] the whole repo is swept for secrets', () => {
      const swept = useThen(
        'it returns a map rather than a refusal',
        async () => {
          execSync('git init', { cwd: tempDir, stdio: 'ignore' });
          mkdirSync(join(tempDir, '.agent'), { recursive: true });
          writeFileSync(
            join(tempDir, '.agent', 'keyrack.yml'),
            [
              'org: testorg',
              '',
              'env.prep:',
              `  - ${keyPlain}`,
              `  - ${keyReached}:`,
              '      reaches:',
              `        - ${exid}`,
              '',
            ].join('\n'),
          );

          // capture stderr rather than let the notice escape into the jest report
          const written: string[] = [];
          const writeBefore = process.stderr.write.bind(process.stderr);
          const cwdBefore = process.cwd();
          process.env[keyPlain] = 'plaintext-plain-value';
          process.env[keyReached] = 'plaintext-reached-value';
          process.chdir(tempDir);
          process.stderr.write = ((chunk: string | Uint8Array) => {
            written.push(String(chunk));
            return true;
          }) as typeof process.stderr.write;

          const caught = await getKeyrackKeySecrets({
            for: { repo: true },
            with: { unlock: false },
            owner,
            env: 'prep',
          })
            .then((secrets) => ({ threw: false as const, secrets }))
            .catch((error) => ({ threw: true as const, error }))
            .finally(() => {
              process.stderr.write = writeBefore;
              process.chdir(cwdBefore);
              delete process.env[keyPlain];
              delete process.env[keyReached];
            });

          return {
            threw: caught.threw,
            error: caught.threw ? String(caught.error?.message ?? '') : '',
            secrets: caught.threw ? {} : caught.secrets,
            stderr: written.join(''),
          };
        },
      );

      // ⚠️ CLAMP 1 — the filter. a declared reach with no key cut for it is `absent`, and
      //    absent is caller-fix. unfiltered it would refuse the whole sweep, so a repo that
      //    declares one reach could fetch NO credential at all
      then('a declared-but-absent reach does not refuse the sweep', () => {
        expect(swept.threw).toEqual(false);
        expect(swept.error).toEqual('');
      });

      then('the reachless secrets still come back, byte for byte (e1)', () => {
        expect(swept.secrets[keyPlain]).toEqual('plaintext-plain-value');
        expect(swept.secrets[keyReached]).toEqual('plaintext-reached-value');
      });

      // ⚠️ CLAMP 2 — the SILENCE. an announce was built here (2026-08-07) and cut (2026-08-12),
      //    so this clamp inverted with it. it fired on every sweep for any repo that holds a
      //    reach, always the same lines, never actionable differently — alarm fatigue, whose
      //    real cost is that it trains a runner to ignore keyrack stderr and so weakens the
      //    notices that DO vary
      // .note = silence is safe because CLAMP 1 above already proves the map comes back with
      //         the CORRECT values. "fewer than exist", never "the wrong one". `keyrack list`
      //         renders a `reach:` leaf, which is where a human reads what this host holds
      then('the omitted reach is NOT announced — this path is silent', () => {
        expect(swept.stderr).not.toContain('not sourced');
        expect(swept.stderr).not.toContain(exid);
      });

      // holds regardless of what this path announces, so it outlives either decision
      then('no secret value reaches a stream a runner would log', () => {
        expect(swept.stderr).not.toContain('plaintext-plain-value');
        expect(swept.stderr).not.toContain('plaintext-reached-value');
      });
    });
  });
});
