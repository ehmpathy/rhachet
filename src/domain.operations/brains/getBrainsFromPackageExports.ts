import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';

import { asBrainsFromPackageExports } from './asBrainsFromPackageExports';

/**
 * .what = gets brains from a loaded package's exports; tolerates a bad package
 * .why  = acc#3 fault isolation — a third-party package whose collectors throw when
 *         called must degrade to empty (with a phase-tagged warn) so it never aborts
 *         discovery of the other packages. this is the package-boundary catch that
 *         asBrainsFromPackageExports (pure, fail-loud) deliberately does not hold.
 * .note = the catch is scoped to the extract phase and phase-tagged ("extract brains
 *         from") to stay distinct from the load-phase isolation (the shared
 *         importPackageExports leaf) that getAvailableBrains applies before this
 *         (rule.forbid.failhide). the shared load half across the three sites
 *         (getAvailableBrains, getLinkedRolesWithHooks, getBrainHooksAdapterByConfigImplicit)
 *         is now the one importPackageExports leaf; the presentation of a fault stays
 *         per-caller. the emoji is unified (💥 malfunction) across the console-emitting sites
 *         (this one + getAvailableBrains use console.warn, getBrainHooksAdapterByConfigImplicit
 *         uses console.error); getLinkedRolesWithHooks returns a structured errors[] as its
 *         contract. the channel differs by each site's contract, the vocabulary does not.
 *         asBrainsFromPackageExports itself stays pure and is unit-tested on its own.
 */
export const getBrainsFromPackageExports = (input: {
  exports: Record<string, unknown>;
  packageName: string;
}): { atoms: BrainAtom[]; repls: BrainRepl[] } => {
  try {
    return asBrainsFromPackageExports({ exports: input.exports });
  } catch (error) {
    // isolate a bad package: warn (💥 malfunction, phase-tagged) and degrade to empty
    console.warn(
      `💥 could not extract brains from package "${input.packageName}": ${error instanceof Error ? error.message : String(error)}`,
    );
    return { atoms: [], repls: [] };
  }
};
