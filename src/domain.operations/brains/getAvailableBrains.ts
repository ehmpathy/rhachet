import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { genContextCli } from '@src/domain.objects/ContextCli';
import { importPackageExports } from '@src/infra/importEsmSafe/importPackageExports';

import { asBrainsDeduped } from './asBrainsDeduped';
import { discoverBrainPackages } from './discoverBrainPackages';
import { getBrainsFromPackageExports } from './getBrainsFromPackageExports';

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

  // the caller repo's package.json — every brain dep is resolved from here, the same
  // root discoverBrainPackages read the dep list from (one uniform resolution strategy)
  const fromPackageJson = `${contextResolved.cwd}/package.json`;

  // collect brains from each package
  const allAtoms: BrainAtom[] = [];
  const allRepls: BrainRepl[] = [];

  for (const packageName of packageNames) {
    const { atoms, repls } = await importBrainsFromPackage({
      packageName,
      fromPackageJson,
    });
    allAtoms.push(...atoms);
    allRepls.push(...repls);
  }

  // deduplicate by full slug (first wins)
  const atomsDeduped = asBrainsDeduped({ brains: allAtoms });
  const replsDeduped = asBrainsDeduped({ brains: allRepls });

  return { atoms: atomsDeduped, repls: replsDeduped };
};

/**
 * .what = loads a brain package and extracts its brains, in two isolated phases
 * .why = enables runtime discovery without compile-time dependencies, and keeps acc#3
 *        fault isolation split across the two distinct fault boundaries below.
 * .note = phase 1 (load) is isolated by the shared importPackageExports leaf (returns a
 *        { ok: false } union on any load failure). phase 2 (extract) is isolated separately
 *        by getBrainsFromPackageExports, which runs OUTSIDE the load boundary — so a bug in
 *        our own asBrainsFromPackageExports fails loud rather than hidden under a "bad
 *        package" warn (rule.forbid.failhide).
 */
const importBrainsFromPackage = async (input: {
  packageName: string;
  fromPackageJson: string;
}): Promise<{ atoms: BrainAtom[]; repls: BrainRepl[] }> => {
  // phase 1 — load the third-party package (caller-rooted, esm-safe, isolated as a union)
  const loaded = await importPackageExports<Record<string, unknown>>({
    packageName: input.packageName,
    fromPackageJson: input.fromPackageJson,
  });
  if (!loaded.ok) {
    // isolate a bad package: warn (💥 malfunction) and degrade to empty
    console.warn(
      `💥 could not load brain package "${input.packageName}": ${loaded.error.message}`,
    );
    return { atoms: [], repls: [] };
  }

  // phase 2 — extract brains at the extract boundary; empty if this package's
  //   collectors throw, so one bad package never sinks discovery of the rest (acc#3)
  return getBrainsFromPackageExports({
    exports: loaded.module,
    packageName: input.packageName,
  });
};
