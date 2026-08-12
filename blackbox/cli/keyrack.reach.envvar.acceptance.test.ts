import { given, then, useBeforeAll, when } from 'test-fns';

import { envIsolated } from '@/blackbox/.test/infra/envIsolated';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = e20 / q9 at the contract grain — a DIRECT reach-ask against the `os.envvar` vault
 *         refuses, and the ambient reachless variable is never handed back
 * .why = an env var namespace is flat by nature: `asKeyrackKeyName` drops the org, the env,
 *        AND the reach, so `API_KEY` is the only name this vault can look under. were a
 *        reach-ask to read it, a caller who named one reach would receive the value of
 *        another — e18's wrong-reach failure, on the one path that runs unattended in ci
 *
 * .note = ⚠️ this was proven ONLY at unit grain (`vaultAdapterOsEnvvar.test.ts [case7]`),
 *         which calls the adapter directly. that unit cannot see the reach dropped anywhere
 *         on the way in — the cli parse, the host-manifest address lookup, the vault dispatch
 *         — every one of which would leave the unit green while the built binary read the
 *         ambient variable. a contract owes an acceptance test
 *         (`rule.require.test-coverage-by-grain`), and this is the last of the three "closed"
 *         substitution hazards that had none
 * .note = the DIRECT ask is the path under test, NOT the probe. `blackbox/sdk/keyrack.reach
 *         [case3]` covers the probe, where the same vault is one of several sources tried and
 *         its refusal is read as "this source cannot answer" rather than propagated. the two
 *         behaviors are different and each owes its own clamp; this is the one that throws
 * .note = the host manifest names `vault: os.envvar` for BOTH the reachless key and its
 *         reach, so the unlock reaches this vault by declaration rather than by fallback.
 *         that is what makes it a direct ask
 * .note = fully hermetic — an env var is the whole vault, so no daemon, no disk store, no
 *         credential, and no network are in play
 */
