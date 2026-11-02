import { join } from 'node:path';
import { getOneRepoActorOndiskDir } from './getOneRepoActorOndiskDir';

/**
 * .what = the path of the repo actor's ambient role foci — `actor.via.repo=ambient/roles.foci.json`
 * .why = the ambient roles are the linked dirs, and a link is a whole dir; the focus an
 *        `rhx init --roles +mechanic::flow` names must live beside the actor that holds the
 *        ambient roles, so its render and every enroll read one record
 *
 * .note = the actor domain owns its dir's layout, so it names this path; the roles domain
 *         reads and writes the record through it, never by a join of its own
 *
 * .note = it derives from the roles alone, so it is the actor's, never a clone's
 *         (`rule.forbid.per-clone-config`). `prepare:rhachet` replays the token on install,
 *         so a fresh clone of the repo rewrites it
 */
export const getRepoAmbientRoleFociPath = (input: {
  repoPath: string;
}): string =>
  join(
    getOneRepoActorOndiskDir({ repoPath: input.repoPath }),
    'roles.foci.json',
  );
