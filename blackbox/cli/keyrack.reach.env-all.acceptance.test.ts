import { given, then, useBeforeAll, when } from 'test-fns';

import { envIsolated } from '@/blackbox/.test/infra/envIsolated';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = the `env=all` fallback, driven through the real cli → socket → daemon wire while
 *         two reaches of one `env=all` key are held
 * .why = `getAllKeyrackProbeAddresses` calls this ordering "the single most safety-critical
 *        invariant of the reach axis": the env=all shot must CARRY THE REACH ACROSS. a
 *        slug-only fallback lets an ask at `org.test.KEY@$reach` land on the REACHLESS
 *        `org.all.KEY` and hand back a credential for the wrong reach — e18's exact
 *        failure shape, one layer below where the identity axis removed it
 *
 * .note = ⚠️ this invariant was proven ONLY in memory, at `daemonKeyStore.test.ts [case10]`,
 *         against a store built by direct `.set()` calls. that unit cannot see a reach
 *         dropped anywhere on the way IN (the cli parse, the slug construction, the socket
 *         serialization) nor on the way OUT — every one of which would leave the unit green
 *         while the wire handed back the wrong secret. a contract owes an acceptance test
 *         (`rule.require.test-coverage-by-grain`), and this is the contract whose failure is
 *         the wish's headline hazard
 * .note = the three claims below mirror `[case10]`'s three, one for one, so a reader can set
 *         them side by side and see exactly what the wire adds: the unit asserts a stored
 *         object, these assert the SECRET a caller actually receives
 * .note = fully hermetic. `os.direct` is a plaintext store on disk, so two reaches of an
 *         `env=all` key can be held with no vault, no network, and no credential
 */
