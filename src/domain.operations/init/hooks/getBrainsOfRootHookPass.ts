import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';

import { isBrainClaudeCode } from './isBrainClaudeCode';

/**
 * .what = the brains the root hook pass writes into: every brain, save claude under a manifest
 * .why = under `.agent/actors.yml` the repo actor is a declared actor, narrowed to its own roles
 *        by the actor pass, so a root write of the whole union into its claude file would hand
 *        its clones a peer's hooks (inventory.of=requirements.case=9)
 */
export const getBrainsOfRootHookPass = (input: {
  brains: BrainSpecifier[];
  isManifestDeclared: boolean;
}): BrainSpecifier[] => {
  // no manifest: the root pass writes every brain, as on main
  if (!input.isManifestDeclared) return input.brains;

  // a manifest: claude is the actor pass's to write
  return input.brains.filter((brain) => !isBrainClaudeCode({ brain }));
};
