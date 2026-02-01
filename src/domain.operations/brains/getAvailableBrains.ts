import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { genContextCli } from '@src/domain.objects/ContextCli';

import { discoverBrainPackages } from './discoverBrainPackages';
import { getBrainSlugFull } from './getBrainSlugFull';

/**
 * .what = discovers all brain atoms and repls from installed rhachet-brains-* packages
 * .why = enables skills to work with whatever brains users have installed
 */
export const getAvailableBrains = async (
  input?: {},
  context?: ContextCli,
): Promise<{ atoms: BrainAtom[]; repls: BrainRepl[] }> => {
  // resolve context (default: { cwd: process.cwd(), gitroot: resolved })
  const contextResolved =
    context ?? (await genContextCli({ cwd: process.cwd() }));

  // discover brain packages
  const packageNames = await discoverBrainPackages(contextResolved);

  // collect brains from each package
  const allAtoms: BrainAtom[] = [];
  const allRepls: BrainRepl[] = [];

  for (const packageName of packageNames) {
    const { atoms, repls } = await importBrainsFromPackage({ packageName });
    allAtoms.push(...atoms);
    allRepls.push(...repls);
  }

  // deduplicate by full slug (first wins)
  const atomsDeduped = dedupeBySlug(allAtoms);
  const replsDeduped = dedupeBySlug(allRepls);

  return { atoms: atomsDeduped, repls: replsDeduped };
};

/**
 * .what = dynamically imports a brain package and extracts brains
 * .why = enables runtime discovery without compile-time dependencies
 */
const importBrainsFromPackage = async (input: {
  packageName: string;
}): Promise<{ atoms: BrainAtom[]; repls: BrainRepl[] }> => {
  try {
    // dynamic import the package
    const packageExports = await import(input.packageName);

    // extract brains from exports
    return extractBrainsFromPackage({ exports: packageExports });
  } catch (error) {
    // skip invalid packages with a warn
    console.warn(
      `warn: could not import brain package "${input.packageName}":`,
      error instanceof Error ? error.message : error,
    );
    return { atoms: [], repls: [] };
  }
};

/**
 * .what = extracts brains from a package's exports
 * .why = brain packages export getBrainAtomsBy* and getBrainReplsBy* functions
 */
const extractBrainsFromPackage = (input: {
  exports: Record<string, unknown>;
}): { atoms: BrainAtom[]; repls: BrainRepl[] } => {
  const atoms: BrainAtom[] = [];
  const repls: BrainRepl[] = [];

  for (const [key, value] of Object.entries(input.exports)) {
    // skip non-functions
    if (typeof value !== 'function') continue;

    // extract atoms from getBrainAtomsBy* functions
    if (key.startsWith('getBrainAtomsBy')) {
      try {
        const result = value();
        if (Array.isArray(result)) {
          atoms.push(...result);
        }
      } catch (error) {
        console.warn(`warn: failed to call ${key}:`, error);
      }
    }

    // extract repls from getBrainReplsBy* functions
    if (key.startsWith('getBrainReplsBy')) {
      try {
        const result = value();
        if (Array.isArray(result)) {
          repls.push(...result);
        }
      } catch (error) {
        console.warn(`warn: failed to call ${key}:`, error);
      }
    }
  }

  return { atoms, repls };
};

/**
 * .what = deduplicates brains by full slug (first wins)
 * .why = handles edge case where same brain appears in multiple packages
 */
const dedupeBySlug = <T extends { repo: string; slug: string }>(
  brains: T[],
): T[] => {
  const slugsSeen = new Set<string>();
  return brains.filter((b) => {
    const key = getBrainSlugFull(b);
    if (slugsSeen.has(key)) return false;
    slugsSeen.add(key);
    return true;
  });
};
