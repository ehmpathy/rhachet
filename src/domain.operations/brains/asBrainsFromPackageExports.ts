import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';

/**
 * .what = extracts brain atoms + repls from a package's exports
 * .why  = brain packages export getBrainAtomsBy* and getBrainReplsBy* functions; this
 *         pure transformer walks the exports and collects the arrays each returns. it is
 *         exported (not inlined in getAvailableBrains) so both the unit test and the
 *         real-node acc#4 clamp probe can call the SAME function — no shadow-copy that
 *         could drift from the production contract.
 * .note = this transformer is deliberately fail-loud (rule.forbid.failhide): a
 *         getBrainAtomsBy* or getBrainReplsBy* collector that throws is a genuine defect
 *         in the brain package or our detection, so its error propagates. the intended
 *         fault-isolation boundary (acc#3: a bad package never sinks the registry) lives
 *         one level up in getBrainsFromPackageExports, which wraps this call — not here.
 */
export const asBrainsFromPackageExports = (input: {
  exports: Record<string, unknown>;
}): { atoms: BrainAtom[]; repls: BrainRepl[] } => {
  const atoms: BrainAtom[] = [];
  const repls: BrainRepl[] = [];

  for (const [key, value] of Object.entries(input.exports)) {
    // skip non-functions
    if (typeof value !== 'function') continue;

    // extract atoms from getBrainAtomsBy* functions
    if (key.startsWith('getBrainAtomsBy')) {
      const result = value();
      if (Array.isArray(result)) atoms.push(...result);
    }

    // extract repls from getBrainReplsBy* functions
    if (key.startsWith('getBrainReplsBy')) {
      const result = value();
      if (Array.isArray(result)) repls.push(...result);
    }
  }

  return { atoms, repls };
};