describe('keyrack reach env=all fallback', () => {
  // kill any stale daemon so the store below is the only one in play
  beforeAll(() => killKeyrackDaemonForTests());

  /**
   * .what = one key declared under `env.all`, held at two reaches
   * .why = `env=all` is the only place a key's stored slug DIFFERS from the slug a caller
   *        asks with — `testorg.all.CROSS_ENV_KEY` held, `testorg.test.CROSS_ENV_KEY` asked.
   *        that gap is the fallback, and it is the one lookup where a reach can be dropped
   *        without any address mismatch to make it loud
   */
  given('[case1] an env=all key held at two reaches', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-reach-env-all' }),
    );

    when('[t0] both reaches are unlocked', () => {
      const unlockReachless = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'all'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      const unlockReached = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'all',
            '--key',
            'CROSS_ENV_KEY',
            '--reach',
            'beav@ehmpathy.com',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('the reachless unlock succeeds', () => {
        expect(unlockReachless.status).toEqual(0);
      });

      // .note = load-bearing precondition. if the reach unlock failed, every claim below
      //         would be about a rack that holds ONE key, and `[t2]`'s refusal would pass
      //         for the trivial reason that no reach was ever held
      then('the reach unlock succeeds — the second reach really is held', () => {
        expect(unlockReached.status).toEqual(0);
        expect(unlockReached.stdout).toContain('beav@ehmpathy.com');
      });
    });

    /**
     * .what = `[case10] [t1]` at the wire — the fallback carries the reach across
     * .why = the ask is `testorg.test.CROSS_ENV_KEY@beav@ehmpathy.com`, and no key is held
     *        at that address. the fallback must retry at `testorg.all.CROSS_ENV_KEY@beav@…`
     *        and find the reach key
     *
     * .note = `--value` is what makes this a claim about the SECRET rather than about a
     *         render. a reach-blind fallback would still exit 0 and still print a tree — it
     *         would simply print the WRONG credential, which no status/render clamp can see
     */
    when('[t1] the reach key is asked for at a scoped env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'CROSS_ENV_KEY',
            '--env',
            'test',
            '--reach',
            'beav@ehmpathy.com',
            '--value',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('it exits 0 — the env=all twin answered the scoped ask', () => {
        expect(result.status).toEqual(0);
      });

      // ⚠️ THE clamp. the two secrets differ by one word, so a reach dropped anywhere on the
      //    path swaps them silently. both directions are asserted: the right one arrived AND
      //    the wrong one did not
      then('the secret is the REACH reach, not the reachless one', () => {
        expect(result.stdout).toContain('sk-all-env-at-beav-ddd444');
        expect(result.stdout).not.toContain('sk-all-env-reachless-ccc333');
      });
    });

    /**
     * .what = `[case10] [t0]` at the wire — e18 reborn, and refused
     * .why = `vlad@ehmpathy.com` was never cut. the reachless `env=all` key IS held and IS
     *        reachable by the fallback's slug, so a slug-only fallback would find it and
     *        hand it back — a working credential for a reach the caller never authorized
     *
     * .note = this is the single most important claim in the file. every other case here
     *         proves a right answer arrives; this one proves a WRONG answer cannot
     */
    when('[t2] an uncut reach is asked for at a scoped env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'CROSS_ENV_KEY',
            '--env',
            'test',
            '--reach',
            'vlad@ehmpathy.com',
            '--value',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('it does not exit 0 — an uncut reach is never granted', () => {
        expect(result.status).not.toEqual(0);
      });

      // .note = the exit code alone would not settle it. a refusal that still leaked the
      //         secret to stdout would be a caller's `$(...)` capture away from the exact
      //         failure the refusal exists to prevent
      then('e18-reborn: the reachless env=all secret is NOT handed back', () => {
        expect(result.stdout).not.toContain('sk-all-env-reachless-ccc333');
        expect(result.stdout).not.toContain('sk-all-env-at-beav-ddd444');
      });

      then('the refusal names the reach that was asked for', () => {
        expect(result.stderr).toContain('vlad@ehmpathy.com');
      });

      // ⚠️ .what = BOTH streams, and the stdout half of this pair was argued AGAINST in an
      //    earlier draft of this comment. the argument was: this case's whole claim is that
      //    stdout must NEVER hold either secret, and a snapshot records what output IS — so
      //    a regression that leaked the secret would be absorbed by one `--updateSnapshot`
      //    and committed as the new expectation, the leak read as a mere render change.
      //
      // ⚠️ that argument is WRONG, and the flaw is worth the record: it assumed a snapshot
      //    would REPLACE the never-claim. it does not. the `not.toContain` pair sits in its
      //    OWN `then` twenty lines up, and no `--updateSnapshot` can touch an assertion. so
      //    the two instruments stack rather than compete:
      //      · `not.toContain` — the never-claim. cannot be updated away. catches a leak
      //      · the stdout snapshot — catches the SAME leak (empty → content) AND the case
      //        `not.toContain` is blind to: a stray line that is not either fixture secret
      //    a resnap can bless the second; it can never silence the first. defense in depth,
      //    not a traded guarantee
      // .note = the stderr half clamps the one claim no assertion can: that the refusal keeps
      //         the turtle-blocked tree SHAPE. `toContain` would still pass if the tree
      //         collapsed to a raw stack dump that happened to hold the exid
      then('the reply is snapped', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });
    });

    /**
     * .what = `[case10]`'s e1 claim at the wire — the reachless path is untouched
     * .why = every guard above is a new branch, and a new branch is exactly how a fallback
     *        that worked for years quietly stops working for the callers who never asked for
     *        the new axis at all. absent `--reach`, the env=all fallback must behave as it
     *        did before reach existed
     */
    when('[t3] the reachless key is asked for at a scoped env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'CROSS_ENV_KEY',
            '--env',
            'test',
            '--value',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('it exits 0 — e1: the env=all fallback still answers', () => {
        expect(result.status).toEqual(0);
      });

      then('the secret is the reachless reach', () => {
        expect(result.stdout).toContain('sk-all-env-reachless-ccc333');
        expect(result.stdout).not.toContain('sk-all-env-at-beav-ddd444');
      });
    });
  });
});
