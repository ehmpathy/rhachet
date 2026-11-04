import { asActorOndiskDirName } from '@src/domain.operations/actor/enrolled/asActorOndiskDirName';
import { REPO_ACTOR_DIR_NAME } from '@src/domain.operations/actor/enrolled/constants';
import { getOneRepoActorExid } from '@src/domain.operations/actor/enrolled/getOneRepoActorExid';

import { dirname } from 'node:path';
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
 *   whole, so a negation for a prior repo actor dir (the legacy `slug=.default`, or a
 *   former `ambient:` actor) drops on the next write
 * .why = only `brain/.claude/` is re-included, and its own allowlist `.gitignore` picks
 *   the tracked names. a bare enroll lands on the repo actor, so its runtime records
 *   (`actor.json`, `roles/`, `clones/`) are written there on every everyday `claude` —
 *   they stay ignored, as in every other actor dir
 * .note = git never re-includes a path under an excluded dir, so each level is
 *   re-included, then its children ignored, one level at a time
 */
const asActorsGitignoreContentSelf = (input: {
  repoActorDirName: string;
}): string => {
  const dir = input.repoActorDirName;
  return `${GITIGNORE_HEADER}# .note = the repo actor's brain dir is the one exception: it holds the ambient roles' brain config
/*
!/.gitignore
!/${dir}/
/${dir}/*
!/${dir}/brain/
/${dir}/brain/*
!/${dir}/brain/.claude/
`;
};

/**
 * .what = creates a self-ignore .gitignore inside a .agent ephemeral dir
 *   (e.g. .agent/.actors, .agent/.cache)
 * .why = these dirs hold ephemeral host-local state, never source — a self-ignore
 *   keeps them out of git history in every repo `.agent` lands in, and leaves the
 *   consumer's root .gitignore untouched
 *
 * .note = `.actors` spares its repo actor dir from both the ignore and the
 *   create-time untrack; every other dir ignores all it holds
 * .note = the `.actors` dir is always `<repo>/.agent/.actors`, so the repo — and from it the
 *   repo actor (`getOneRepoActorExid`) — is two levels up
 */
export const findsertAgentEphemeralGitignore = (input: {
  dir: string;
  kind: 'actors' | 'cache';
}): LinkResult => {
  // a cache dir ignores all it holds
  if (input.kind === 'cache')
    return findsertDirGitignore({
      dir: input.dir,
      content: GITIGNORE_CONTENT,
      spare: [],
    });

  // the actors dir spares the repo actor dir
  const repoActorDirName = asActorOndiskDirName({
    exid: getOneRepoActorExid({ repoPath: dirname(dirname(input.dir)) }),
  });
  return findsertDirGitignore({
    dir: input.dir,
    content: asActorsGitignoreContentSelf({ repoActorDirName }),
    spare: [repoActorDirName],
  });
};

/**
 * .what = exports the gitignore content for a test to assert against
 * .why = enables a test to verify exact content match
 * .note = the actors content is the one with no manifest — the repo actor `repo=ambient`
 */
export const AGENT_EPHEMERAL_GITIGNORE_CONTENT = GITIGNORE_CONTENT;
export const AGENT_ACTORS_GITIGNORE_CONTENT = asActorsGitignoreContentSelf({
  repoActorDirName: REPO_ACTOR_DIR_NAME,
});
