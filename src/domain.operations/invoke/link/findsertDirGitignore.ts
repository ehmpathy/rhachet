import { execSync } from 'node:child_process';
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
 *   ignore is absent) untracks any previously committed content via git rm --cached
 */
export const findsertDirGitignore = (input: {
  dir: string;
  content: string;
}): LinkResult => {
  const gitignorePath = resolve(input.dir, '.gitignore');
  const relativePath = relative(process.cwd(), gitignorePath);
  const relativeDir = relative(process.cwd(), input.dir);

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

  // gitignore missing — untrack any previously tracked content
  try {
    execSync(`git rm --cached -r "${relativeDir}"`, { stdio: 'ignore' });
  } catch {
    // ignore errors — dir may not be tracked
  }

  // create the gitignore
  writeFileSync(gitignorePath, input.content, 'utf8');
  return { path: relativePath, status: 'created' };
};
