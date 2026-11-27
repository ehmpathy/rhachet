import { spawnSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

/**
 * .what = the help, the refusals, and the compare itself of `test.snap.compare`, snapped
 * .why = the skill renders `--help` from its own header comment, so the header IS the emitted
 *   contract (rule.always.resnap-the-help-a-skill-renders); and the compare is what a human
 *   runs the skill for, so its identical and differ reports are snapped too
 *
 * .note = an integration test: it spawns bash, and writes its .snap fixtures under the repo's
 *   gitignored .temp/, since the skill reads only files inside the repo
 */

/** this file sits at `.agent/repo=.this/role=any/skills/`, so four hops reach the repo root */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

/**
 * .what = three jest snapshot entries: two sound, and one a resnap drifted
 */
const ENTRY_WAX = 'exports[`surfer waxes the board 1`] = `"wax on"`;';
const ENTRY_PADDLE = 'exports[`surfer paddles out 1`] = `"paddle out past the break"`;';
const ENTRY_PADDLE_DRIFTED =
  'exports[`surfer paddles out 1`] = `"paddle out, then wait for a set"`;';

/**
 * .what = a fresh fixture dir under the repo's .temp/, one per case
 */
const genFixtureDir = (input: { slug: string }): string => {
  const dir = join(
    REPO_ROOT,
    '.temp',
    'test.snap.compare',
    `${input.slug}.${process.pid}.${Date.now()}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
};

/**
 * .what = write one snapshot file of the given entries, as jest lays one out, and return its path
 * .why = the `.fixture` suffix keeps jest off it: a bare `.snap` under the repo reads as an
 *   orphan snapshot file, and `--ci` fails the whole run on an orphan
 */
const putSnapFile = (input: { dir: string; name: string; entries: string[] }): string => {
  const path = join(input.dir, `${input.name}.fixture`);
  writeFileSync(path, `// Jest Snapshot v1\n\n${input.entries.join('\n\n')}\n`);
  return path;
};

/**
 * .what = run the skill with args, from the repo root
 */
const runSkill = (input: {
  args: string[];
}): { status: number | null; stdout: string; stderr: string } => {
  const result = spawnSync(
    'bash',
    [join(__dirname, 'test.snap.compare.sh'), ...input.args],
    { cwd: REPO_ROOT, encoding: 'utf-8' },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
};

describe('test.snap.compare', () => {
  given('[case1] the help flag', () => {
    when('[t0] `--help`', () => {
      const run = useThen('exits 0', () => runSkill({ args: ['--help'] }));

      then('it renders the whole header contract, from .what to the exit codes', () => {
        expect(run.status).toEqual(0);
        expect(run.stdout).toContain('.what = prove a set of jest snapshot files');
        expect(run.stdout).toContain('--before');
        expect(run.stdout).toContain('exit 2 = bad args');
        expect(run.stdout).not.toContain('set -euo');
      });
      then('the help holds its shape', () => {
        expect(run.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] no --before or --after', () => {
    when('[t0] the skill runs with no args', () => {
      const run = useThen('exits 2', () => runSkill({ args: [] }));

      then('it refuses, and names both required flags', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('--before and --after are required');
      });
      then('the refusal holds its shape', () => {
        expect(run.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case4] one snapshot file split into two, every entry moved unchanged', () => {
    const files = useBeforeAll(async () => {
      const dir = genFixtureDir({ slug: 'identical' });
      return {
        before: putSnapFile({ dir, name: 'before.snap', entries: [ENTRY_WAX, ENTRY_PADDLE] }),
        afterA: putSnapFile({ dir, name: 'after.a.snap', entries: [ENTRY_PADDLE] }),
        afterB: putSnapFile({ dir, name: 'after.b.snap', entries: [ENTRY_WAX] }),
      };
    });

    when('[t0] the skill compares the before against both afters', () => {
      const run = useThen('exits 0', () =>
        runSkill({
          args: ['--before', files.before, '--after', `${files.afterA} ${files.afterB}`],
        }),
      );

      then('it reports the two entry sets identical', () => {
        expect(run.status).toEqual(0);
        expect(run.stdout).toContain('before: 2 entries');
        expect(run.stdout).toContain('after:  2 entries');
        expect(run.stdout).toContain('✅ identical');
      });
      then('the report holds its shape', () => {
        expect(run.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case5] a split whose resnap changed one entry', () => {
    const files = useBeforeAll(async () => {
      const dir = genFixtureDir({ slug: 'differ' });
      return {
        before: putSnapFile({ dir, name: 'before.snap', entries: [ENTRY_WAX, ENTRY_PADDLE] }),
        after: putSnapFile({ dir, name: 'after.snap', entries: [ENTRY_WAX, ENTRY_PADDLE_DRIFTED] }),
      };
    });

    when('[t0] the skill compares them', () => {
      const run = useThen('exits 1', () =>
        runSkill({ args: ['--before', files.before, '--after', files.after] }),
      );

      then('it reports them differ, and shows the changed line of the moved entry', () => {
        expect(run.status).toEqual(1);
        expect(run.stdout).toContain('✋ differ');
        expect(run.stdout).toContain(`-${ENTRY_PADDLE}`);
        expect(run.stdout).toContain(`+${ENTRY_PADDLE_DRIFTED}`);
        expect(run.stdout).not.toContain('wax on');
      });
      then('the report holds its shape', () => {
        expect(run.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case6] a --before file outside the repo', () => {
    const files = useBeforeAll(async () => {
      const outside = genTempDir({ slug: 'test-snap-compare-outside' });
      const dir = genFixtureDir({ slug: 'outside' });
      return {
        outsideDir: outside,
        before: putSnapFile({ dir: outside, name: 'before.snap', entries: [ENTRY_WAX] }),
        after: putSnapFile({ dir, name: 'after.snap', entries: [ENTRY_WAX] }),
      };
    });

    when('[t0] the skill runs', () => {
      const run = useThen('exits 2', () =>
        runSkill({ args: ['--before', files.before, '--after', files.after] }),
      );

      then('it refuses, and names the file and the fix', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('✋ ConstraintError: not a file inside the repo:');
        expect(run.stderr).toContain(files.before);
        expect(run.stderr).toContain('name a .snap file under this repo root');
      });
      then('the refusal holds its shape', () => {
        expect(run.stderr.split(files.outsideDir).join('<outside>')).toMatchSnapshot();
      });
    });
  });

  given('[case3] an option the skill does not know', () => {
    when('[t0] the skill runs with `--bogus`', () => {
      const run = useThen('exits 2', () => runSkill({ args: ['--bogus'] }));

      then('it refuses, and names the option', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('--bogus');
      });
      then('the refusal holds its shape', () => {
        expect(run.stderr).toMatchSnapshot();
      });
    });
  });
});
