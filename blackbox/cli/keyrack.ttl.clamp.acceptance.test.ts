import { given, then, useBeforeAll, when } from 'test-fns';

import { envIsolated } from '@/blackbox/.test/infra/envIsolated';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = e17's ttl clamp, driven through the real cli → daemon → `status` wire
 * .why = a ttl is a promise about a secret, and the two directions are NOT symmetric. too
 *        short costs a re-unlock; too long hands back a credential that READS alive and is
 *        dead, which sends a human to debug the wrong subsystem entirely. so the stored expiry
 *        is `min(requested, maxDuration, grant.expiresAt)` — the shortest applicable bound
 *
 * .why at this grain = `computeExpiresAt` is well unit-tested, yet a unit cannot see the bound
 *        dropped anywhere between the flag and the render: the cli parse, `unlockKeyrackKeys`'
 *        choice of which bounds to pass, the socket serialization, the daemon's stored row, or
 *        `status`' own arithmetic. every one of those would leave the unit green while the rack
 *        advertised a lifetime github (or a per-key cap) will not honor. peer review named this
 *        as the one bound with no acceptance-grain proof, beside two adjacent hazards that got
 *        one — an inconsistency rather than a deliberate exemption
 *
 * .note = the `maxDuration` bound is the one that is HERMETIC. the third bound — the mech's own
 *         `grant.expiresAt`, e.g. github's 55m installation token — needs a live mint, so it
 *         cannot be proven here without a credential and a network. that half stays unit-proven
 *         at `computeExpiresAt`, and this file states the gap plainly rather than imply the
 *         whole of e17 is clamped at the wire
 * .note = fully hermetic: `os.direct` is a plaintext store on disk, so no vault, no network,
 *         and no credential is touched
 */
describe('keyrack ttl clamp (e17)', () => {
  // kill any stale daemon so the grants below are the only ones in play
  beforeAll(() => killKeyrackDaemonForTests());

  /**
   * .what = a key whose per-key cap is SHORTER than the duration the caller asks for
   * .why = this is the only arrangement where the clamp is observable. ask for less than the
   *        cap and the cap is inert, so a build that ignored `maxDuration` entirely would pass
   */
  given('[case1] a key capped at 5m, unlocked with a 60m ask', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    const setResult = useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'CAPPED_KEY',
          '--env',
          'test',
          '--mech',
          'PERMANENT_VIA_REPLICA',
          '--vault',
          'os.direct',
          '--max-duration',
          '5m',
        ],
        cwd: repo.path,
        env: envIsolated(repo.path),
        stdin: 'sk-capped-key-value\n',
        logOnError: false,
      }),
    );

    when('[t0] the key is set with a 5m cap', () => {
      then('the set succeeds', () => {
        expect(setResult.status).toEqual(0);
      });
    });

    when('[t1] it is unlocked for 60m — twelve times its cap', () => {
      const unlockResult = useBeforeAll(async () => {
        expect(setResult.status).toEqual(0); // order the set before the unlock
        return invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'test',
            '--key',
            'CAPPED_KEY',
            '--duration',
            '60m',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        });
      });

      then('the unlock succeeds — a cap shortens, it never refuses', () => {
        expect(unlockResult.status).toEqual(0);
      });

      // ⚠️ THE clamp, at the render a human actually reads. `60` must be absent in every
      //    form the tree could print it, because a bound dropped anywhere on the wire shows
      //    up here and nowhere else
      then('the rack advertises the CAP, never the ask', () => {
        expect(unlockResult.stdout).toContain('5m');
        expect(unlockResult.stdout).not.toContain('60m');
      });

      // .why the warn matters on its own = the cap is a policy the human did not ask for, so a
      //      silent application makes a shorter-than-requested ttl read as a defect rather than
      //      as the rule it is
      then('it announces that the cap shortened the ask', () => {
        expect(unlockResult.stderr).toContain('CAPPED_KEY');
        expect(unlockResult.stderr).toContain('5m');
      });

      // .note = the stdout half carries a claim of its own here: the cap is a NOTICE, never a
      //         refusal, so the unlock still succeeds and still renders its normal tree on
      //         stdout. a snapshot of both proves the notice landed on the error stream while
      //         the success render STAYED on the output stream — which one stream alone
      //         cannot show
      then('the reply is snapped', () => {
        expect(asSnapshotSafe(unlockResult.stderr)).toMatchSnapshot('stderr');
        expect(asSnapshotSafe(unlockResult.stdout)).toMatchSnapshot('stdout');
      });
    });

    /**
     * .what = the same clamp, read back from the DAEMON rather than from the unlock's own
     *         stdout
     * .why = the unlock render could be right while the value handed to the daemon was the
     *        unclamped one — they are computed once and travel separately. `status` is the only
     *        surface that proves what was actually STORED, which is what every later `get`
     *        will read
     */
    when('[t2] the rack is read back after the unlock', () => {
      const statusResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'status'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('status exits 0', () => {
        expect(statusResult.status).toEqual(0);
      });

      then('the STORED expiry honors the cap, not the 60m ask', () => {
        expect(statusResult.stdout).toContain('CAPPED_KEY');
        expect(statusResult.stdout).not.toContain('60m');
      });
    });
  });

  /**
   * .what = e1 — a key with NO cap is untouched by the clamp
   * .why = the clamp adds a branch to the hot path of every unlock that exists today. a
   *        `min()` fed a wrong default would silently shorten every uncapped key in the repo,
   *        and no capped-key test could see it
   */
  given('[case2] an UNcapped key, unlocked with the same 60m ask', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    const setResult = useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'UNCAPPED_KEY',
          '--env',
          'test',
          '--mech',
          'PERMANENT_VIA_REPLICA',
          '--vault',
          'os.direct',
        ],
        cwd: repo.path,
        env: envIsolated(repo.path),
        stdin: 'sk-uncapped-key-value\n',
        logOnError: false,
      }),
    );

    when('[t0] it is unlocked for 60m', () => {
      const unlockResult = useBeforeAll(async () => {
        expect(setResult.status).toEqual(0);
        return invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'test',
            '--key',
            'UNCAPPED_KEY',
            '--duration',
            '60m',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        });
      });

      then('the unlock succeeds', () => {
        expect(unlockResult.status).toEqual(0);
      });

      then('the full 60m is honored — the clamp bites only where a bound exists', () => {
        expect(unlockResult.stdout).toContain('60m');
      });

      // .note = the absent warn is the claim, not a side effect. a cap notice on an uncapped
      //         key would be a caution readers learn to skip, and it would take the real ones
      //         down with it
      then('no cap notice fires', () => {
        expect(unlockResult.stderr).not.toContain('maxDuration');
      });
    });
  });
});
