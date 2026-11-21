import { spawnSync } from 'node:child_process';
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = the clamp on `rhx hooks.dispatch.cost`, the instrument behind the per-call read (vision case=7)
 * .why = the pr's before/after figures and its byte-equal verdict claim come from this skill; a
 *   skill that misreads either shape would publish a false read
 *
 * .note = integration tier: it spawns bash, jq, strace and GNU time, and writes a temp dir
 */

/** this file sits at `.agent/repo=.this/role=any/skills/`, so four hops reach the repo root */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const SKILL = join(__dirname, 'hooks.dispatch.cost.sh');
const DISPATCHER = join(REPO_ROOT, 'bin', 'hooks.dispatch.sh');

/** two rules that each block, as claude ran them one process apiece */
const RULE_A = 'echo "nope from a" >&2; exit 2';
const RULE_B = 'echo "nope from b" >&2; exit 2';

/**
 * .what = a v1 manifest row of a `foreign` rule, which the dispatcher runs as claude ran it
 */
const asManifestRow = (command: string): string =>
  ['PreToolUse', 'Bash', '5', 'repo=test/role=tester', 'foreign', '', '', '', command, ''].join(
    '\x1f',
  );

/**
 * .what = a settings file whose PreToolUse:Bash entry runs the given commands
 */
const asSettings = (commands: string[]): string =>
  JSON.stringify({
    hooks: {
      PreToolUse: [
        { matcher: 'Bash', hooks: commands.map((command) => ({ type: 'command', command })) },
      ],
    },
  });

/**
 * .what = run the skill with args, in a dir, under an optional PATH
 */
