import type { ActorsManifest } from '@src/domain.objects/ActorsManifest';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { getAllActorExidsOndisk } from '@src/domain.operations/actor/enrolled/getAllActorExidsOndisk';
import { getRoleRegistriesByConfigImplicit } from '@src/domain.operations/config/getRoleRegistriesByConfigImplicit';

import { asActorExidsUndeclared } from './asActorExidsUndeclared';
import { asActorsDriftReportLines } from './asActorsDriftReportLines';
import { asRoleSpecifiersOfLinkedRefs } from './asRoleSpecifiersOfLinkedRefs';
import { asRoleSpecifiersToLink } from './asRoleSpecifiersToLink';
import { asSlugsOfActorsDeclared } from './asSlugsOfActorsDeclared';
import { genGetPublishedActorOfPackages } from './genGetPublishedActorOfPackages';
import { getActorsDrift } from './getActorsDrift';
import { getActorsRoleUnion } from './getActorsRoleUnion';

/**
 * .what = what `rhachet init` links under `.agent/actors.yml`: the union of every declared
 *         actor's roles, and the drift report to print before the link
 * .why = under a manifest init reads its roles from the manifest rather than a `--roles` list
 *        (F6). the manifest owns WHAT is declared; the link itself stays with the init caller,
 *        which already owns the link path for `--roles`
 *
 * .note = every actor expands here, so an invalid base, cycle or brainless actor fails fast,
 *         before any link is written (case=7)
 * .note = native `.this` roles are the repo's own and never linked; one that no actor declares
 *         is named in the report, with its fix
 */
export const getActorsManifestLinkPlan = async (
  input: { manifest: ActorsManifest; refsLinked: RoleLinkRef[] },
  context: ContextCli,
): Promise<{ reportLines: string[]; roleSpecifiers: string[] }> => {
  // expand every actor over the installed packages
  const { manifests } = await getRoleRegistriesByConfigImplicit(context);
  const union = getActorsRoleUnion(
    { manifest: input.manifest },
    { getPublishedActor: genGetPublishedActorOfPackages({ manifests }) },
  );

  // declared vs linked, so a change is never silent
  const drift = getActorsDrift({
    declared: union.roles,
    ...asRoleSpecifiersOfLinkedRefs({ refs: input.refsLinked }),
  });
  const reportLines = asActorsDriftReportLines({
    ambient: input.manifest.ambient,
    countActors: input.manifest.actor.length,
    countRoles: union.roles.length,
    drift,
    warnings: union.warnings,
    actorsUndeclared: asActorExidsUndeclared({
      exids: getAllActorExidsOndisk({ repoPath: context.gitroot }),
      slugsDeclared: asSlugsOfActorsDeclared({ manifest: input.manifest }),
    }),
  });

  // the roles to link: the union, save the native ones
  return {
    reportLines,
    roleSpecifiers: asRoleSpecifiersToLink({ union: union.roles }),
  };
};
