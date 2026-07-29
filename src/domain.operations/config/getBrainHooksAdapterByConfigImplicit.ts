import { ConstraintError } from 'helpful-errors';

import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { discoverBrainPackages } from '@src/domain.operations/brains/discoverBrainPackages';
import { importPackageExports } from '@src/infra/importEsmSafe/importPackageExports';

/**
 * .what = looks up a brain hooks adapter via implicit discovery
 * .why = enables auto-detection of brain supplier packages
 *
 * .note = scans package.json for rhachet-brains-* packages
 * .note = calls getBrainHooks({ brain, repoPath }) on each
 * .note = throws if multiple adapters match (ambiguous)
 */
export const getBrainHooksAdapterByConfigImplicit = async (
  input: {
    brain: BrainSpecifier;
  },
  context: ContextCli,
): Promise<BrainHooksAdapter | null> => {
  // discover brain packages from package.json
  const brainPackages = await discoverBrainPackages(context);

  // collect adapters that match the requested brain
  const adaptersMatched: BrainHooksAdapter[] = [];

  // collect lookup failures for observability, tagged by the phase that faulted so the
  // message points the operator at the right layer — a package that loads fine but whose
  // getBrainHooks() throws is a use-phase fault, NOT a load fault, and must not read as one
  const resolutionFailures: Array<{
    packageName: string;
    phase: 'load' | 'use';
    error: Error;
  }> = [];

  for (const packageName of brainPackages) {
    // phase 1 — load the package (caller-rooted, esm-safe, isolated as a union) via the
    // shared importPackageExports leaf, the one resolution strategy across all load sites
    const loaded = await importPackageExports<{
      getBrainHooks?: (input: {
        brain: BrainSpecifier;
        repoPath: string;
      }) => BrainHooksAdapter | null;
    }>({
      packageName,
      fromPackageJson: `${context.cwd}/package.json`,
    });
    if (!loaded.ok) {
      resolutionFailures.push({
        packageName,
        phase: 'load',
        error: loaded.error,
      });
      continue;
    }

    // phase 2 — use the loaded module's getBrainHooks; a throw here is a use-phase fault
    // isolated to this package (not the load), so one bad package never sinks the rest
    try {
      // check if package exports getBrainHooks
      if (!loaded.module.getBrainHooks) continue;

      // call getBrainHooks to see if it supports this brain
      const adapter = loaded.module.getBrainHooks({
        brain: input.brain,
        repoPath: context.cwd,
      });
      if (adapter) {
        adaptersMatched.push(adapter);
      }
    } catch (error: unknown) {
      // collect the use-phase failure for stderr emission (package loaded, getBrainHooks threw)
      const err = error instanceof Error ? error : new Error(String(error));
      resolutionFailures.push({ packageName, phase: 'use', error: err });
    }
  }

  // emit lookup failures to stderr for observability, each with a phase-accurate message
  // so the operator is pointed at the true layer — load (import) vs use (getBrainHooks throw)
  // .note-channel = this site emits via console.error; its two package-load siblings differ by
  //   consumer BY DESIGN — getAvailableBrains/getBrainsFromPackageExports warn (console.warn, a
  //   discovery-orchestrator advisory), getLinkedRolesWithHooks returns structured errors[] (its
  //   caller owns presentation). the divergence is a deliberate per-consumer contract, not drift.
  if (resolutionFailures.length > 0) {
    for (const failure of resolutionFailures) {
      const message =
        failure.phase === 'load'
          ? `💥 brain package load failed: ${failure.packageName} — ${failure.error.message}`
          : `💥 brain hooks lookup failed (package loaded, getBrainHooks threw): ${failure.packageName} — ${failure.error.message}`;
      console.error(message);
    }
  }

  // handle results
  if (adaptersMatched.length === 0) {
    return null;
  }

  if (adaptersMatched.length === 1) {
    return adaptersMatched[0]!;
  }

  // multiple adapters matched — an ambiguous config the caller must fix (fail-loud with
  // context per rule.require.failloud): a ConstraintError, since the caller fixes it by
  // narrowing to one adapter, not the server
  throw new ConstraintError(
    `multiple brain hooks adapters matched for brain '${input.brain}': ${adaptersMatched.map((a) => a.slug).join(', ')}. specify explicit adapter.`,
    { brain: input.brain, adaptersMatched: adaptersMatched.map((a) => a.slug) },
  );
};
