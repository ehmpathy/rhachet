import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getOneRepoActorExid } from '@src/domain.operations/actor/enrolled/getOneRepoActorExid';
import { setActorOndiskManifest } from '@src/domain.operations/actor/enrolled/setActorOndiskManifest';
import { getOneActorExpandedOfRepo } from '@src/domain.operations/actor/manifest/getOneActorExpandedOfRepo';

import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = under `.agent/actors.yml`, findsert the repo actor's `actor.json` — its brain from the
 *         `ambient:` actor, its roles the ambient roles
 * .why = `init --hooks` derives each actor's claude hooks in the per-actor pass, which reads only
 *        an actor dir that holds an `actor.json`. the root pass leaves claude out under a manifest
 *        (`getBrainsOfRootHookPass`), so with no record the repo actor got no role hook at all,
 *        until a first enroll wrote one — the `prepare:rhachet` journey of a fresh clone (F31)
 *
 * .note = no manifest → naught to do: the repo actor of main takes its hooks in the root pass
 * .note = a record already on disk is left alone; `setDeclaredActorsOndisk` re-derives its roles
 */
export const findsertRepoActorRecordOndisk = async (
  input: { repoPath: string; rolesAmbient: RoleSlug[] },
  context: ContextCli,
): Promise<{ created: boolean }> => {
  // the `ambient:` actor, expanded; no manifest → the root pass owns the repo actor's hooks
  const expanded = await getOneActorExpandedOfRepo(
    { actor: { ambient: true } },
    context,
  );
  if (expanded === null) return { created: false };

  // a record already on disk is the declared re-derive's to keep current
  const actorDir = getActorOndiskDir({
    repoPath: input.repoPath,
    exid: getOneRepoActorExid({ repoPath: input.repoPath }),
  });
  if (existsSync(join(actorDir, 'actor.json'))) return { created: false };

  // write the record the per-actor hook pass reads
  mkdirSync(actorDir, { recursive: true });
  await setActorOndiskManifest({
    repoPath: input.repoPath,
    actorDir,
    brain: expanded.brain,
    roles: input.rolesAmbient,
    rolesDelta: null,
  });
  return { created: true };
};
