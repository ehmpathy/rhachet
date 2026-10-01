import { spawnSync } from 'child_process';
import {
  chmodSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { given, then, useThen, when } from 'test-fns';

/**
 * .what = the refusal, help, and search paths of the claude-code probe skills, snapped
 * .why = these are the surfaces a human meets first — a typo, an absent flag, a prefix
 *   outside the repo. each must refuse with exit 2 and name the fix, and the snapshot lets
 *   a reviewer read the words. the strings search runs against a fake package in the repo
 *
 * .note = only the paths that need no real claude-code install and no network are
 *   exercised here; the trial itself spends one fake oauth refresh against the live
 *   endpoint, which is a byhand probe and never a suite step — the verdict it reports is
 *   proven by `blackbox/cli/enroll.shared-brain-auth.acceptance.test.ts`
 * .note = an integration test: it spawns bash and reads the filesystem
 */

/** this file sits at `.agent/repo=.this/role=any/skills/`, so four hops reach the repo root */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const SKILLS_DIR = __dirname;

/**
 * .what = run one skill with args, from the repo root
 * .why = the skills read `--in` relative to the cwd, as they do under `rhx`
 */
const runSkill = (input: {
  skill: string;
  args: string[];
}): { status: number | null; stdout: string; stderr: string } => {
  const result = spawnSync(
    'bash',
    [join(SKILLS_DIR, `${input.skill}.sh`), ...input.args],
    { cwd: REPO_ROOT, encoding: 'utf-8' },
  );
  const mask = (text: string): string => text.split(REPO_ROOT).join('<repo>');
  return {
    status: result.status,
    stdout: mask(result.stdout),
    stderr: mask(result.stderr),
  };
};

/**
 * .what = a fake probe prefix in the repo: a claude-code package with one text file and
 *   one binary file, each with the string `storage-write`; plus a dir with no package
 * .why = the strings search and its success output must be snapped with no real install
 *   and no network; a byte outside the printable set proves the binary read path
 */
const FIXTURE_ROOT_REL = '.temp/claude.cli.skills.test';
const FIXTURE_PROBE_REL = `${FIXTURE_ROOT_REL}/probe`;
const FIXTURE_EMPTY_REL = `${FIXTURE_ROOT_REL}/empty`;
const FIXTURE_LOCKED_REL = `${FIXTURE_ROOT_REL}/locked`;
const FIXTURE_MUTE_REL = `${FIXTURE_ROOT_REL}/mute`;
const FIXTURE_ESCAPE_REL = `${FIXTURE_ROOT_REL}/escape`;
beforeAll(() => {
  const root = join(REPO_ROOT, FIXTURE_ROOT_REL);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(join(REPO_ROOT, FIXTURE_EMPTY_REL), { recursive: true });
  const pkg = join(
    REPO_ROOT,
    FIXTURE_PROBE_REL,
    'node_modules',
    '@anthropic-ai',
    'claude-code',
  );
  mkdirSync(pkg, { recursive: true });
  writeFileSync(
    join(pkg, 'package.json'),
    `${JSON.stringify({ name: '@anthropic-ai/claude-code', version: '9.9.9' })}\n`,
  );
  writeFileSync(
    join(pkg, 'cli.js'),
    'const lockPath = join(dir, ".storage-write.lock");\n',
  );
  writeFileSync(
    join(pkg, 'claude'),
    Buffer.concat([
      Buffer.from([0x00, 0x01, 0xff]),
      Buffer.from('bin\x02storage-write\x03end'),
      Buffer.from([0xfe, 0x00]),
    ]),
  );

  // a package with one file no reader may open: the strings search must fail loud
  const pkgLocked = join(
    REPO_ROOT,
    FIXTURE_LOCKED_REL,
    'node_modules',
    '@anthropic-ai',
    'claude-code',
  );
  mkdirSync(pkgLocked, { recursive: true });
  writeFileSync(
    join(pkgLocked, 'package.json'),
    `${JSON.stringify({ name: '@anthropic-ai/claude-code', version: '9.9.9' })}\n`,
  );
  writeFileSync(join(pkgLocked, 'locked.js'), 'storage-write\n');
  chmodSync(join(pkgLocked, 'locked.js'), 0o000);

  // a package link that resolves outside the repo: the strings search must refuse it
  //   (the target is /usr, which the skill only resolves, never reads)
  const scopeEscape = join(
    REPO_ROOT,
    FIXTURE_ESCAPE_REL,
    'node_modules',
    '@anthropic-ai',
  );
  mkdirSync(scopeEscape, { recursive: true });
  symlinkSync('/usr', join(scopeEscape, 'claude-code'));

  // a claude bin that prints no version: the trial must fail loud before any scenario
  const binMute = join(REPO_ROOT, FIXTURE_MUTE_REL, 'node_modules', '.bin');
  mkdirSync(binMute, { recursive: true });
  writeFileSync(join(binMute, 'claude'), '#!/bin/sh\nexit 0\n');
  chmodSync(join(binMute, 'claude'), 0o755);
});

const SKILLS = [
  {
    skill: 'claude.cli.strings',
    argsValid: ['--pattern', 'x'],
  },
  {
    skill: 'claude.cli.secstore.trial',
    argsValid: [],
  },
] as const;

describe('claude.cli probe skills', () => {
  SKILLS.map((thisSkill) =>
    given(`[case] ${thisSkill.skill}`, () => {
      when('[t0] an unknown arg is passed', () => {
        const result = useThen('it runs', async () =>
          runSkill({ skill: thisSkill.skill, args: ['--bogus', 'x'] }),
        );
        then('it refuses with exit 2 and names the arg', () => {
          expect(result.status).toEqual(2);
          expect(result.stderr).toContain('✋ ConstraintError:');
          expect(result.stderr).toContain("'--bogus'");
          expect(result.stderr).toMatchSnapshot();
        });
      });

      when('[t1] --in is absent', () => {
        const result = useThen('it runs', async () =>
          runSkill({ skill: thisSkill.skill, args: [...thisSkill.argsValid] }),
        );
        then('it refuses with exit 2 and shows the usage', () => {
          expect(result.status).toEqual(2);
          expect(result.stderr).toContain('usage:');
          expect(result.stderr).toMatchSnapshot();
        });
      });

      when('[t2] --in names no probe install', () => {
        const result = useThen('it runs', async () =>
          runSkill({
            skill: thisSkill.skill,
            args: ['--in', '.temp/absent-probe', ...thisSkill.argsValid],
          }),
        );
        then('it refuses with exit 2 and names the install command', () => {
          expect(result.status).toEqual(2);
          expect(result.stderr).toContain('rhx claude.cli.probe --into');
          expect(result.stderr).toMatchSnapshot();
        });
      });

      when('[t3] --in sits outside the repo', () => {
        const result = useThen('it runs', async () =>
          runSkill({
            skill: thisSkill.skill,
            args: ['--in', '/', ...thisSkill.argsValid],
          }),
        );
        then('it refuses with exit 2, and reads no file there', () => {
          expect(result.status).toEqual(2);
          expect(result.stderr).toContain('--in must sit inside the repo');
          expect(result.stdout).toEqual('');
          expect(result.stderr).toMatchSnapshot();
        });
      });

      when('[t4] --help is passed', () => {
        const result = useThen('it runs', async () =>
          runSkill({ skill: thisSkill.skill, args: ['--help'] }),
        );
        then('it prints the header and exits 0', () => {
          expect(result.status).toEqual(0);
          expect(result.stdout).toContain('.what =');
          expect(result.stdout).toContain('usage:');
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when('[t5] --in is a dir in the repo with no claude-code install', () => {
        const result = useThen('it runs', async () =>
          runSkill({
            skill: thisSkill.skill,
            args: ['--in', FIXTURE_EMPTY_REL, ...thisSkill.argsValid],
          }),
        );
        then('it refuses with exit 2 and names the install command', () => {
          expect(result.status).toEqual(2);
          expect(result.stderr).toContain('rhx claude.cli.probe --into');
          expect(result.stdout).toEqual('');
          expect(result.stderr).toMatchSnapshot();
        });
      });
    }),
  );

  given('[case] claude.cli.strings against a fake claude-code package in the repo', () => {
    when('[t0] --radius is not a whole number', () => {
      const result = useThen('it runs', async () =>
        runSkill({
          skill: 'claude.cli.strings',
          args: ['--in', FIXTURE_PROBE_REL, '--pattern', 'x', '--radius', 'abc'],
        }),
      );
      then('it refuses with exit 2', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('whole numbers');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] --pattern is not a valid extended regex', () => {
      const result = useThen('it runs', async () =>
        runSkill({
          skill: 'claude.cli.strings',
          args: ['--in', FIXTURE_PROBE_REL, '--pattern', 'lock('],
        }),
      );
      then('it refuses with exit 2, never a zero-match report', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('not a valid extended regex');
        expect(result.stdout).not.toContain('matches:');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t2] the pattern matches, in a text file and in a binary', () => {
      const result = useThen('it runs', async () =>
        runSkill({
          skill: 'claude.cli.strings',
          args: [
            '--in',
            FIXTURE_PROBE_REL,
            '--pattern',
            'storage-write',
            '--radius',
            '8',
          ],
        }),
      );
      then('it exits 0 and reports each distinct match once', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('@anthropic-ai/claude-code@9.9.9');
        expect(result.stdout).toContain('matches: 2 distinct');
        expect(result.stdout).toMatchSnapshot();
      });
      then('a binary byte prints as a dot', () => {
        expect(result.stdout).toContain('bin.storage-write.end');
      });
    });

    when('[t3] the pattern matches no file', () => {
      const result = useThen('it runs', async () =>
        runSkill({
          skill: 'claude.cli.strings',
          args: ['--in', FIXTURE_PROBE_REL, '--pattern', 'absentword'],
        }),
      );
      then('it exits 0 and reports zero matches', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('matches: 0 distinct');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * .note = the strings skill's "the search failed" malfunction is not exercised: it
   *   fires only when find, sort, xargs, tr or awk themselves fail, which no fixture in
   *   the repo can provoke without a fault injected into the host tools
   */
  given('[case] claude.cli.strings against a package with an unreadable file', () => {
    when('[t0] a search is run', () => {
      const result = useThen('it runs', async () =>
        runSkill({
          skill: 'claude.cli.strings',
          args: ['--in', FIXTURE_LOCKED_REL, '--pattern', 'storage-write'],
        }),
      );
      then('it fails loud with exit 1, never a zero-match report', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError: unreadable file');
        expect(result.stdout).not.toContain('matches:');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case] claude.cli.strings against a package link that resolves outside the repo', () => {
    when('[t0] a search is run', () => {
      const result = useThen('it runs', async () =>
        runSkill({
          skill: 'claude.cli.strings',
          args: ['--in', FIXTURE_ESCAPE_REL, '--pattern', 'x'],
        }),
      );
      then('it refuses with exit 2, and reads no file there', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain(
          'the claude-code package lands outside the repo',
        );
        expect(result.stdout).toEqual('');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case] claude.cli.secstore.trial against a claude bin that prints no version', () => {
    when('[t0] the trial is run', () => {
      const result = useThen('it runs', async () =>
        runSkill({
          skill: 'claude.cli.secstore.trial',
          args: ['--in', FIXTURE_MUTE_REL],
        }),
      );
      then('it fails loud with exit 1, before any scenario', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('did not print a version');
        expect(result.stdout).toEqual('');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });
});