describe('keyrack reach on the os.envvar vault', () => {
  // kill any stale daemon so no cached grant can answer ahead of the vault
  beforeAll(() => killKeyrackDaemonForTests());

  given('[case1] an os.envvar key whose ambient variable is set', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-reach-envvar' }),
    );

    /**
     * the AMBIENT reachless value — what a wrong-reach answer would hand back. it is
     * deliberately a recognizable literal so the assertions below can prove its ABSENCE
     * from the refusal, not merely that some error occurred
     */
    const AMBIENT = 'ambient_reachless_secret_value';

    when('[t0] unlock names a reach', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'test',
            '--key',
            'API_KEY',
            '--reach',
            'beav@ehmpathy.com',
          ],
          cwd: repo.path,
          env: { ...envIsolated(repo.path), API_KEY: AMBIENT },
          logOnError: false,
        }),
      );

      then('it exits 2 — caller-fixable, not a defect', () => {
        expect(result.status).toEqual(2);
      });

      // .note = this one does NOT bite on its own, and the dogfood proved it: `unlock` renders
      //         a tree, never a secret, so it stays green even when the guard is torn out and
      //         the reachless variable really does answer the ask. it is kept because a
      //         refusal that leaked the value would be worse than no refusal at all — but the
      //         claim it looks like it makes is made at [t1], where a value is actually read
      then('the refusal itself leaks no secret', () => {
        expect(result.stdout).not.toContain(AMBIENT);
        expect(result.stderr).not.toContain(AMBIENT);
      });

      then('the refusal names the vault that cannot address a reach', () => {
        expect(result.stdout + result.stderr).toContain('os.envvar');
      });

      then('the refusal renders as the blocked tree, never a raw class dump', () => {
        const output = result.stdout + result.stderr;
        // keyrack roots on its own lock, never the generic `🐚` nor a role mascot
        // (`rule.require.keyrack-emoji-palette`)
        expect(output).toContain('🔐 keyrack unlock');
        expect(output).toContain('✋ blocked:');
        expect(output).not.toContain('bummer dude');
        expect(output).not.toContain('🐢');
        expect(output).not.toContain('ConstraintError');
      });

      // ⚠️ THE clamp for WHERE the refusal lands, and it bit for real. the unlock batch wraps
      //    each key in a per-key fault isolation that catches a `ConstraintError` and renders
      //    it as an `errored 💥` row on STDOUT — which swallowed this refusal whole when the
      //    branch was rebased onto that isolation. two things were wrong with the result and
      //    the snapshot pair alone reported them as one anonymous diff:
      //      1. `💥` is the MalfunctionError glyph, so a caller-fixable refusal read "we broke"
      //      2. a refusal is not a result, so it belongs on stderr — never the quiet stream
      //    the fix hoists the vault-posture assert ABOVE the isolation, where a static refusal
      //    belongs; this assertion names the invariant so a future re-sink goes red on WHY
      then('the refusal is on stderr, and stdout stays a result-only stream', () => {
        expect(result.stderr).toContain('✋ blocked:');
        expect(result.stdout.trim()).toEqual('');
        // the malfunction glyph must never mark a caller-fixable refusal
        expect(result.stdout + result.stderr).not.toContain('💥');
      });

      // .note = BOTH streams, and the pair is the point. a refusal is not a result, so the
      //         tree renders on stderr and stdout is empty — an earlier draft snapped stdout
      //         ALONE and captured a blank string, a snapshot that would have held green
      //         through any change to the refusal at all. the fix is not to pick the loud
      //         stream, it is to snap both: stderr proves the refusal's exact render, and
      //         stdout proves the quiet stream STAYED quiet
      // ⚠️ .why the empty one earns its place = this command's stdout is eval'd by a shell
      //         on the `source` path. a stray line there — a deprecation notice, a debug
      //         print, a leaked partial export — is a live hazard that the stderr snapshot
      //         cannot see, because it is not on stderr
      then('the reply is snapped', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });
    });

    /**
     * .what = e18 itself, at the VALUE grain — a keyed reach-ask, with a wrong-reach
     *         value sat in the ambient variable, ready to be handed back
     * .why = `[t0]` clamps the refusal's SHAPE (exit code, tree, snapshot). none of those
     *        touch a secret, so none of them can tell "refused" from "answered with the
     *        wrong reach's value" — only a read of the value can. this is that read
     *
     * .note = ⚠️ this drives the PROBE path, not the direct ask. `get` tries several sources
     *         and reads this vault's refusal as "this source cannot answer", so the ask comes
     *         back ABSENT rather than as a throw. `blackbox/sdk/keyrack.reach [case3]` also
     *         covers the probe, but in a repo with NO vault at all — so absence there proves
     *         only that no source existed. here a live wrong-reach value is present and
     *         reachable under the flat name, and absence proves it was refused
     */
    when('[t1] a keyed reach-ask asks for the value', () => {
      const asked = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'API_KEY',
            '--reach',
            'beav@ehmpathy.com',
          ],
          cwd: repo.path,
          env: { ...envIsolated(repo.path), API_KEY: AMBIENT },
          logOnError: false,
        }),
      );

      const askedForValue = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'API_KEY',
            '--reach',
            'beav@ehmpathy.com',
            '--value',
          ],
          cwd: repo.path,
          env: { ...envIsolated(repo.path), API_KEY: AMBIENT },
          logOnError: false,
        }),
      );

      // THE clamp — the one assertion in this file that can tell a refusal from a
      // wrong-reach answer, because it is the only one that reads a raw secret.
      // `--value` is load-bearing here: the tree render below prints a STATUS, never a
      // secret, so it stays green even when the wrong reach's value is what answered
      then('the ambient reachless value is never handed back', () => {
        expect(askedForValue.stdout).not.toContain(AMBIENT);
        expect(askedForValue.stderr).not.toContain(AMBIENT);
      });

      // the status axis of the same claim: a reach no key was cut for reads ABSENT,
      // not `granted`. this is what flips when the vault's refusal is torn out
      then('the reach reads as absent, never granted', () => {
        expect(asked.stdout).toContain('absent');
        expect(asked.stdout).not.toContain('granted');
      });

      then('the reply is snapped', () => {
        expect(asSnapshotSafe(asked.stdout)).toMatchSnapshot('stdout');
        expect(asSnapshotSafe(asked.stderr)).toMatchSnapshot('stderr');
      });
    });

    /**
     * e1 — the reachless half. absent `--reach` this vault behaves exactly as it always has:
     * it reads the flat variable and hands the value over. without this, every claim above
     * would also hold for a vault that had simply stopped to work at all
     */
    when('[t2] the same unlock omits the reach', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'API_KEY'],
          cwd: repo.path,
          env: { ...envIsolated(repo.path), API_KEY: AMBIENT },
          logOnError: false,
        }),
      );

      then('it exits 0 — the reachless path is untouched', () => {
        expect(result.status).toEqual(0);
      });

      then('the key is reported unlocked', () => {
        expect(result.stdout).toContain('testorg.test.API_KEY');
      });

      then('the reply is snapped', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });
  });
});
