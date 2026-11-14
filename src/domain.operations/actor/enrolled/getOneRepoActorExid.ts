import { getActorsManifest } from '@src/domain.operations/actor/manifest/getActorsManifest';

import { REPO_ACTOR_EXID } from './constants';

/**
 * .what = the exid of the repo actor — `slug=<x>` under `ambient: '@<x>'`, else `repo=ambient`
 * .why = one owner of which actor is the repo actor. with no manifest it is
 *        `actor.via.repo=ambient`, as main ships it; with one, the `ambient:` actor IS the repo
 *        actor, so a bare enroll and `rhx clone @<x>` land in one dir, never twins
 *
 * .note = a change of `ambient:` repoints the repo actor; no dir moves
 */
export const getOneRepoActorExid = (input: { repoPath: string }): string => {
  // no manifest → the repo actor of main
  const manifest = getActorsManifest({ repoPath: input.repoPath });
  if (!manifest) return REPO_ACTOR_EXID;

  // the manifest names the repo actor by slug
  return `slug=${manifest.ambient.replace(/^@/, '')}`;
};
