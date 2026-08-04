import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

import { mkdtempSync, readdirSync, rmSync } from 'node:fs';

/**
 * .what = count the keyrack daemon sockets in a runtime dir
 * .why = the population `daemon prune --owner @all` is meant to reach, read from
 *        the filesystem rather than from the command's own report — so the report
 *        is checked against the world, not against itself
 */
const countDaemonSockets = (input: { runtimeDir: string }): number =>
  readdirSync(input.runtimeDir).filter(
    (file) => file.startsWith('keyrack.') && file.endsWith('.sock'),
  ).length;

describe('keyrack daemon prune', () => {
  /**
   * [uc1] `--owner @all` reaches daemons born under a HOME other than the pruner's
   *
   * this is fix 2 end to end, through the built binary: every daemon in the leak
   * census had a homeHash of its own, and `@all` used to pin the pruner's — so the
   * one lever built for the backlog structurally could not see it.
   */
  given('[case1] two daemons, each born under a HOME of its own', () => {
    jest.setTimeout(60000);

    // a runtime dir of this test's own
    // .why = `@all` reaps every keyrack daemon in $XDG_RUNTIME_DIR for this login
    // session. left unscoped, this case would kill the daemons a human on this
    // machine is actively using, mid-test-run — and its own count would depend on
    // whatever else happened to be alive. the scope is what makes it both safe
    // and deterministic
    const runtimeDir = mkdtempSync('/tmp/kdp-');

    const repoOne = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );
    const repoTwo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    /**
     * .what = unlock under a given HOME, and fail loudly if that unlock did not work
     * .why = each unlock runs under a HOME of its own, so each mints its own homeHash
     * and therefore its own daemon — exactly what a caller that sets a temp HOME does.
     * but the daemon is spawned only when a key is about to land (q8), so a failed
     * unlock spawns NO daemon, and this case then reports `no daemon active for any
     * owner` three assertions later.
     *
     * observed for real: a run where the unlocks did not take produced a snapshot diff
     * against `no daemon active`, which reads as a defect in `@all` discovery — the
     * exact opposite of the truth, since discovery had zero to discover. a setup whose
     * exit status goes unread turns its own failure into a false accusation against the
     * subject under test.
     */
    const unlockUnderHome = (input: {
      repoPath: string;
    }): ReturnType<typeof invokeRhachetCliBinary> => {
      const result = invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--env', 'test'],
        cwd: input.repoPath,
        env: { HOME: input.repoPath, XDG_RUNTIME_DIR: runtimeDir },
      });
      if (result.status !== 0)
        throw new Error(
          [
            `setup failed: keyrack unlock exited ${result.status} under HOME=${input.repoPath}.`,
            'this case needs two live daemons before it can speak to @all reach at all.',
            `stderr: ${result.stderr}`,
            `stdout: ${result.stdout}`,
          ].join('\n'),
        );
      return result;
    };

    useBeforeAll(async () => unlockUnderHome({ repoPath: repoOne.path }));
    useBeforeAll(async () => unlockUnderHome({ repoPath: repoTwo.path }));

    afterAll(() => {
      // reap whatever this case left behind, then drop its runtime dir
      // .why = when the clamp is red the prune reaps only one of the two, so the
      // other would outlive the run — this case must not leak the very daemons it
      // exists to prove reapable
      invokeRhachetCliBinary({
        args: ['keyrack', 'daemon', 'prune', '--owner', '@all'],
        cwd: repoOne.path,
        env: { HOME: repoOne.path, XDG_RUNTIME_DIR: runtimeDir },
        logOnError: false,
      });
      rmSync(runtimeDir, { recursive: true, force: true });
    });

    when('[t0] prune --owner @all runs under only one of those HOMEs', () => {
      // the precondition, asserted rather than assumed
      // .why = if both temp HOMEs hashed alike there would be one daemon, not two,
      // and the case would pass while it proved no such reach at all
      // .note = wrapped in an object, not a bare number. useBeforeAll hands back a
      // proxy that defers access, and a proxy cannot stand in for a primitive — a
      // bare count would compare as {} and the precondition would never be read
      const before = useBeforeAll(async () => ({
        sockets: countDaemonSockets({ runtimeDir }),
      }));

      // the human-readable form, deliberately — not `--json`
      // .why = this is the per-daemon print loop e14 flagged and q7 chose to leave
      // uncapped. that decision was taken on the argument that the wall of text is
      // transitional, and it left the path with no snapshot at all. this is that
      // snapshot. it is also the exact output the vision showcases as the deliverable
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'daemon', 'prune', '--owner', '@all'],
          cwd: repoOne.path,
          env: { HOME: repoOne.path, XDG_RUNTIME_DIR: runtimeDir },
        }),
      );

      const resultSecond = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'daemon', 'prune', '--owner', '@all'],
          cwd: repoOne.path,
          env: { HOME: repoOne.path, XDG_RUNTIME_DIR: runtimeDir },
        }),
      );

      then('two daemons were alive before the prune', () => {
        expect(before.sockets).toEqual(2);
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('it reaps both, not only the pruner’s own', () => {
        // the clamp: pin the homeHash segment back into the prefix and this is 1,
        // because the pruner runs under repoOne's HOME and repoTwo's daemon is
        // filed under a hash it never looks at
        const lines = result.stdout.match(/pruned daemon for owner=/g) ?? [];
        expect(lines.length).toEqual(2);
        expect(result.stdout).toContain('pruned 2 daemons');
      });

      then('the runtime dir holds no keyrack socket after', () => {
        expect(countDaemonSockets({ runtimeDir })).toEqual(0);
      });

      then('a second prune reports an empty reap, not a phantom kill', () => {
        // .why = the daemons unlink their own files on exit (e19). were those files
        // orphaned, this second run would enumerate them and report each as pruned
        expect(resultSecond.stdout).toContain('no daemon active for any owner');
        expect(resultSecond.stdout).not.toContain('pruned daemon for owner=');
      });

      then('stdout matches snapshot', () => {
        // pids vary per run, so fold them to a fixed token — the shape of the
        // report is what a human reads and what this pins
        expect(
          asSnapshotSafe(result.stdout).replace(
            /\(pid: \d+\)/g,
            '(pid: __PID__)',
          ),
        ).toMatchSnapshot();
      });

      then('the empty-reap report matches snapshot', () => {
        // .why = this is the output a human got from the UNFIXED command while 1561
        // daemons were alive on the machine. to pin it keeps that shape honest — it
        // must appear only when the reap is genuinely empty
        expect(asSnapshotSafe(resultSecond.stdout)).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc2] the surface a human meets when no daemon is theirs to reap
   *
   * .why = [case1] pins the two REAP reports. a caller meets three more variants before
   * they ever see one: the help text they read to learn `@all` exists at all, the
   * report for an owner that has no daemon, and the robot channel. each is a distinct
   * output shape of the same command, and each was uncovered.
   *
   * .note = these cases need NO live daemon, so they are hermetic and fast — their own
   * runtime dir stays empty for the whole block. that is deliberate: the reports below
   * are exactly what a caller sees against an empty world, and an empty world is the
   * cheapest way to pin them without a reap that could race [case1].
   */
  given('[case2] a runtime dir with no keyrack daemon in it', () => {
    const runtimeDir = mkdtempSync('/tmp/kdp-empty-');

    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    afterAll(() => {
      rmSync(runtimeDir, { recursive: true, force: true });
    });

    when('[t0] a human asks the command to explain itself', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'daemon', 'prune', '--help'],
          cwd: repo.path,
          env: { HOME: repo.path, XDG_RUNTIME_DIR: runtimeDir },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the help names the @all scope, so it is discoverable', () => {
        // the clamp that matters: `@all` is the whole lever this behavior built, and a
        // lever nobody can find is a lever nobody uses (rule.require.discoverability).
        // this asserts the affordance is advertised ON the control, not only in a doc
        expect(result.stdout).toContain('@all for all daemons');
      });

      then('help matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] prune runs for an owner that has no daemon', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'daemon', 'prune', '--owner', 'nosuchowner'],
          cwd: repo.path,
          env: { HOME: repo.path, XDG_RUNTIME_DIR: runtimeDir },
        }),
      );

      then('exits with status 0 — an empty reap is a fact, not a failure', () => {
        // .why = a caller runs `prune` ahead of a suite to start clean. were an empty
        // reap an error exit, every such caller would fail on the common case
        expect(result.status).toEqual(0);
      });

      then('the report names the scope it searched', () => {
        // the distinction this behavior exists to make honest: `owner=nosuchowner`
        // vs `any owner` tells a human WHICH population came back empty
        expect(result.stdout).toContain(
          'no daemon active for owner=nosuchowner',
        );
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] the robot channel is asked for the same empty reap', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'daemon', 'prune', '--owner', '@all', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path, XDG_RUNTIME_DIR: runtimeDir },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('it emits parseable json with an empty list', () => {
        expect(JSON.parse(result.stdout)).toEqual({ pruned: [] });
      });

      then('no tree glyph or emoji leaks into the robot channel', () => {
        // .why = the human report and the json share one code path up to the print.
        // a glyph on stdout would break every caller that pipes this into a parser
        expect(result.stdout).not.toContain('🔐');
        expect(result.stdout).not.toContain('└─');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc3] the ordinary invocation — a caller reaps their own one daemon
   *
   * .why = the command prints on THREE branches keyed on how many it reaped
   * (`invokeKeyrack.ts:1519-1542`): none, exactly one, or many. [case1] walks the
   * many; [case2] walks the none. the middle branch had no case at all — and it is
   * the one an ordinary caller meets, because a prune WITHOUT `--owner @all` targets
   * a single socket and so can only ever return 0 or 1 (`pruneKeyrackDaemon.ts:32-38`).
   * so the singular line is not one variant of the default-owner prune's output; it
   * is the whole of it, and the command's own description — "kill daemon process so
   * next command starts fresh" — describes exactly this journey.
   *
   * .note = the singular branch is a distinct SHAPE, not a shorter list: it prints a
   * terminal `└─` with no `pruned N daemons` summary, where the plural prints `├─`
   * per daemon and then the summary. the two are pinned apart below rather than only
   * counted, so a collapse of the branches goes red on the glyph
   */
  given('[case3] exactly one daemon, under the caller’s own HOME', () => {
    jest.setTimeout(60000);

    // a runtime dir of this case's own, for the same reason [case1] takes one
    const runtimeDir = mkdtempSync('/tmp/kdp-one-');

    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    useBeforeAll(async () => {
      const result = invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--env', 'test'],
        cwd: repo.path,
        env: { HOME: repo.path, XDG_RUNTIME_DIR: runtimeDir },
      });
      if (result.status !== 0)
        throw new Error(
          [
            `setup failed: keyrack unlock exited ${result.status} under HOME=${repo.path}.`,
            'this case needs exactly one live daemon before it can speak to the singular report.',
            `stderr: ${result.stderr}`,
            `stdout: ${result.stdout}`,
          ].join('\n'),
        );
      return result;
    });

    afterAll(() => {
      invokeRhachetCliBinary({
        args: ['keyrack', 'daemon', 'prune', '--owner', '@all'],
        cwd: repo.path,
        env: { HOME: repo.path, XDG_RUNTIME_DIR: runtimeDir },
        logOnError: false,
      });
      rmSync(runtimeDir, { recursive: true, force: true });
    });

    when('[t0] prune runs with no --owner, as a human would', () => {
      // the precondition, asserted rather than assumed
      // .why = were the unlock to spawn two (or none), this case would walk a
      // branch other than the one it claims to pin, and still pass
      const before = useBeforeAll(async () => ({
        sockets: countDaemonSockets({ runtimeDir }),
      }));

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'daemon', 'prune'],
          cwd: repo.path,
          env: { HOME: repo.path, XDG_RUNTIME_DIR: runtimeDir },
        }),
      );

      then('exactly one daemon was alive before the prune', () => {
        expect(before.sockets).toEqual(1);
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the report names the default owner and its pid', () => {
        expect(result.stdout).toMatch(
          /└─ pruned daemon for owner=default \(pid: \d+\)/,
        );
      });

      then('it reports one reap as a lone line, not as a list of one', () => {
        // the discrimination this case exists for: the singular branch is a
        // terminal `└─` with NO summary line. were it folded into the plural
        // branch, a human would read `├─ pruned daemon …` followed by the
        // ungrammatical `└─ pruned 1 daemons` — a different shape, and one no
        // count-only assertion would catch
        expect(result.stdout).not.toContain('├─');
        expect(result.stdout).not.toContain('pruned 1 daemons');
      });

      then('the runtime dir holds no keyrack socket after', () => {
        // e19 again: the daemon unlinks its own files, so a real reap empties
        // the dir rather than orphaning one for the next `@all` to phantom-kill
        expect(countDaemonSockets({ runtimeDir })).toEqual(0);
      });

      then('stdout matches snapshot', () => {
        expect(
          asSnapshotSafe(result.stdout).replace(
            /\(pid: \d+\)/g,
            '(pid: __PID__)',
          ),
        ).toMatchSnapshot();
      });
    });

    when('[t1] the robot channel reports a reap that is NOT empty', () => {
      // .why = [case2][t2] pins `--json` against an empty world, and an empty list
      // structurally cannot expose a wrong field name, a leaked glyph, or a pid
      // rendered as a string — the three ways this channel could break a parser.
      // only the POPULATED shape carries those, and it is the shape an automation
      // that reaps and then reports actually reads
      const result = useBeforeAll(async () => {
        // [t0] reaped the daemon, so mint another to have one to report on
        const setup = invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path, XDG_RUNTIME_DIR: runtimeDir },
        });
        if (setup.status !== 0)
          throw new Error(
            [
              `setup failed: keyrack unlock exited ${setup.status} under HOME=${repo.path}.`,
              'this case needs a live daemon before the json reap can be non-empty.',
              `stderr: ${setup.stderr}`,
              `stdout: ${setup.stdout}`,
            ].join('\n'),
          );
        return invokeRhachetCliBinary({
          args: ['keyrack', 'daemon', 'prune', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path, XDG_RUNTIME_DIR: runtimeDir },
        });
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the reaped daemon is described with a numeric pid', () => {
        // .why = a pid emitted as a string would still snapshot cleanly and still
        // parse, then break the first caller that compares or signals with it
        const parsed = JSON.parse(result.stdout) as {
          pruned: Array<{ owner: string | null; pid: number }>;
        };
        expect(parsed.pruned.length).toEqual(1);
        expect(parsed.pruned[0]?.owner).toEqual(null);
        expect(typeof parsed.pruned[0]?.pid).toEqual('number');
      });

      then('no tree glyph or emoji leaks into the robot channel', () => {
        expect(result.stdout).not.toContain('🔐');
        expect(result.stdout).not.toContain('└─');
      });

      then('stdout matches snapshot', () => {
        expect(
          asSnapshotSafe(result.stdout).replace(/"pid": \d+/g, '"pid": 0'),
        ).toMatchSnapshot();
      });
    });
  });
});
