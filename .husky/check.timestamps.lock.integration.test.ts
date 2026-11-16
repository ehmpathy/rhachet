import { execFileSync, spawnSync } from 'child_process';
import { appendFileSync, copyFileSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = the lock on the timestamp hook, run for real against a temp git repo
 * .why = the lock halts every commit once the hook drifts; its refusal names the fix, and each
 *   variant (intact, drift on disk, drift in the index, hook absent, an unreadable index) is pinned
 */

/**
 * .what = this process's env, less any git var a parent hook set, so git reads the temp repo
 */
const ENV_GIT_FREE = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
);

/**
 * .what = a temp git repo that holds copies of the hook and its lock, as the practice wrote them
 */
const genRepoWithLock = (input: { slug: string }): string => {
  const dir = genTempDir({ slug: input.slug });
  execFileSync('git', ['init', '--quiet'], { cwd: dir, env: ENV_GIT_FREE });
  mkdirSync(join(dir, '.husky'), { recursive: true });
  ['check.timestamps.sh', 'check.timestamps.lock.sh'].forEach((name) =>
    copyFileSync(join(__dirname, name), join(dir, '.husky', name)),
  );
  return dir;
};

/**
 * .what = run the lock in a repo
 */
const runLock = (input: { dir: string }): { status: number | null; stderr: string } => {
  const ran = spawnSync('bash', ['.husky/check.timestamps.lock.sh'], {
    cwd: input.dir,
    env: ENV_GIT_FREE,
    encoding: 'utf-8',
  });
  return { status: ran.status, stderr: ran.stderr };
};

describe('check.timestamps.lock', () => {
  given('[case1] the hook as the practice wrote it', () => {
    when('[t0] the lock runs', () => {
      const result = useThen('it runs', async () =>
        runLock({ dir: genRepoWithLock({ slug: 'timestamps-lock-intact' }) }),
      );
      then('it passes with exit 0 and says naught', () => {
        expect(result.status).toEqual(0);
        expect(result.stderr).toEqual('');
      });
    });
  });

  given('[case2] a hook that drifted', () => {
    when('[t0] the hook on disk was edited', () => {
      const result = useThen('it runs', async () => {
        const dir = genRepoWithLock({ slug: 'timestamps-lock-disk' });
        appendFileSync(join(dir, '.husky', 'check.timestamps.sh'), '\n# an exemption\n');
        return runLock({ dir });
      });
      then('it halts with exit 2, names where it drifted, and names the fix', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: .husky/check.timestamps.sh was changed');
        expect(result.stderr).toContain('(on disk)');
        expect(result.stderr).toContain('npx declapract apply --practice husky');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] an edit was staged, then reverted on disk', () => {
      const result = useThen('it runs', async () => {
        const dir = genRepoWithLock({ slug: 'timestamps-lock-index' });
        const hook = join(dir, '.husky', 'check.timestamps.sh');
        copyFileSync(hook, join(dir, 'hook.orig'));
        appendFileSync(hook, '\n# an exemption\n');
        execFileSync('git', ['add', '.husky/check.timestamps.sh'], { cwd: dir, env: ENV_GIT_FREE });
        copyFileSync(join(dir, 'hook.orig'), hook);
        return runLock({ dir });
      });
      then('it still halts with exit 2, since the staged edit would commit', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('(in the index)');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t2] the hook was deleted', () => {
      const result = useThen('it runs', async () => {
        const dir = genRepoWithLock({ slug: 'timestamps-lock-absent' });
        rmSync(join(dir, '.husky', 'check.timestamps.sh'));
        return runLock({ dir });
      });
      then('it halts with exit 2, says the hook is absent, and names the fix', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('found: absent (on disk)');
        expect(result.stderr).toContain('npx declapract apply --practice husky');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case3] a git index that cannot be read', () => {
    when('[t0] the lock runs', () => {
      const result = useThen('it runs', async () => {
        const dir = genRepoWithLock({ slug: 'timestamps-lock-unreadable' });
        writeFileSync(join(dir, '.git', 'index'), 'not an index');
        return runLock({ dir });
      });
      then('it halts with exit 1, as a malfunction, and never says the hook changed', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError: the git index is unreadable');
        expect(result.stderr).not.toContain('was changed');

        // git's own `fatal:` line varies by git version; the lock's words are what is pinned
        expect(result.stderr.replace(/^fatal: .*\n/gm, '')).toMatchSnapshot();
      });
    });
  });
});
