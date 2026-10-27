import {
  ACTORS_GITIGNORE_LINE,
  REPO_ACTOR_DIR_NAME,
} from '@src/domain.operations/actor/enrolled/constants';
import { getRealpathOfNearestExtant } from '@src/infra/filesystem/getRealpathOfNearestExtant';
import { isPathOutsideDir } from '@src/utils/isPathOutsideDir';

import { realpathSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
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
 * .what = the `.actors` self-ignore: every direct child ignored, save the repo
 *   actor's brain dir, which holds the repo's tracked brain config (D10)
 * .why = the patterns are anchored (`/*`), so the root `.gitignore` patterns
 *   (`*.local.json`, `*.bak.*`) still apply inside the repo actor dir. the file converges
 *   whole, so the legacy `!/actor.via.slug=.default/` line drops on the next write
 * .why = only `brain/.claude/` is re-included, and its own allowlist `.gitignore` picks
 *   the tracked names. a bare enroll lands on the repo actor, so its runtime records
 *   (`actor.json`, `roles/`, `clones/`) are written there on every everyday `claude` —
 *   they stay ignored, as in every other actor dir
 * .note = git never re-includes a path under an excluded dir, so each level is
 *   re-included, then its children ignored, one level at a time
 */
const GITIGNORE_CONTENT_ACTORS = `${GITIGNORE_HEADER}# .note = the repo actor's brain dir is the one exception: it holds the ambient roles' brain config
/*
!/.gitignore
${ACTORS_GITIGNORE_LINE.selfRepoActorNegation}
/${REPO_ACTOR_DIR_NAME}/*
!/${REPO_ACTOR_DIR_NAME}/brain/
/${REPO_ACTOR_DIR_NAME}/brain/*
!/${REPO_ACTOR_DIR_NAME}/brain/.claude/
`;

/**
 * .what = creates a self-ignore .gitignore inside a .agent ephemeral dir
 *   (e.g. .agent/.actors, .agent/.cache)
 * .why = these dirs hold ephemeral host-local state, never source — a self-ignore
 *   keeps them out of git history in every repo `.agent` lands in, and leaves the
 *   consumer's root .gitignore untouched
 *
 * .note = `.actors` spares its repo actor dir from both the ignore and the
 *   create-time untrack; every other dir ignores all it holds
 * .note = rhachet never writes outside the repo: a dir that links out of `<repo>` is left
 *   alone. its self-ignore has no job there, since this repo's git never sees that dir
 */
export const findsertAgentEphemeralGitignore = (input: {
  dir: string;
  kind: 'actors' | 'cache';
}): LinkResult => {
  // the dir sits at `<repo>/.agent/<name>`
  const repoPath = dirname(dirname(input.dir));
  const isDirOutsideRepo = isPathOutsideDir({
    path: getRealpathOfNearestExtant({ path: input.dir }),
    dir: realpathSync(repoPath),
  });
  if (isDirOutsideRepo)
    return {
      path: relative(process.cwd(), join(input.dir, '.gitignore')),
      status: 'unchanged',
    };

  return input.kind === 'actors'
    ? findsertDirGitignore({
        dir: input.dir,
        content: GITIGNORE_CONTENT_ACTORS,
        spare: [REPO_ACTOR_DIR_NAME],
      })
    : findsertDirGitignore({
        dir: input.dir,
        content: GITIGNORE_CONTENT,
        spare: [],
      });
};

/**
 * .what = exports the gitignore content for a test to assert against
 * .why = enables a test to verify exact content match
 */
export const AGENT_EPHEMERAL_GITIGNORE_CONTENT = GITIGNORE_CONTENT;
export const AGENT_ACTORS_GITIGNORE_CONTENT = GITIGNORE_CONTENT_ACTORS;
