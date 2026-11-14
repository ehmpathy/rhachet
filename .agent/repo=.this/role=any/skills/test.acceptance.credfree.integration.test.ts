import { spawnSync } from 'child_process';
import { join } from 'path';
import { given, then, useThen, when } from 'test-fns';

/**
 * .what = the help and refusal surfaces of `test.acceptance.credfree`, snapped
 * .why = the skill renders `--help` from its own header comment, so the header IS the emitted
 *   contract (rule.always.resnap-the-help-a-skill-renders). a snapshot here makes an edit to
 *   that header show as a diff in the same change
 *
 * .note = an integration test: it spawns bash. no case runs jest itself
 */

/** this file sits at `.agent/repo=.this/role=any/skills/`, so four hops reach the repo root */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

/**
 * .what = run the skill with args, from the repo root
 */
const runSkill = (input: {
  args: string[];
}): { status: number | null; stdout: string; stderr: string } => {
  const result = spawnSync(
    'bash',
    [join(__dirname, 'test.acceptance.credfree.sh'), ...input.args],
    { cwd: REPO_ROOT, encoding: 'utf-8' },
  );
  const mask = (text: string): string => text.split(REPO_ROOT).join('<repo>');
  return {
    status: result.status,
    stdout: mask(result.stdout),
    stderr: mask(result.stderr),
  };
};

describe('test.acceptance.credfree', () => {
  given('[case1] the help flag', () => {
    when('[t0] `--help`', () => {
      const run = useThen('exits 0', () => runSkill({ args: ['--help'] }));

      then('it renders the header contract, with the scope caution', () => {
        expect(run.status).toEqual(0);
        expect(run.stdout).toContain('--scope');
        expect(run.stdout).toContain('🟡 it matches the ABSOLUTE path');
      });
      then('the help holds its shape', () => {
        expect(run.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] no --scope', () => {
    when('[t0] the skill runs with no args', () => {
      const run = useThen('exits 2', () => runSkill({ args: [] }));

      then('it refuses, before any build or jest run', () => {
        expect(run.status).toEqual(2);
      });
      then('the refusal holds its shape', () => {
        expect(run.stderr).toMatchSnapshot();
      });
    });
  });
});
