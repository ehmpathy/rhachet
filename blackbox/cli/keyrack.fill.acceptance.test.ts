import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asPtySnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = path to the rhachet binary
 * .why = needed for pseudo-TTY invocation via the pty-with-answers wrapper
 */
const RHACHET_BIN = resolve(__dirname, '../../bin/run');

/**
 * .what = path to the PTY answer-feeder helper
 * .why = watches stdout for prompt patterns and sends answers on detection (not timing)
 */
const PTY_WITH_ANSWERS = resolve(__dirname, '../.test/assets/pty-with-answers.js');

describe('keyrack fill cli', () => {
  /**
   * test case: rhx keyrack fill --help
   * verifies help output describes the command correctly
   */
  given('[case1] any repo', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] rhx keyrack fill --help', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill', '--help'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows fill command description', () => {
        expect(result.stdout).toContain('fill');
      });

      then('shows --env option', () => {
        expect(result.stdout).toContain('--env');
      });

      then('shows --owner option', () => {
        expect(result.stdout).toContain('--owner');
      });

      then('shows --prikey option', () => {
        expect(result.stdout).toContain('--prikey');
      });

      then('shows --key option', () => {
        expect(result.stdout).toContain('--key');
      });

      then('shows --refresh option', () => {
        expect(result.stdout).toContain('--refresh');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * test case: error when --env not provided
   * verifies required option validation
   */
  given('[case2] repo with keyrack manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] rhx keyrack fill without --env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('shows error about absent --env', () => {
        // commander shows "required option" errors
        expect(result.stderr.toLowerCase()).toContain('env');
      });
    });
  });

  /**
   * test case: error when no keyrack.yml in repo
   * verifies manifest validation
   */
  given('[case3] repo without keyrack manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] rhx keyrack fill --env test', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('shows error about no keyrack.yml', () => {
        expect(result.stderr.toLowerCase()).toContain('keyrack');
      });
    });
  });

  /**
   * test case: no keys match env
   * verifies graceful behavior when no keys for specified env
   */
  given('[case4] repo with keyrack manifest (test keys only)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] rhx keyrack fill --env prod (no prod keys exist)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill', '--env', 'prod'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0 (empty is not an error)', () => {
        expect(result.status).toEqual(0);
      });

      then('shows no keys found message', () => {
        expect(result.stdout.toLowerCase()).toContain('no keys');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * test case: specific key not found
   * verifies error when --key specifies non-existent key
   */
  given('[case5] repo with keyrack manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] rhx keyrack fill --env test --key NONEXISTENT', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill', '--env', 'test', '--key', 'NONEXISTENT'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('shows error about key not found', () => {
        expect(result.stderr.toLowerCase()).toContain('not found');
      });
    });
  });

  /**
   * test case: fill skips keys satisfied by env=all
   * verifies that when a key is declared in env.test but exists as env=all,
   * fill recognizes the env=all key satisfies the requirement and skips
   */
  given('[case6] repo with env.test key already set as env=all', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-env-all-fallback' }),
    );

    when('[t0] rhx keyrack fill --env test', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows skip message for FILL_TEST_KEY with env=all slug', () => {
        expect(result.stdout).toContain('found vaulted under');
        expect(result.stdout).toContain('testorg.all.FILL_TEST_KEY');
      });

      then('shows skip message for ANOTHER_TEST_KEY with env=all slug', () => {
        expect(result.stdout).toContain('testorg.all.ANOTHER_TEST_KEY');
      });

      then('shows keyrack fill complete message', () => {
        expect(result.stdout).toContain('keyrack fill complete');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * test case: fill prompts for mechanism selection via PTY
   * verifies that fill shows "which mechanism?" prompt when vault supports multiple mechs
   * .note = this is the key acceptance test for the mech inference fix
   */
  given('[case7] fill prompts for mechanism selection (pseudo-TTY)', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      // keyrack init (creates encrypted manifest + ssh key discovery)
      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      // write repo manifest with key in env.test
      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - API_KEY\n',
        'utf-8',
      );

      return r;
    });

    when('[t0] keyrack fill --env test via pseudo-TTY (prompts for mech)', () => {
      const result = useBeforeAll(async () => {
        // invoke via pseudo-TTY so interactive prompts work
        // prompt pattern: "choice" for mech selection, "enter secret for" for secret input
        // answers: 1 (PERMANENT_VIA_REPLICA), then the secret value
        // .note = withStdoutPrefix handles indentation; prompts have no hardcoded indent
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack fill --env test`,
            'choice: |enter secret for',
            '1', // select PERMANENT_VIA_REPLICA
            'test-fill-secret-value',
          ],
          {
            encoding: 'utf-8',
            cwd: repo.path,
            env: { ...process.env, HOME: repo.path },
            timeout: 60000,
          },
        );
        return r;
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains mechanism selection prompt', () => {
        const out = result.stdout;
        // should show "which mechanism?" and available mechs
        expect(out).toContain('which mechanism');
        expect(out).toMatch(/PERMANENT_VIA_REPLICA|EPHEMERAL_VIA_GITHUB_APP/i);
      });

      then('output shows key was set', () => {
        const out = result.stdout;
        expect(out).toContain('API_KEY');
      });

      then('stdout matches snapshot', () => {
        // the shared helper, not an inline strip. it now carries the daemon-spawn-notice
        // scrub too, so the flake that scrub exists to kill is dead for EVERY pty case
        // rather than the one that happened to hand-roll it
        // .note = the helper uses `[ \t]+$`, not `\s+$`. `\s` matches `\n`, so the inline
        //         copy's version collapsed runs of blank lines, which erased the separators
        //         a command deliberately emits between its sections
        expect(asPtySnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  /**
   * [case8] fill --env camp — the wish's new env
   * proves the camp env, now advertised in fill's help text, is accepted by
   * fill (exit 0, empty is not an error) rather than rejected (positive journey)
   */
  given('[case8] repo with keyrack manifest (test keys only), fill camp', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] rhx keyrack fill --env camp (no camp keys exist)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill', '--env', 'camp'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0 (camp is accepted; empty is not an error)', () => {
        expect(result.status).toEqual(0);
      });

      then('output does not reject camp as an invalid env', () => {
        expect(result.stderr).not.toContain('invalid --env');
      });

      then('shows no keys found message', () => {
        expect(result.stdout.toLowerCase()).toContain('no keys');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [case9] a repo manifest that DECLARES reaches, driven through the real cli
   *
   * .what = runs `rhx keyrack fill` against a manifest whose key declares two reaches,
   *         and snaps the tree a human actually reads
   * .why = `fill` is the command that walks a human to the FLOOR of reaches the repo
   *        declares (q8/q10). its render is a user-faced contract, so it is owed a snapshot
   *        at the acceptance grain — the integration `[case9]` proves the domain logic
   *        against a mocked emit, which is a different claim than "the binary prints this"
   *
   * .note = the interactive prompt is why this case took three attempts to land. a plain
   *         `spawnSync` halts on key 1's secret ask and never reaches the key that carries
   *         the reaches. the cure was already in this file: `[case7]`'s pty answer-feeder.
   *         4 targets => 4 mech choices + 4 secrets, fed in prompt order
   * .note = 4, not 3 — `getAllKeyrackFillTargets` emits the reachless target
   *         **unconditionally**, then one beside it per declared reach. so MULTI_REACH_KEY
   *         takes three (reachless + beav + vlad) and PLAIN_KEY takes one
   */
  given('[case9] a manifest that declares reaches, via the cli', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      // `keyrack init` is the seed that creates the encrypted host manifest.
      // .note = an earlier attempt seeded with `keyrack set` and failed with
      //         "host manifest not found" — whose error text named `keyrack init` as the
      //         fix. the error was right; it simply went unread
      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      // a `reaches:` line is hand-authored by a human; no keyrack command writes it (q8)
      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        `org: testorg

env.test:
  - PLAIN_KEY
  - MULTI_REACH_KEY:
      reaches:
        - beav@ehmpathy.com
        - vlad@ehmpathy.com
`,
        'utf-8',
      );

      return r;
    });

    when('[t0] keyrack fill --env test via pseudo-TTY', () => {
      const result = useBeforeAll(async () =>
        spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack fill --env test`,
            'choice: |enter secret for',
            '1',
            'plain-secret',
            '1',
            'multi-reachless-secret',
            '1',
            'secret-for-beav',
            '1',
            'secret-for-vlad',
          ],
          {
            encoding: 'utf-8', // eslint-disable-line @cspell/spellchecker -- node api
            cwd: repo.path,
            env: { ...process.env, HOME: repo.path },
            timeout: 120000,
          },
        ),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the tree names BOTH declared reaches', () => {
        expect(result.stdout).toContain('beav@ehmpathy.com');
        expect(result.stdout).toContain('vlad@ehmpathy.com');
      });

      then('it walks both declared keys, not merely the first', () => {
        expect(result.stdout).toContain('PLAIN_KEY');
        expect(result.stdout).toContain('MULTI_REACH_KEY');
      });

      // BOTH streams, the empty one too. a stdout-only snapshot catches content that MOVES
      // between streams, and is blind to content that APPEARS on the unsnapped one — a
      // deprecation notice, a debug print, a stray prompt echo. the empty snapshot records
      // the absence positively rather than leaves it unasserted
      // (rule.require.contract-snapshot-exhaustiveness)
      then('stdout matches snapshot', () => {
        expect(asPtySnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });

      then('stderr matches snapshot', () => {
        expect(asPtySnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });
  });

  /**
   * [case10] a fumble at the LAST declared reach — the half that once skipped
   *
   * .what = runs the same manifest, but the human fumbles the mech prompt on the FINAL
   *         declared reach. fill must halt and exit non-zero, exactly as it does when
   *         the fumble lands earlier
   * .why = this is the arm that changed. a `prefer` tier stood beside each exid until
   *        2026-08-05, and under it this exact run warned, carried on, and exited 0 —
   *        `🟡 skipped preferred reach`. with the tier gone, a declared reach is a
   *        declared reach wherever it sits in the list, so the skip must be
   *        unreachable. a render that survived its own justification would tell a human
   *        their floor was met when it was not
   *
   * .note = the trigger is deliberate: `inferKeyrackMechForSet` throws a caller-fixable
   *         `BadRequestError` on an out-of-range choice, and its prompt is the very
   *         `choice: ` the feeder matches. the obvious alternatives (an absent pem, an
   *         unregistered app) raise prompts the feeder cannot answer, so the run would HANG
   * .note = `9` is fed at the FOURTH mech prompt, so the three targets before it (PLAIN_KEY,
   *         MULTI_REACH_KEY reachless, MULTI_REACH_KEY at beav) all provision normally.
   *         that is what makes this a clamp on the HALT and not merely on a failed fill
   * .note = the 4th secret answer is deliberately absent — the throw lands at the mech
   *         prompt, so fill never asks for it
   */
  given('[case10] the LAST declared reach cannot be provisioned', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        `org: testorg

env.test:
  - PLAIN_KEY
  - MULTI_REACH_KEY:
      reaches:
        - beav@ehmpathy.com
        - vlad@ehmpathy.com
`,
        'utf-8',
      );

      return r;
    });

    when('[t0] the human fumbles the prompt on the last reach', () => {
      const result = useBeforeAll(async () =>
        spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack fill --env test`,
            'choice: |enter secret for',
            '1',
            'plain-secret',
            '1',
            'multi-reachless-secret',
            '1',
            'secret-for-beav',
            '9', // out of range — the last declared reach cannot be provisioned
          ],
          {
            encoding: 'utf-8', // eslint-disable-line @cspell/spellchecker -- node api
            cwd: repo.path,
            env: { ...process.env, HOME: repo.path },
            timeout: 120000,
          },
        ),
      );

      // THE clamp, and it goes red under the design this replaced: a `prefer` tier here
      // exited 0 and printed a yellow line, so a human read a partly-provisioned checkout
      // as complete
      //
      // .note = 2 is asserted EXACTLY rather than as a bare non-zero. a `not.toEqual(0)`
      //         would hold just as well if the process died on a segfault, so it would
      //         clamp far less than it reads like it does. 2 is the caller-fixable code,
      //         and a fumbled menu choice is the caller's to fix
      //         (`rule.require.exit-code-semantics`, `rule.forbid.helpful-error-parents`)
      then('it exits 2 — a declared reach is not optional', () => {
        expect(result.status).toEqual(2);
      });

      // .note = the strongest single line in this case. the phrase is the render that a
      //         strength tier produced, so a tier restored anywhere in `fill` prints it
      //         again and this goes red — a clamp on the ABSENCE of a feature, which a
      //         status-code assertion alone cannot express
      then('no skip is rendered — the yellow line has no way to occur', () => {
        expect(result.stdout).not.toContain('skipped preferred reach');
      });

      // .note = without this, the case would pass on a fill that halted before it began.
      //         the three targets ahead of the last one must still have been walked, which
      //         is what proves the halt landed AT the final reach
      then('the reaches ahead of it were still provisioned', () => {
        expect(result.stdout).toContain('beav@ehmpathy.com');
        expect(result.stdout).toContain('PLAIN_KEY');
      });

      // BOTH streams — see the note at [case9][t0]. this is a HALT path, so the second
      // stream matters more here than on a success: a refusal that migrated to the wrong
      // stream is exactly the drift a one-stream snapshot cannot see
      then('stdout matches snapshot', () => {
        expect(asPtySnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });

      then('stderr matches snapshot', () => {
        expect(asPtySnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });
  });

  /**
   * [case11] a fumble at a MIDDLE declared reach — the twin of `[case10]`
   *
   * .what = the SAME fumbled mech prompt, moved one prompt earlier, onto the FIRST declared
   *         reach. fill must halt and exit non-zero, exactly as `[case10]` does
   * .why = read alone, either case proves only "fill halts on a bad prompt". read as a
   *        PAIR they prove the claim that matters: the halt does not depend on WHERE the
   *        reach sits in the declared list. a design that graded reaches would
   *        show right here as a difference between the two arms — and until 2026-08-05 it
   *        did, since a `prefer` tier sat on the last entry and skipped rather than halted
   *
   * .note = `9` is fed at the THIRD mech prompt, not the fourth. target order is PLAIN_KEY,
   *         MULTI_REACH_KEY reachless, then MULTI_REACH_KEY at beav — so the third prompt
   *         is the first declared reach, and the fourth is never reached. that one
   *         moved answer is the entire difference from `[case10]`, which is what makes the
   *         pair a clean A/B on position
   */
  given('[case11] the FIRST declared reach cannot be provisioned', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        `org: testorg

env.test:
  - PLAIN_KEY
  - MULTI_REACH_KEY:
      reaches:
        - beav@ehmpathy.com
        - vlad@ehmpathy.com
`,
        'utf-8',
      );

      return r;
    });

    when('[t0] the human fumbles the prompt on the first reach', () => {
      const result = useBeforeAll(async () =>
        spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack fill --env test`,
            'choice: |enter secret for',
            '1',
            'plain-secret',
            '1',
            'multi-reachless-secret',
            '9', // out of range — the FIRST declared reach cannot be provisioned
          ],
          {
            encoding: 'utf-8', // eslint-disable-line @cspell/spellchecker -- node api
            cwd: repo.path,
            env: { ...process.env, HOME: repo.path },
            timeout: 120000,
          },
        ),
      );

      // THE clamp. a miss that exited 0 would report a floor as met when it was not —
      // the one outcome a declared reach exists to rule out
      //
      // .note = the code is asserted EXACTLY, not merely as non-zero. a `not.toEqual(0)`
      //         would hold just as well if the process died on a segfault, so it would
      //         clamp far less than it reads like it does
      // .note = 2 is the CALLER-fixable code, and a fumbled menu choice is plainly the
      //         caller's to fix (`rule.require.exit-code-semantics`). this line read 1
      //         until `inferKeyrackMechForSet` was corrected to throw a `ConstraintError`
      //         rather than a bare `BadRequestError`: the parent carries no `.code.exit`,
      //         so `getExitCodeFromError` fell to its default of 1 and reported a typo as
      //         a server defect. this repo throws two error words only — `ConstraintError`
      //         (caller, 2) and `MalfunctionError` (server, 1) — never their
      //         `helpful-errors` parents, which name no owner and so decide no exit code
      //         (`rule.forbid.helpful-error-parents`)
      then('it exits 2 — the fault is the caller’s to fix', () => {
        expect(result.status).toEqual(2);
      });

      then('the fault is surfaced, not swallowed', () => {
        expect(result.stdout + result.stderr).toContain(
          'invalid mechanism choice',
        );
      });

      // .note = the A/B against `[case10]`, which fumbles the LAST reach instead. both
      //         arms must halt; a difference between them would mean position grades a
      //         reach, which is the design this replaced
      then('no skip is rendered here either — position does not grade', () => {
        expect(result.stdout).not.toContain('skipped preferred reach');
      });

      // .note = without this, the case would pass on a fill that halted before it began.
      //         the two targets ahead of this one must still have been walked, which is
      //         what proves the halt landed AT the first declared reach
      then('the targets ahead of it were still walked', () => {
        expect(result.stdout).toContain('PLAIN_KEY');
        expect(result.stdout).toContain('MULTI_REACH_KEY');
      });

      // BOTH streams — see the note at [case9][t0]. and this case is HALF of an A/B, so the
      // second stream carries extra weight: if the two arms ever diverged on stderr alone,
      // a stdout-only pair would report them identical and the A/B would prove naught
      then('stdout matches snapshot', () => {
        expect(asPtySnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });

      then('stderr matches snapshot', () => {
        expect(asPtySnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });
  });
});
