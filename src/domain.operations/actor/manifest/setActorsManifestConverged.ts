import type { ActorsManifest } from '@src/domain.objects/ActorsManifest';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { getRolesUnlinkedFromSlugs } from '@src/domain.operations/init/roles/link/getRolesUnlinkedFromSlugs';
import { getAllLinkedRoleRefs } from '@src/domain.operations/role/getAllLinkedRoleRefs';

import { asActorsDriftReportLines } from './asActorsDriftReportLines';
import { asRoleSpecifiersOfLinkedRefs } from './asRoleSpecifiersOfLinkedRefs';
import { getActorsDrift } from './getActorsDrift';

/**
 * .what = converge the linked roles to `.agent/actors.yml`, after the link pass: unlink each
 *         linked package role no actor declares, then report each change made
 * .why = the manifest is the one source of truth for which roles a repo links, so init acts on
 *        it itself rather than print a fix for a human to run
 *
 * .note = runs AFTER the link, so a declared role is linked by the time drift is read; a clean
 *         run prints `in sync` (rule.forbid.defective-defaults)
 * .note = only `.agent/repo=<pkg>/role=<role>` links are touched; a native `.this` role is the
 *         repo's own and never unlinked (`asRoleSpecifiersOfLinkedRefs` splits it out)
 * .note = an actor dir whose slug left the manifest is not touched nor named here;
 *         `rhx clone prune` owns its reap
 */
export const setActorsManifestConverged = async (
  input: {
    manifest: ActorsManifest;
    declared: { role: string; via: string | null }[];
    warnings: string[];
  },
  context: ContextCli,
): Promise<{ reportLines: string[] }> => {
  // declared vs linked, as the link pass left it
  const drift = getActorsDrift({
    declared: input.declared,
    ...asRoleSpecifiersOfLinkedRefs({
      refs: getAllLinkedRoleRefs({}, context),
    }),
  });

  // unlink each linked package role no actor declares
  const unlinked = await getRolesUnlinkedFromSlugs(
    { slugs: drift.extra },
    context,
  );

  // one line per change made
  const reportLines = asActorsDriftReportLines({
    ambient: input.manifest.ambient,
    countActors: input.manifest.actor.length,
    countRoles: input.declared.length,
    unlinked: unlinked.map((one) => `${one.repo}/${one.role}`),
    unlinkedDeclared: drift.short,
    warnings: input.warnings,
  });
  return { reportLines };
};
