import { given, then, useBeforeAll, when } from 'test-fns';

import { envIsolated } from '@/blackbox/.test/infra/envIsolated';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = acceptance tests for `keyrack relock`
 * .why = relock's --env help text now advertises camp; prove the advertised env works,
 *        and pin a --help snapshot (relock had none) so future drift is caught in diffs
 */
describe('keyrack relock cli', () => {
  // kill any stale daemon to keep the relock result deterministic
  beforeAll(() => killKeyrackDaemonForTests());

  given('[case1] any repo', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] rhx keyrack relock --help', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'relock', '--help'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows relock command description', () => {
        expect(result.stdout).toContain('relock');
      });

      then('help lists camp among the --env options', () => {
        expect(result.stdout).toContain('camp');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [case2] relock --env camp — the wish's new env
   * proves the camp env, now advertised in relock's help, is accepted by relock
   * (exit 0, no rejection) rather than rejected (positive journey)
   */
  given('[case2] repo with keyrack manifest, relock camp', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] rhx keyrack relock --env camp (no camp keys in daemon)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'relock', '--env', 'camp'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0 (camp is accepted, not rejected)', () => {
        expect(result.status).toEqual(0);
      });

      then('output does not reject camp as an invalid env', () => {
        expect(result.stderr).not.toContain('invalid --env');
      });

      then('shows no keys to prune message', () => {
        expect(result.stdout.toLowerCase()).toContain('no keys to prune');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [case3] q1/e12 at the CLI — relock sweeps EVERY reach of a slug, and says so once
   *
   * .what = one slug held at two reaches, then relocked by name. every key must be
   *         purged, and the report must name the slug exactly ONCE
   * .why = q1 settled that `relock --key` takes all reaches: a human who says "lock this
   *        key" means the key, not one of its reaches, and a token that survived an
   *        explicit relock would be `rule.forbid.surprises` with security weight. that
   *        sweep was proven only against a fake in-memory store — never through the real
   *        cli → unix-socket → daemon path a human runs
   *
   * .note = the DEDUPE is the part with teeth. relock reports per KEY, and reach sits
   *         below the key, so N reaches of one slug owe one `pruned 🔒` line. absent
   *         the dedupe the same slug prints N times, which reads as N keys taken and
   *         silently contradicts the "one key, many reaches" model the whole feature
   *         rests on
   * .note = ⚠️ it relocks by `--env`, deliberately, NOT by `--key`. i first wrote `--key`
   *         and it clamped less than it read like it did: that path calls `del` once per
   *         NAMED slug, so it can never print a duplicate whatever the store holds. the
   *         dedupe lives on the two SWEEP paths, which walk `entries()` — and `entries()`
   *         yields one row per (slug, reach). `--env` is the sweep a human actually runs,
   *         so it is the path the clamp belongs on
   * .note = it reuses the `with-keyrack-reach-source` fixture, whose `os.direct` store is
   *         plaintext on disk — so two reaches are held with no vault, no network, and
   *         no credential. fully hermetic, exactly as its `source` twin is
   */
  given('[case3] one slug held at two reaches, then relocked', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-reach-source' }),
    );

    when('[t0] both reaches are unlocked, then the key is relocked', () => {
      const unlockReachless = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
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
            'test',
            '--key',
            'API_KEY',
            '--reach',
            'beav@ehmpathy.com',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      // .note = load-bearing precondition. if either unlock failed, every claim below
      //         would be about a rack that holds one key or none, and the case would pass
      //         while it proved no such claim at all
      then('both reaches really are held before the relock', () => {
        expect(unlockReachless.status).toEqual(0);
        expect(unlockReached.status).toEqual(0);
        expect(unlockReached.stdout).toContain('beav@ehmpathy.com');
      });

      const relock = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock', '--env', 'test'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      // THE clamp. one key named, one line reported — however many reaches fell
      then('the slug is reported exactly ONCE, not once per reach', () => {
        const pruned = relock.stdout
          .split('\n')
          .filter((line) => line.includes('pruned 🔒'));
        expect(pruned).toHaveLength(1);
        expect(pruned[0]).toContain('testorg.test.API_KEY');
      });

      then('it exits 0', () => {
        expect(relock.status).toEqual(0);
      });

      // .note = the dedupe alone would also hold if relock had purged only ONE reach.
      //         this is what separates "reported once" from "took them all" — the rack
      //         must be empty of that slug afterward, at every reach
      then('every reach is gone from the rack, not merely one', () => {
        expect(relock.stdout).not.toContain('beav@ehmpathy.com');
      });

      // .note = the assertions above clamp the COUNT and the CONTENT; this clamps the
      //         SHAPE. a change to the pruned line's format, its prefix, or the order of
      //         the tree around it would pass every `toContain` above and still alter what
      //         a human reads — only a snapshot surfaces that in a pr diff
      //         (`rule.require.contract-snapshot-exhaustiveness`)
      then('the relock tree renders as snapped', () => {
        expect(asSnapshotSafe(relock.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] the rack is read back after the relock', () => {
      const status = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'status'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      // the real proof the sweep was total: neither key answers a read any more
      then('neither the reachless nor the reached key survives', () => {
        expect(status.stdout).not.toContain('testorg.test.API_KEY');
        expect(status.stdout).not.toContain('reach: beav@ehmpathy.com');
      });

      then('the emptied rack renders as snapped', () => {
        expect(asSnapshotSafe(status.stdout)).toMatchSnapshot();
      });
    });
  });

  /**
   * .what = the BARE sweep — `relock` with neither `--key` nor `--env` — against one slug
   *         held at two reaches
   * .why = there are TWO sweep paths in `handleRelockCommand`, not one, and they are
   *        separate code: the `--env` filter at `:35-42` and the no-args clear at `:45-51`.
   *        each walks `entries()` and pushes `key.slug` per ENTRY, so each carries the same
   *        duplicate-`pruned 🔒` hazard — and `[case3]` drives only the first
   *
   * .note = the two paths share a shape, not an implementation. a dedupe applied to one and
   *         forgotten on the other would leave `[case3]` green while the bare sweep — the
   *         one a human runs to clear everything — printed the same slug twice
   * .note = the bare sweep also CLEARS the store, where `--env` filters it. so this case
   *         additionally clamps that the clear is total across reaches: an empty rack
   *         afterward, not merely one reach taken
   */
  given('[case4] the bare sweep, against a slug held at two reaches', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-reach-source' }),
    );

    when('[t0] both reaches are unlocked, then relock takes no args', () => {
      const unlockReachless = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
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
            'test',
            '--key',
            'API_KEY',
            '--reach',
            'beav@ehmpathy.com',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      // load-bearing precondition — absent this, an empty rack afterward proves no claim
      // at all, because an empty rack is also what a pair of failed unlocks leaves behind
      then('both reaches really are held before the relock', () => {
        expect(unlockReachless.status).toEqual(0);
        expect(unlockReached.status).toEqual(0);
        expect(unlockReached.stdout).toContain('beav@ehmpathy.com');
      });

      const relock = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      // THE clamp — the same claim `[case3]` makes, on the OTHER sweep path
      then('the slug is reported exactly ONCE, not once per reach', () => {
        const pruned = relock.stdout
          .split('\n')
          .filter((line) => line.includes('pruned 🔒'));
        expect(pruned).toHaveLength(1);
        expect(pruned[0]).toContain('testorg.test.API_KEY');
      });

      then('it exits 0', () => {
        expect(relock.status).toEqual(0);
      });
    });

    when('[t1] the rack is read back after the bare sweep', () => {
      const status = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'status'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      // dedupe alone would also hold if the clear had taken only ONE reach. this is
      // what separates "reported once" from "took them all"
      then('no reach of the slug survives the clear', () => {
        expect(status.stdout).not.toContain('testorg.test.API_KEY');
        expect(status.stdout).not.toContain('reach: beav@ehmpathy.com');
      });
    });
  });

  /**
   * .what = `relock` refuses a `--reach` outright, on every arg shape
   * .why = `unlock` REQUIRES `--key` beside a `--reach` (q2), and a reviewer read the absence
   *        of a matched `ConstraintError` on `relock` as an unguarded asymmetry — a future
   *        caller who handed `--reach` to a sweep would be silently mis-served
   *
   * .the answer is stronger than the guard that was asked for = `relock` declares no
   *         `--reach` option at all, and `invokeKeyrack` does not `allowUnknownOption`. so the
   *         combination is UNREPRESENTABLE rather than merely rejected — rung 1 of
   *         `rule.prefer.prevent-over-correct` ("make it impossible") rather than rung 3
   *         ("catch it early"). there is no runtime guard because there is no state to guard
   *
   * .note = this is deliberate, not an oversight: to grant is narrow, to revoke is wide (q1).
   *         a relock purges every reach of the slug, so a reach FILTER would be a NEW
   *         capability, never an absent safety check
   * .note = both arg shapes are driven because they are separate code paths in commander's
   *         parse — a `--reach` accepted beside `--env` but rejected bare (or the reverse)
   *         would leave one door open, and one case could not see it
   */
  given('[case5] a --reach handed to relock, which has no such axis', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-reach-source' }),
    );

    when('[t0] relock --reach beside an --env sweep', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'relock',
            '--env',
            'test',
            '--reach',
            'beav@ehmpathy.com',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      // ⚠️ THE clamp — a nonzero exit is what makes the combination unreachable. were
      //    `--reach` ever added to relock without a decision about q1's wide sweep, this goes
      //    green and the asymmetry the reviewer feared becomes real
      then('it refuses rather than silently ignores the flag', () => {
        expect(result.status).not.toEqual(0);
      });

      then('the refusal names the flag it does not know', () => {
        expect(`${result.stdout}${result.stderr}`).toContain('--reach');
      });
    });

    when('[t1] relock --reach with no other args (the bare sweep)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock', '--reach', 'beav@ehmpathy.com'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('it refuses here too — no arg shape admits a reach', () => {
        expect(result.status).not.toEqual(0);
      });
    });
  });
});
