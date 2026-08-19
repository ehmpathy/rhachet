import { findsertDirGitignore } from './findsertDirGitignore';
import type { LinkResult } from './findsertFile';

const GITIGNORE_CONTENT = `# .what = tells git to ignore this dir
# .why = keeps git history clean
#   - just symlinks here, no real code
#   - package.json already tracks the version
# .note = safe to delete; run \`rhachet init --roles\` to bring it back
*
`;

/**
 * .what = creates a .gitignore file inside a linked repo directory
 * .why = ignores symlinked content without mutating shared root .gitignore
 */
export const findsertRepoGitignore = (input: { repoDir: string }): LinkResult =>
  findsertDirGitignore({ dir: input.repoDir, content: GITIGNORE_CONTENT });

/**
 * .what = exports the gitignore content for testing
 * .why = enables tests to verify exact content match
 */
export const REPO_GITIGNORE_CONTENT = GITIGNORE_CONTENT;
