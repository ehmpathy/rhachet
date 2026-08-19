import { findsertDirGitignore } from './findsertDirGitignore';
import type { LinkResult } from './findsertFile';

const GITIGNORE_CONTENT = `# .what = tells git to ignore this dir
# .why = holds ephemeral, local-only runtime state, never source
#   - enrolled-actor records + caches are host-local
#   - regenerated on demand; none of it belongs in git history
# .note = safe to delete; rhachet recreates it as needed
*
`;

/**
 * .what = creates a self-ignore .gitignore inside a .agent ephemeral dir
 *   (e.g. .agent/.actors, .agent/.cache)
 * .why = these dirs hold ephemeral host-local state, never source — a self-ignore
 *   keeps them out of git history in every repo `.agent` lands in, and leaves the
 *   consumer's root .gitignore untouched
 */
export const findsertAgentEphemeralGitignore = (input: {
  dir: string;
}): LinkResult =>
  findsertDirGitignore({ dir: input.dir, content: GITIGNORE_CONTENT });

/**
 * .what = exports the gitignore content for a test to assert against
 * .why = enables a test to verify exact content match
 */
export const AGENT_EPHEMERAL_GITIGNORE_CONTENT = GITIGNORE_CONTENT;
