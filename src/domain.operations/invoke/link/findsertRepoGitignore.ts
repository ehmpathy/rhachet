import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const GITIGNORE_CONTENT = `# .what = tells git to ignore this dir
# .why = keeps git history clean
#   - just symlinks here, no real code
#   - package.json already tracks the version
# .note = safe to delete; run \`npx rhachet init --roles\` to bring it back
*
`;

/**
 * .what = creates a .gitignore file inside a linked repo directory
 * .why = ignores symlinked content without mutating shared root .gitignore
 */
export const findsertRepoGitignore = (input: {
  repoDir: string;
}): { status: 'created' | 'updated' | 'unchanged' } => {
  const gitignorePath = resolve(input.repoDir, '.gitignore');
  const relativePath = relative(process.cwd(), gitignorePath);
  const relativeRepoDir = relative(process.cwd(), input.repoDir);

  // check if file already exists with correct content
  if (existsSync(gitignorePath)) {
    const contentBefore = readFileSync(gitignorePath, 'utf8');
    if (contentBefore === GITIGNORE_CONTENT) {
      return { status: 'unchanged' };
    }
    // file exists but content differs — update it
    writeFileSync(gitignorePath, GITIGNORE_CONTENT, 'utf8');
    console.log(`  ↻ ${relativePath} (updated)`);
    return { status: 'updated' };
  }

  // gitignore missing — untrack any previously tracked content
  try {
    execSync(`git rm --cached -r "${relativeRepoDir}"`, { stdio: 'ignore' });
    console.log(`  - ${relativeRepoDir} (detached from git)`);
  } catch {
    // ignore errors — dir may not be tracked
  }

  // create the gitignore
  writeFileSync(gitignorePath, GITIGNORE_CONTENT, 'utf8');
  console.log(`  + ${relativePath} (created)`);
  return { status: 'created' };
};

/**
 * .what = exports the gitignore content for testing
 * .why = enables tests to verify exact content match
 */
export const REPO_GITIGNORE_CONTENT = GITIGNORE_CONTENT;
