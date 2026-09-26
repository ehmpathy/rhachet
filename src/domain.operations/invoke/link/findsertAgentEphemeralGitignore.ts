import {
  ACTORS_GITIGNORE_LINE,
  DEFAULT_ACTOR_DIR_NAME,
} from '@src/domain.operations/actor/enrolled/constants';

import { findsertDirGitignore } from './findsertDirGitignore';
import type { LinkResult } from './findsertFile';

const GITIGNORE_HEADER = `# .what = tells git to ignore this dir
# .why = holds ephemeral, local-only runtime state, never source
#   - enrolled-actor records + caches are host-local
#   - regenerated on demand; none of it belongs in git history
# .note = safe to delete; rhachet recreates it as needed
`;

const GITIGNORE_CONTENT = `${GITIGNORE_HEADER}*
`;

/**
 * .what = the `.actors` self-ignore: every direct child ignored, save the default
 *   actor dir, which holds the repo's tracked brain config (D10)
 * .why = the patterns are anchored (`/*`), so the root `.gitignore` patterns
 *   (`*.local.json`, `*.bak.*`) still apply inside the default dir
 */
const GITIGNORE_CONTENT_ACTORS = `${GITIGNORE_HEADER}# .note = the default actor dir is the one exception: it holds the repo brain dir
/*
!/.gitignore
${ACTORS_GITIGNORE_LINE.selfDefaultNegation}
`;

/**
 * .what = creates a self-ignore .gitignore inside a .agent ephemeral dir
 *   (e.g. .agent/.actors, .agent/.cache)
 * .why = these dirs hold ephemeral host-local state, never source — a self-ignore
 *   keeps them out of git history in every repo `.agent` lands in, and leaves the
 *   consumer's root .gitignore untouched
 *
 * .note = `.actors` spares its default actor dir from both the ignore and the
 *   create-time untrack; every other dir ignores all it holds
 */
export const findsertAgentEphemeralGitignore = (input: {
  dir: string;
  kind: 'actors' | 'cache';
}): LinkResult =>
  input.kind === 'actors'
    ? findsertDirGitignore({
        dir: input.dir,
        content: GITIGNORE_CONTENT_ACTORS,
        spare: [DEFAULT_ACTOR_DIR_NAME],
      })
    : findsertDirGitignore({
        dir: input.dir,
        content: GITIGNORE_CONTENT,
        spare: [],
      });

/**
 * .what = exports the gitignore content for a test to assert against
 * .why = enables a test to verify exact content match
 */
export const AGENT_EPHEMERAL_GITIGNORE_CONTENT = GITIGNORE_CONTENT;
export const AGENT_ACTORS_GITIGNORE_CONTENT = GITIGNORE_CONTENT_ACTORS;
