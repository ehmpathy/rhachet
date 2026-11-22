import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { given, then, when } from 'test-fns';

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
 */
const runSkill = (input: {
  args: string[];
  cwd?: string;
}): { status: number | null; stdout: string; stderr: string } => {
  const result = spawnSync('bash', [SKILL, ...input.args], {
    cwd: input.cwd ?? REPO_ROOT,
    encoding: 'utf-8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

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
        expect(result.stdout).toContain('usage:');
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

  given('[case4] a caller stands in a subdirectory of the repo', () => {
    when('[t0] a repo-root-relative --file is passed', () => {
      const result = runSkill({
        args: ['--file', 'src/.test/assets/tempdir-clamp/getProbeSlug.test.ts'],
        cwd: join(REPO_ROOT, 'src', '.test'),
      });

      then('the file is found from the repo root, and its tests run', () => {
        expect({ status: result.status, stdout: result.stdout }).toMatchObject({
          status: 0,
        });
        expect(result.stdout).toContain('Tests:');
      });
    });
  });

  given('[case5] a caller filters by test name', () => {
    when('[t0] --name matches only some of the tests in the file', () => {
      const result = runSkill({
        args: ['--file', 'src/.test/assets/tempdir-clamp/getProbeSlug.test.ts', '--name', 'getProbeHoldMs'],
      });

      then('only the matched tests run; the rest are skipped', () => {
        // the output rides in the object, so a red row shows what jest said
        expect({
          status: result.status,
          // words, never one span: jest may color the counts, which splits a span with ansi codes
          isFiltered: /\d+ skipped/.test(result.stdout) && /\d+ passed/.test(result.stdout),
          stdout: result.stdout,
        }).toMatchObject({ status: 0, isFiltered: true });
      });
    });
  });

  given('[case6] a caller opts out of the open-handle wait', () => {
    when('[t0] --force-exit is passed', () => {
      const result = runSkill({
        args: ['--file', 'src/.test/assets/tempdir-clamp/getProbeSlug.test.ts', '--force-exit'],
      });

      then('the flag is accepted, and the tests run', () => {
        expect({
          status: result.status,
          isRun: result.stdout.includes('Tests:'),
          stdout: result.stdout,
        }).toMatchObject({ status: 0, isRun: true });
      });
    });
  });
});
