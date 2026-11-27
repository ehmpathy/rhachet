import { spawnSync } from 'child_process';
import { join } from 'path';
import { given, then, useThen, when } from 'test-fns';

/**
 * .what = the help and the bad-input refusals of `bun.compiled.lookup.probe`, snapped
 * .why = the skill renders `--help` from its own header comment, so the header IS the emitted
 *   contract (rule.always.resnap-the-help-a-skill-renders). a snapshot here makes an edit to
 *   that header show as a diff in the same change
 *
 * .note = an integration test: it spawns bash, and case4 compiles a probe with the repo's own
 *   bun (node_modules/.bin/bun, which the build installs)
 */

/** this file sits at `.agent/repo=.this/role=any/skills/`, so four hops reach the repo root */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

/**
 * .what = the probe output with its per-run bytes masked: the bun version and the temp dir
 * .why = the lookup outcomes are what a reader reads the probe for, so they are snapped as printed
 */
const asProbeSnapshotSafe = (input: { output: string }): string =>
  input.output
    .replace(/^🔭 bun \S+,/m, '🔭 bun <version>,')
    .replace(/\/\S*?\/repo\//g, '<tmp>/repo/');

/**
 * .what = run the skill with args, from the repo root
 */
const runSkill = (input: {
  args: string[];
}): { status: number | null; stdout: string; stderr: string } => {
  const result = spawnSync(
    'bash',
    [join(__dirname, 'bun.compiled.lookup.probe.sh'), ...input.args],
    { cwd: REPO_ROOT, encoding: 'utf-8' },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
};

describe('bun.compiled.lookup.probe', () => {
  given('[case1] the help flag', () => {
    when('[t0] `--help`', () => {
      const run = useThen('exits 0', () => runSkill({ args: ['--help'] }));

      then('it renders the whole header contract, from .what to the exit codes', () => {
        expect(run.status).toEqual(0);
        expect(run.stdout).toContain('.what = probe how a bun-compiled binary');
        expect(run.stdout).toContain('--dep-spec');
        expect(run.stdout).toContain('exit 0 = probed, 2 = bad input');
        expect(run.stdout).not.toContain('set -euo');
      });
      then('the help holds its shape', () => {
        expect(run.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] an option the skill does not know', () => {
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

  given('[case4] a made repo, probed by a compiled binary', () => {
    when('[t0] the skill runs with no args', () => {
      const run = useThen('exits 0', () => runSkill({ args: [] }));

      then('it compiles the probe, and reports one line per lookup method', () => {
        expect({ status: run.status, stderr: run.stderr }).toEqual({ status: 0, stderr: '' });
        expect(run.stdout).toMatch(/^🔭 bun \S+, compiled, pkg = probe-pkg$/m);
        for (const method of ['createRequire', 'require.paths', 'walk', 'import.fileurl'])
          expect(run.stdout).toMatch(new RegExp(`^${method.replace('.', '\\.')} = `, 'm'));
      });
      then('the walk finds the package entry on disk', () => {
        expect(run.stdout).toMatch(/^walk = ok \S+\/node_modules\/probe-pkg\/index\.js$/m);
      });
      then('the probe matrix holds its shape, per-run bytes masked', () => {
        expect(asProbeSnapshotSafe({ output: run.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case3] an --at that names no dir', () => {
    when('[t0] the skill runs with `--at ./absent-dir`', () => {
      const run = useThen('exits 2', () =>
        runSkill({ args: ['--at', './absent-dir'] }),
      );

      then('it refuses, and names the path', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('--at must name a dir');
      });
      then('the refusal holds its shape', () => {
        expect(run.stderr).toMatchSnapshot();
      });
    });
  });
});
