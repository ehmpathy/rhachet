import { MalfunctionError } from 'helpful-errors';

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import type { LinkResult } from './findsertFile';

/**
 * .what = findserts a `.gitignore` with given content into a dir, creating the
 *   dir if absent
 * .why =
 *   - several `.agent` dirs hold only local content (symlinks, runtime caches,
 *     enrolled-actor records) that must never enter git history
 *   - a self-ignore inside the dir keeps a consumer's root `.gitignore`
 *     untouched — the dir ignores itself wherever `.agent` lands
 *   - one owner of the ensure + untrack logic, shared by findsertRepoGitignore
 *     and findsertAgentStateGitignore
 * .note = idempotent — converges the file to `content`; the first write (when the
 *   ignore is absent) untracks any previously committed content via git rm --cached,
 *   except the direct children named in `spare`, which `content` re-includes
 */
export const findsertDirGitignore = (input: {
  dir: string;
  content: string;
  spare: string[];
}): LinkResult => {
  const gitignorePath = resolve(input.dir, '.gitignore');
  const relativePath = relative(process.cwd(), gitignorePath);

  // ensure the dir exists so the ignore has a home
  mkdirSync(input.dir, { recursive: true });

  // gitignore present — converge its content
  if (existsSync(gitignorePath)) {
    const contentBefore = readFileSync(gitignorePath, 'utf8');
    if (contentBefore === input.content)
      return { path: relativePath, status: 'unchanged' };

    // file exists but content differs — update it
    writeFileSync(gitignorePath, input.content, 'utf8');
    return { path: relativePath, status: 'updated' };
  }

  // gitignore absent — untrack any previously tracked content, save the spared
  // .note = run from the dir itself, so the pathspecs never depend on process.cwd()
  const pathspecsSpared = input.spare.map((name) => `:(exclude)${name}`);
  try {
    execFileSync(
      'git',
      [
        '-C',
        input.dir,
        'rm',
        '--cached',
        '-r',
        '--quiet',
        '--ignore-unmatch',
        '--',
        '.',
        ...pathspecsSpared,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
  } catch (error) {
    // a dir outside any git repo has no index to untrack from; --ignore-unmatch
    // already covers an untracked dir. any other fault leaves content tracked, so it fails loud
    // .note = the message carries git's stderr; the stderr field alone can arrive empty
    const cause = error instanceof Error ? error : new Error(String(error));
    const stderr = 'stderr' in cause ? String(cause.stderr ?? '') : '';
    const isOutsideRepo = `${cause.message}\n${stderr}`
      .toLowerCase()
      .includes('not a git repository');
    if (!isOutsideRepo)
      throw new MalfunctionError(
        'could not untrack the dir before its .gitignore',
        {
          dir: input.dir,
          cause,
        },
      );
  }

  // create the gitignore
  writeFileSync(gitignorePath, input.content, 'utf8');
  return { path: relativePath, status: 'created' };
};
