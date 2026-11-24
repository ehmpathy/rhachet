import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { given, then, when } from 'test-fns';

import { genTempDirPhysical } from '@src/.test/infra/genTempDirPhysical';

/**
 * .what = the clamp on test.under-unit-config.sh's human surfaces: its help, and each refusal
 * .why = a contributor meets these words first; each refusal must name its class, say what is
 *        wrong, and point at the help — snapped, so a drift in any of them goes red
 *
 * .note = integration, never unit: it spawns the skill
 */

/** this file sits at `.agent/repo=.this/role=any/skills/`, so four hops reach the repo root */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const SKILL = join(__dirname, 'test.under-unit-config.sh');

/**
 * .what = runs the skill with the given args, from the repo root
 * .note = via 'rhx' goes through the real dispatcher (`npx rhx <skill>`), as a contributor does
 */
const runSkill = (input: {
  args: string[];
  cwd?: string;
  via?: 'bash' | 'rhx';
}): { status: number | null; stdout: string; stderr: string } => {
  const launch: { command: string; prefix: string[] } =
    input.via === 'rhx'
      ? { command: 'npx', prefix: ['rhx', 'test.under-unit-config'] }
      : { command: 'bash', prefix: [SKILL] };
  const result = spawnSync(launch.command, [...launch.prefix, ...input.args], {
    cwd: input.cwd ?? REPO_ROOT,
    encoding: 'utf-8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

/**
 * .what = the envelope of a jest report: the PASS/FAIL file line and the summary counts
 * .why = durations and host notices (e.g. the temp root's audit lines) vary per run, while
 *        which file ran and how its counts read do not — so only the envelope is snapped
 */
const asReportEnvelope = (input: { stdout: string }): string =>
  input.stdout
    // jest colors its report lines, so strip ansi sgr bytes before the lines are matched
    .replace(/\x1B\[[0-9;]*m/g, '')
    .split('\n')
    .filter((line) => /^(PASS|FAIL) |^(Test Suites|Tests|Snapshots):|^Ran all/.test(line))
    .join('\n');

describe('test.under-unit-config', () => {
  given('[case1] a caller asks for help', () => {
    when('[t0] --help is passed', () => {
      const result = runSkill({ args: ['--help'] });

      then('it exits 0 and renders the usage', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case1b] a caller goes through the real `rhx` dispatcher', () => {
    when('[t0] a refusal is provoked via `npx rhx`', () => {
      const result = runSkill({ args: ['--file', 'src/.test/infra'], via: 'rhx' });

      then('rhx dispatches to the skill, and the refusal echoes the call as typed', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('ran = rhx test.under-unit-config --file src/.test/infra\n');
        expect(result.stderr).not.toContain('--skill');
        // rhx colors its frame, so strip ansi sgr bytes before the render is snapped
        expect(result.stderr.replace(/\x1B\[[0-9;]*m/g, '')).toMatchSnapshot();
      });
    });
  });

  given('[case2] a caller makes a fixable mistake', () => {
    when('[t0] no --file is passed', () => {
      const result = runSkill({ args: [] });

      then('it refuses with exit 2, the class, and a pointer to help', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] an unknown option is passed', () => {
      const result = runSkill({ args: ['--fiel', 'x.test.ts'] });

      then('it refuses with exit 2, the class, and a pointer to help', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t2] --file is passed with no value', () => {
      const result = runSkill({ args: ['--file'] });

      then('it refuses with exit 2, the class, and a pointer to help', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t3] a --file that does not exist is passed', () => {
      const result = runSkill({ args: ['--file', 'src/absent.integration.test.ts'] });

      then('it refuses with exit 2, the class, and a pointer to help', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t5] a --file names a dir, not a file', () => {
      const result = runSkill({ args: ['--file', 'src/.test/infra'] });

      then('it refuses as the wrong shape, never as an absent path', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).not.toContain('no such file');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t6] a --file is an absolute path', () => {
      const result = runSkill({ args: ['--file', '/abs/x.test.ts'] });

      then('it refuses and names the repo-root-relative form it wants', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).not.toContain('no such file');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t4] a flag is handed where --file wants its value', () => {
      const result = runSkill({ args: ['--file', '--name', 'foo'] });

      then('it refuses as an absent value, never as an unknown option', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).not.toContain('unknown option');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case3] the dispatcher passes its own args through', () => {
    when('[t0] --skill, --repo, --role precede --help', () => {
      const result = runSkill({
        args: ['--skill', 'test.under-unit-config', '--repo', '.this', '--role', 'any', '--help'],
      });

      then('they are accepted, and the help renders', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('usage');
      });
    });

    when('[t1] a dispatcher arg arrives with no value', () => {
      const result = runSkill({ args: ['--repo'] });

      then('it refuses with exit 2, the class, and a pointer to help', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case3b] rhx prepends its own --skill pair, as it does on every real call', () => {
    when('[t0] a refusal echoes the call', () => {
      const result = runSkill({
        args: ['--skill', 'test.under-unit-config', '--file', 'src/.test/infra'],
      });

      then('it echoes the call as the human typed it, with no --skill pair', () => {
        expect({ status: result.status, stderr: result.stderr }).toMatchObject({
          status: 2,
        });
        expect(result.stderr).toContain('ran = rhx test.under-unit-config --file src/.test/infra\n');
        expect(result.stderr).not.toContain('--skill');
      });
    });
  });

  given('[case4] a caller stands in a subdirectory of the repo', () => {
    when('[t0] a repo-root-relative --file is passed', () => {
      const result = runSkill({
        args: ['--file', 'src/.test/assets/frozen-roster/frozen-roster.test.ts'],
        cwd: join(REPO_ROOT, 'src', '.test'),
      });

      then('the file is found from the repo root, and its tests run', () => {
        expect({ status: result.status, stdout: result.stdout }).toMatchObject({
          status: 0,
        });
        expect(result.stdout).toContain('Tests:');
      });

      then("the run's report envelope renders as snapshotted", () => {
        // timings and host notices vary per run; the envelope (which file, the counts) does not
        expect(asReportEnvelope({ stdout: result.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case7] the repo has no installed deps', () => {
    when('[t0] the skill runs from a checkout with no node_modules', () => {
      const result = (() => {
        // a copy of the skill in a bare checkout, so it derives a root that holds no jest bin
        const root = genTempDirPhysical({ slug: 'unit-config-no-deps' });
        const skillsDir = join(root, '.agent', 'repo=.this', 'role=any', 'skills');
        mkdirSync(skillsDir, { recursive: true });
        copyFileSync(SKILL, join(skillsDir, 'test.under-unit-config.sh'));
        writeFileSync(join(root, 'x.test.ts'), '');
        const spawned = spawnSync(
          'bash',
          [join(skillsDir, 'test.under-unit-config.sh'), '--file', 'x.test.ts'],
          { cwd: root, encoding: 'utf-8' },
        );
        return { status: spawned.status, stderr: spawned.stderr };
      })();

      then('it refuses with exit 2 and names the install, never a bare shell fault', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('install the repo deps first');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case5] a caller filters by test name', () => {
    when('[t0] --name matches only some of the tests in the file', () => {
      const result = runSkill({
        args: ['--file', 'src/.test/assets/frozen-roster/frozen-roster.test.ts', '--name', 'alpha'],
      });

      then('only the matched tests run; the rest are skipped', () => {
        // the output rides in the object, so a red row shows what jest said
        expect({
          status: result.status,
          // words, never one span: jest may color the counts, which splits a span with ansi codes
          isFiltered: /\d+ skipped/.test(result.stdout) && /\d+ passed/.test(result.stdout),
          stdout: result.stdout,
        }).toMatchObject({ status: 0, isFiltered: true });
        expect(asReportEnvelope({ stdout: result.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case6] a caller opts out of the open-handle wait', () => {
    when('[t0] --force-exit is passed', () => {
      const result = runSkill({
        args: ['--file', 'src/.test/assets/frozen-roster/frozen-roster.test.ts', '--force-exit'],
      });

      then('the flag is accepted, and the tests run', () => {
        expect({
          status: result.status,
          isRun: result.stdout.includes('Tests:'),
          stdout: result.stdout,
        }).toMatchObject({ status: 0, isRun: true });
        expect(asReportEnvelope({ stdout: result.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case8] a caller rewrites the snapshots of the files named', () => {
    when('[t0] --resnap is passed', () => {
      const result = runSkill({
        args: ['--file', 'src/.test/assets/frozen-roster/frozen-roster.test.ts', '--resnap'],
      });

      then('the flag is accepted, and the tests run', () => {
        expect({
          status: result.status,
          isRun: result.stdout.includes('Tests:'),
          stdout: result.stdout,
        }).toMatchObject({ status: 0, isRun: true });
        expect(asReportEnvelope({ stdout: result.stdout })).toMatchSnapshot();
      });
    });
  });
});