const runSkill = (input: { cwd: string; args: string[]; path?: string }) => {
  const result = spawnSync('bash', [SKILL, ...input.args], {
    cwd: input.cwd,
    encoding: 'utf-8',
    timeout: 120_000,
    env: { ...process.env, ...(input.path ? { PATH: input.path } : {}) },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

describe('hooks.dispatch.cost', () => {
  given('[case1] a before shape of two blocker hooks, and an after shape of one dispatcher over them', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'hooks-dispatch-cost' });
      const manifest = join(dir, 'hooks.dispatch.manifest');
      writeFileSync(
        manifest,
        ['# rhachet hooks.dispatch manifest v1', asManifestRow(RULE_A), asManifestRow(RULE_B), ''].join(
          '\n',
        ),
      );
      const before = join(dir, 'settings.before.json');
      const after = join(dir, 'settings.after.json');
      writeFileSync(before, asSettings([RULE_A, RULE_B]));
      writeFileSync(after, asSettings([`bash ${DISPATCHER} ${manifest} PreToolUse`]));
      return { dir, before, after };
    });

    when('[t0] the verdicts are read', () => {
      const result = useBeforeAll(async () =>
        runSkill({
          cwd: scene.dir,
          args: ['--what', 'verdicts', '--before', scene.before, '--after', scene.after],
        }),
      );

      then('it exits 0: both shapes block, with the same blocker bytes', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('before exit = 2 (2 hooks)');
        expect(result.stdout).toContain('after exit = 2 (1 hook)');
        expect(result.stdout).toContain('blocker stderr byte-equal = yes');
        expect(result.stdout).toContain('stdout byte-equal = n/a (block)');
      });

      then('it counts the blocked-by lines the dispatcher adds after the blockers', () => {
        expect(result.stdout).toContain('blocked-by lines after = 2');
      });

      then('the read matches the snapshot', () => {
        expect(
          result.stdout.split(scene.dir).join('$DIR').split(REPO_ROOT).join('$REPO'),
        ).toMatchSnapshot();
      });
    });

    when('[t1] the cost is read, one run per shape', () => {
      const result = useBeforeAll(async () =>
        runSkill({
          cwd: scene.dir,
          args: ['--before', scene.before, '--after', scene.after, '--runs', '1'],
        }),
      );

      then('it exits 0 and counts the hooks claude starts per shape', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toMatch(/├─ before = .*\n   │  ├─ hooks claude starts = 2\n/);
        expect(result.stdout).toMatch(/└─ after = .*\n      ├─ hooks claude starts = 1\n/);
      });

      then('each shape reports forks, cpu and peak rss as numbers', () => {
        expect(result.stdout).toMatch(/processes forked = \d+ \(\d+ execs\)/);
        expect(result.stdout).toMatch(/cpu per call = \d+ ms/);
        expect(result.stdout).toMatch(/peak rss of one process = \d+ MB/);
      });

      then('the cost read matches the snapshot, with its measured numbers masked', () => {
        // forks, execs, cpu and rss vary per run; the frame and every label stay pinned
        expect(
          result.stdout
            .split(scene.dir)
            .join('$DIR')
            .replace(/= \d+ \(\d+ execs\)/g, '= __N__ (__N__ execs)')
            .replace(/= \d+ (ms|MB)/g, '= __N__ $1')
            .replace(/(\d+) → (\d+)/g, '__N__ → __N__'),
        ).toMatchSnapshot();
      });
    });

    when('[t2] a settings file is absent', () => {
      const result = useBeforeAll(async () =>
        runSkill({
          cwd: scene.dir,
          args: ['--before', join(scene.dir, 'absent.json'), '--after', scene.after],
        }),
      );

      then('it refuses with exit 2 and names the path', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: no settings file at');
        expect(result.stderr).toContain('absent.json');
      });

      then('the refusal matches the snapshot', () => {
        expect(result.stderr.split(scene.dir).join('$DIR')).toMatchSnapshot();
      });
    });

    when('[t4] the verdicts are read with no --before', () => {
      // the before shape is built from the after dispatcher's own manifest, one hook per rule, so
      //   both shapes run the same rules; a settings file of another rule set would compare unlike
      const result = useBeforeAll(async () =>
        runSkill({ cwd: scene.dir, args: ['--what', 'verdicts', '--after', scene.after] }),
      );

      then('the before shape holds the manifest rules, one hook each, and both shapes agree', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('before exit = 2 (2 hooks)');
        expect(result.stdout).toContain('after exit = 2 (1 hook)');
        expect(result.stdout).toContain('blocker stderr byte-equal = yes');
      });
    });

    when('[t5] two shapes that allow the call but print different stdout', () => {
      const result = useBeforeAll(async () => {
        const before = join(scene.dir, 'settings.out-one.json');
        const after = join(scene.dir, 'settings.out-two.json');
        writeFileSync(before, asSettings(['echo one']));
        writeFileSync(after, asSettings(['echo two']));
        return runSkill({
          cwd: scene.dir,
          args: ['--what', 'verdicts', '--before', before, '--after', after],
        });
      });

      then('it exits 1 and shows how the stdout differs', () => {
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain('stdout byte-equal = no');
        expect(result.stderr).toContain('stdout differs');
        expect(result.stderr).toContain('< one');
        expect(result.stderr).toContain('> two');
      });

      then('the read and the diff match the snapshot', () => {
        // a labeled text block, so each stream reads as the terminal showed it
        expect(['--- stdout ---', result.stdout, '--- stderr ---', result.stderr].join('\n')).toMatchSnapshot();
      });
    });

    when('[t6] a before hook outlives its declared timeout', () => {
      // claude kills a hook at its timeout, so a rule that would block after its limit never blocks;
      //   the before shape must read it the same, else a slow box reads a false mismatch
      const result = useBeforeAll(async () => {
        const before = join(scene.dir, 'settings.slow.json');
        writeFileSync(
          before,
          JSON.stringify({
            hooks: {
              PreToolUse: [
                {
                  matcher: 'Bash',
                  hooks: [
                    { type: 'command', command: 'sleep 10; echo late >&2; exit 2', timeout: 1 },
                  ],
                },
              ],
            },
          }),
        );
        // a fast after shape, so the elapsed time measures the before loop alone
        const after = join(scene.dir, 'settings.fast.json');
        writeFileSync(after, asSettings(['true']));
        const startedAt = Date.now();
        const read = runSkill({
          cwd: scene.dir,
          args: ['--what', 'verdicts', '--before', before, '--after', after],
        });
        return { ...read, elapsedMs: Date.now() - startedAt };
      });

      then('the hook is killed at its timeout and reads as timed out, not as a block', () => {
        expect(result.stdout).toContain('before exit = 124 (1 hook)');
        expect(result.stdout).not.toContain('before exit = 2');
        expect(result.elapsedMs).toBeLessThan(10_000);
      });

      then('the read matches the snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t7] the execs are read', () => {
      const result = useBeforeAll(async () =>
        runSkill({
          cwd: scene.dir,
          args: ['--what', 'execs', '--before', scene.before, '--after', scene.after],
        }),
      );

      then('it exits 0 and lists the programs each shape execs, counted', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('🧮 hooks.dispatch.cost --what execs (before)');
        expect(result.stdout).toContain('🧮 hooks.dispatch.cost --what execs (after)');
        expect(result.stdout).toMatch(/bash = \d+ execs/);
      });

      then('each list closes on its last row', () => {
        // a block of rows ends with `└─`, never with an open `├─`
        expect(result.stdout).not.toMatch(/├─ [^\n]*\n\n/);
        expect(result.stdout.match(/└─ [^\n]* = \d+ execs\n\n/g)).toHaveLength(2);
      });

      then('the read matches the snapshot, with each program and count masked', () => {
        // programs and counts vary per host; the frame and the elbows stay pinned
        expect(
          result.stdout
            .replace(/([├└])─ \S+ = \d+ execs/g, '$1─ __PROGRAM__ = __N__ execs')
            .replace(/(   ├─ __PROGRAM__ = __N__ execs\n)+/g, '$1'),
        ).toMatchSnapshot();
      });
    });

    when('[t8] the help is asked for', () => {
      const result = useBeforeAll(async () => ({
        long: runSkill({ cwd: scene.dir, args: ['--help'] }),
        short: runSkill({ cwd: scene.dir, args: ['-h'] }),
      }));

      then('it exits 0 and names usage, each flag, and a call', () => {
        expect(result.long.status).toEqual(0);
        expect(result.long.stdout).toContain('usage');
        expect(result.long.stdout).toContain('--what');
        expect(result.long.stdout).toContain('--payload-bytes');
      });

      then('-h reads the same as --help', () => {
        expect(result.short.status).toEqual(0);
        expect(result.short.stdout).toEqual(result.long.stdout);
      });

      then('the help matches the snapshot', () => {
        expect(result.long.stdout).toMatchSnapshot();
      });
    });

    when('[t9] the input is refused', () => {
      const result = useBeforeAll(async () => ({
        unknownArg: runSkill({ cwd: scene.dir, args: ['--bogus'] }),
        badBytes: runSkill({
          cwd: scene.dir,
          args: ['--before', scene.before, '--after', scene.after, '--payload-bytes', 'lots'],
        }),
        badWhat: runSkill({
          cwd: scene.dir,
          args: ['--what', 'vibes', '--before', scene.before, '--after', scene.after],
        }),
      }));

      then('an unknown arg exits 2 and points at --help', () => {
        expect(result.unknownArg.status).toEqual(2);
        expect(result.unknownArg.stderr).toContain("unknown arg '--bogus'; see --help");
      });

      then('a --payload-bytes that is no count exits 2 and shows a call', () => {
        expect(result.badBytes.status).toEqual(2);
        expect(result.badBytes.stderr).toContain("--payload-bytes takes a byte count, got 'lots'");
        expect(result.badBytes.stderr).toContain('hint: rhx hooks.dispatch.cost --payload-bytes');
      });

      then('an unknown --what exits 2 and names the valid modes', () => {
        expect(result.badWhat.status).toEqual(2);
        expect(result.badWhat.stderr).toContain("--what must be cost, verdicts, or execs, got 'vibes'");
        expect(result.badWhat.stderr).toContain('hint: rhx hooks.dispatch.cost --what cost');
      });

      then('the refusals match the snapshot', () => {
        expect(
          [result.unknownArg.stderr, result.badBytes.stderr, result.badWhat.stderr]
            .join('\n')
            .split(scene.dir)
            .join('$DIR'),
        ).toMatchSnapshot();
      });
    });

    when('[t3] strace is absent from the PATH', () => {
      const result = useBeforeAll(async () => {
        // a PATH that holds bash and jq only, so the tool check meets an absent strace
        const bin = join(scene.dir, 'bin-no-strace');
        mkdirSync(bin, { recursive: true });
        for (const name of ['bash', 'jq'])
          symlinkSync(
            spawnSync('bash', ['-c', `command -v ${name}`], { encoding: 'utf-8' }).stdout.trim(),
            join(bin, name),
          );
        return runSkill({
          cwd: scene.dir,
          args: ['--before', scene.before, '--after', scene.after],
          path: bin,
        });
      });

      then('it refuses with exit 2 and names the absent tool and the fix', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: strace is required');
        expect(result.stderr).toContain('hint: install strace');
      });

      then('the refusal matches the snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });
});
