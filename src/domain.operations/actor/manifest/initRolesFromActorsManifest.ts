import type { ActorsManifest } from '@src/domain.objects/ActorsManifest';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { getRoleRegistriesByConfigImplicit } from '@src/domain.operations/config/getRoleRegistriesByConfigImplicit';
import { getAllLinkedRoleRefs } from '@src/domain.operations/init/roles/link/getAllLinkedRoleRefs';
import {
  type InitRolesResult,
  initRolesFromPackages,
} from '@src/domain.operations/init/roles/link/initRolesFromPackages';

import { asActorsDriftReportLines } from './asActorsDriftReportLines';
import { genGetPublishedActorOfPackages } from './genGetPublishedActorOfPackages';
import { getActorsDrift } from './getActorsDrift';
import { getActorsRoleUnion } from './getActorsRoleUnion';

/**
 * .what = link the union of every declared actor's roles, after a report of the drift
 * .why = under `.agent/actors.yml`, `rhachet init` reads the roles from the manifest rather
 *        than a `--roles` list, so the role list stops as a string each repo keeps (F6)
 *
 * .note = the link is the extant absolute path, which links and never unlinks: a short role
 *         is restored, an extra role is kept and named (F4)
 * .note = native `.this` roles are the repo's own and never linked by init, so drift skips them
 */
export const initRolesFromActorsManifest = async (
  input: { manifest: ActorsManifest },
  context: ContextCli,
): Promise<{ result: InitRolesResult; roleSpecifiers: string[] }> => {
  // expand every actor over the installed packages; fails fast before any link (case=7)
  const { manifests } = await getRoleRegistriesByConfigImplicit(context);
  const union = getActorsRoleUnion(
    { manifest: input.manifest },
    { getPublishedActor: genGetPublishedActorOfPackages({ manifests }) },
  );

  // report declared vs linked first, so a change is never silent
  const linked = getAllLinkedRoleRefs({}, context)
    .filter((ref) => ref.repo !== '.this')
    .map((ref) => `${ref.repo}/${ref.role}`);
  const drift = getActorsDrift({ declared: union.roles, linked });
  const lines = asActorsDriftReportLines({
    ambient: input.manifest.ambient,
    countActors: input.manifest.actor.length,
    countRoles: union.roles.length,
    drift,
    warnings: union.warnings,
  });
  console.log('');
  for (const line of lines) console.log(line);

  // link the union; extant links stay
  const roleSpecifiers = union.roles.map((one) => one.role);
  const result = await initRolesFromPackages(
    { specifiers: roleSpecifiers },
    context,
  );
  return { result, roleSpecifiers };
};
