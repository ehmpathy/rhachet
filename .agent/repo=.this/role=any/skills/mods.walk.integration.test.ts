import { spawnSync } from 'child_process';
import { join } from 'path';
import { given, then, useThen, when } from 'test-fns';

/**
 * .what = the help, the bad-input refusal, and the walk itself of `mods.walk`
 * .why = the skill renders `--help` from its own header comment, so the header IS the emitted
 *   contract (rule.always.resnap-the-help-a-skill-renders); and the walk is the journey a
 *   reviewer reads, so its verdicts per step must hold
 *
 * .note = an integration test: it spawns bash, and the walk runs this worktree's built cli in a
 *   scratch repo under .temp/, with a stub brain. the walk prints clone serials, a timestamped
 *   scratch path, and this host's repo root; those are masked, then the walk is snapped
 */

/** this file sits at `.agent/repo=.this/role=any/skills/`, so four hops reach the repo root */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

/**
 * .what = the walk output with its per-run bytes masked: the host repo root, the scratch path's
 *   timestamp, and each clone's short serial
 * .why = the rest of the walk is the journey a reviewer reads, so it is snapped as printed
 */
const asWalkSnapshotSafe = (input: { output: string }): string =>
  input.output
    .split(REPO_ROOT)
    .join('<repo>')
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z/g, '<walk>')
    .replace(/@:[0-9a-f]{8}\b/g, '@:<serial>');

/**
 * .what = run the skill with args, from the repo root
 */
const runSkill = (input: {
  args: string[];
}): { status: number | null; stdout: string; stderr: string } => {
  const result = spawnSync('bash', [join(__dirname, 'mods.walk.sh'), ...input.args], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
};

describe('mods.walk', () => {
  given('[case1] the help flag', () => {
    when('[t0] `--help`', () => {
      const run = useThen('exits 0', () => runSkill({ args: ['--help'] }));

      then('it renders the whole header contract, from .what to the guarantee', () => {
        expect(run.status).toEqual(0);
        expect(run.stdout).toContain('.what = walk the mod-fault critical paths');
        expect(run.stdout).toContain('rhx mods.walk');
        expect(run.stdout).toContain('exit codes ARE the evidence');
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
        expect(run.stderr).toContain('✋ ConstraintError: unknown option: --bogus');
      });
      then('the refusal holds its shape', () => {
        expect(run.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case3] the built cli', () => {
    when('[t0] the walk runs', () => {
      const run = useThen('exits 0', () => runSkill({ args: [] }));

      then('it completes, exit 0', () => {
        expect(run.status).toEqual(0);
      });
      then('init and enroll exit 0 with a fault in place, and the boot names the mod dir', () => {
        const path1 = run.stdout.split('══ path 2')[0]!;
        expect(path1).toContain('skipped, booted as published until cured');
        expect(path1).toContain('1 mod fault, held at the first stop of each turn until cured');
        expect(path1).toContain('mod = .agent/repo=.mods/role=surfer/');
        expect(path1.match(/^exit=0$/gm)?.length).toEqual(2);
      });
      then('the stop holds while a fault stands, and passes once both are cured', () => {
        expect(run.stdout).toContain('2 mod faults, held at the first stop of each turn until cured');
        const path3 = run.stdout.split('══ path 3')[1]!.split('══ path 4')[0]!;
        expect(path3).toContain('── a session stops, both cured\n$ rhx roles cost --all --when hook.onStop\nexit=0');
      });
      then('🔴 the stop hold ends on its tree: no cli error tail restates it below', () => {
        expect(run.stdout).not.toContain('[args] roles,cost,--all,--when,hook.onStop');
        expect(run.stdout).not.toContain('"modsFaulted"');
        expect(run.stdout.match(/^exit=2$/gm)?.length).toEqual(3);
      });
      then('the corrupt record cures in the two steps its fix prints', () => {
        const path4 = run.stdout.split('══ path 4')[1]!;
        expect(path4).toContain('💥 MalfunctionError: the modded view record is unreadable');
        expect(path4).toContain("grep -c '<mod.skipped'\n0");
      });
      then('🔴 the walk carries no ansi color byte, whatever the caller color env', () => {
        // a jest worker sets FORCE_COLOR, so a walk that inherits it would paint the stop hold
        expect(run.stdout).not.toMatch(/\u001b\[/);
      });
      then('the walk holds its shape, per-run bytes masked', () => {
        expect(asWalkSnapshotSafe({ output: run.stdout })).toMatchSnapshot();
      });
    });
  });
});
