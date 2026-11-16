import { execFileSync, spawnSync } from 'child_process';
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = the pre-commit timestamp hook, run for real against a temp git repo
 * .why = the hook halts a commit; its refusal is the text a human reads at the worst moment, and
 *   its duration strip decides which lines fall through, so each variant is pinned
 * .note = every clock below is built at run time from split parts, and the snapped renders mask
 *   the clock, so neither this file nor its `.snap` holds a stamp for the hook to catch
 */

/**
 * .what = this process's env, less any git var a parent hook set, so git reads the temp repo
 */
const ENV_GIT_FREE = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
);

const CLOCK = ['14', '30', '00'].join(':');
const STAMP = `2026-01-02T${CLOCK}Z`;
const STAMP_DASH = `2026-01-02T${['14', '30', '00'].join('-')}Z`;
const CLOCK_SHORT = ['14', '30'].join(':');
const DURATION = `PT${['12', '30', '00'].join(':')}`;

/**
 * .what = a temp git repo that holds a copy of the hook, with one file staged
 */
const genRepoWithStaged = (input: { slug: string; file: string; content: string }): string => {
  const dir = genTempDir({ slug: input.slug });
  execFileSync('git', ['init', '--quiet'], { cwd: dir, env: ENV_GIT_FREE });
  mkdirSync(join(dir, '.husky'), { recursive: true });
  copyFileSync(join(__dirname, 'check.timestamps.sh'), join(dir, '.husky', 'check.timestamps.sh'));
  writeFileSync(join(dir, input.file), input.content);
  execFileSync('git', ['add', input.file], { cwd: dir, env: ENV_GIT_FREE });
  return dir;
};

/**
 * .what = run the hook in a repo
 */
const runHook = (input: { dir: string }): { status: number | null; stderr: string } => {
  const ran = spawnSync('bash', ['.husky/check.timestamps.sh'], {
    cwd: input.dir,
    env: ENV_GIT_FREE,
    encoding: 'utf-8',
  });
  return { status: ran.status, stderr: ran.stderr };
};

/**
 * .what = a render with its clocks masked and git's own `fatal:` line dropped
 * .why = a raw clock in the `.snap` would trip this very hook on commit; git's text varies by
 *   version
 */
const asHookStderrSafe = (input: { stderr: string }): string =>
  input.stderr
    .replace(/T[0-9]{2}-[0-9]{2}(-[0-9]{2})?/g, 'T<CLOCK>')
    .replace(/[0-9]{2}:[0-9]{2}(:[0-9]{2})?/g, '<CLOCK>')
    .replace(/^(fatal|error): .*\n/gm, '');

describe('check.timestamps', () => {
  given('[case1] a stage the hook lets through', () => {
    [
      { slug: 'clean', what: 'a clean line', file: 'notes.md', content: 'a plain note, no clock\n' },
      { slug: 'duration', what: 'a duration line', file: 'notes.md', content: `the job runs for ${DURATION}\n` },
      { slug: 'code', what: 'a stamp in a .ts file', file: 'clock.ts', content: `const at = '${STAMP}';\n` },
      { slug: 'shell', what: 'a stamp in a .sh file', file: 'clock.sh', content: `at='${STAMP}'\n` },
      {
        slug: 'line-col',
        what: 'a line-col ref and a port map',
        file: 'notes.md',
        content: 'see src/x.ts:12:34 and port 5432:5432\n',
      },
    ].map((variant, index) =>
      when(`[t${index}] the stage holds ${variant.what}`, () => {
        const result = useThen('it runs', async () =>
          runHook({
            dir: genRepoWithStaged({
              slug: `check-timestamps-${variant.slug}`,
              file: variant.file,
              content: variant.content,
            }),
          }),
        );
        then('it passes with exit 0 and says naught', () => {
          expect(result.status).toEqual(0);
          expect(result.stderr).toEqual('');
        });
      }),
    );
  });

  given('[case2] a stage that holds a stamp', () => {
    [
      { slug: 'stamp', content: `logged at ${STAMP}\n` },
      // .note = a known defect, pinned on purpose: the hook prints the line with its durations
      //   stripped, so this snap reads `notes.md:2: to run, done at …`, a line not in the file.
      //   the hook is practice-owned and lock-pinned, so the fix rides upstream
      //   (.dream/v2026_11_16.reseed.timestamps-hook-prints-the-stripped-line.md); the duration
      //   leads the line here so the strip leaves no gap mid-sentence
      { slug: 'stamp-beside-duration', content: `${DURATION} to run, done at ${STAMP}\n` },
      { slug: 'dash-clock-stamp', content: `see settings.${STAMP_DASH}.bak.json\n` },
      { slug: 'clock-with-no-seconds', content: `standup at ${CLOCK_SHORT} daily\n` },
    ].map((variant, index) =>
      when(`[t${index}] the line is a ${variant.slug}`, () => {
        const result = useThen('it runs', async () =>
          runHook({
            dir: genRepoWithStaged({
              slug: `check-timestamps-${variant.slug}`,
              file: 'notes.md',
              content: `line one\n${variant.content}`,
            }),
          }),
        );
        then('it halts with exit 2, and names the file and the line', () => {
          expect(result.status).toEqual(2);
          expect(result.stderr).toContain('✋ ConstraintError: timestamps are forbidden in tracked files');
          expect(result.stderr).toContain('└─ notes.md:2:');
          expect(asHookStderrSafe({ stderr: result.stderr })).toMatchSnapshot();
        });
      }),
    );
  });

  given('[case3] a staged blob git cannot read', () => {
    when('[t0] the hook runs', () => {
      const result = useThen('it runs', async () => {
        const dir = genRepoWithStaged({
          slug: 'check-timestamps-unreadable',
          file: 'notes.md',
          content: 'a plain note\n',
        });
        const blob = execFileSync('git', ['rev-parse', ':notes.md'], {
          cwd: dir,
          env: ENV_GIT_FREE,
          encoding: 'utf-8',
        }).trim();
        rmSync(join(dir, '.git', 'objects', blob.slice(0, 2), blob.slice(2)), { force: true });
        return runHook({ dir });
      });
      then('it halts with exit 1, as a malfunction, and names the file', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain(
          '💥 MalfunctionError: check.timestamps could not read the staged blob',
        );
        expect(result.stderr).toContain('└─ notes.md');
        expect(asHookStderrSafe({ stderr: result.stderr })).toMatchSnapshot();
      });
    });
  });
});
