import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { discoverBrainPackages } from '@src/domain.operations/brains/discoverBrainPackages';

import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

/**
 * .what = resolves a brain hooks adapter via implicit discovery
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

  // create require from repo root for package resolution
  const require = createRequire(`${context.cwd}/package.json`);

  // collect adapters that match the requested brain
  const adaptersMatched: BrainHooksAdapter[] = [];

  // collect resolution failures for observability
  const resolutionFailures: Array<{ packageName: string; error: Error }> = [];

  for (const packageName of brainPackages) {
    try {
      // resolve package path via package.json (handles file: references)
      const packageJsonPath = require.resolve(`${packageName}/package.json`);
      const packageRoot = dirname(packageJsonPath);

      // read package.json to find main entry
      const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent) as { main?: string };
      const mainEntry = packageJson.main ?? 'index.js';

      // dynamic import of the brain package's main entry
      const brainModule = (await import(`${packageRoot}/${mainEntry}`)) as {
        getBrainHooks?: (input: {
          brain: BrainSpecifier;
          repoPath: string;
        }) => BrainHooksAdapter | null;
      };

      // check if package exports getBrainHooks
      if (!brainModule.getBrainHooks) continue;

      // call getBrainHooks to see if it supports this brain
      const adapter = brainModule.getBrainHooks({
        brain: input.brain,
        repoPath: context.cwd,
      });
      if (adapter) {
        adaptersMatched.push(adapter);
      }
    } catch (error: unknown) {
      // collect failure for stderr emission
      const err = error instanceof Error ? error : new Error(String(error));
      resolutionFailures.push({ packageName, error: err });
    }
  }

  // emit resolution failures to stderr for observability
  if (resolutionFailures.length > 0) {
    for (const failure of resolutionFailures) {
      console.error(
        `⚠️ brain package resolution failed: ${failure.packageName} — ${failure.error.message}`,
      );
    }
  }

  // handle results
  if (adaptersMatched.length === 0) {
    return null;
  }

  if (adaptersMatched.length === 1) {
    return adaptersMatched[0]!;
  }

  // multiple adapters matched - ambiguous
  throw new Error(
    `multiple brain hooks adapters matched for brain '${input.brain}': ${adaptersMatched.map((a) => a.slug).join(', ')}. specify explicit adapter.`,
  );
};
