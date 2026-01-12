import { BadRequestError } from 'helpful-errors';
import { getGitRepoRoot } from 'rhachet-artifact-git';

import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type { InvokeHooks } from '@src/domain.objects/InvokeHooks';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';
import type { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  ContextConfigOfUsage,
  HasPackageRoot,
} from './ContextConfigOfUsage';
import { getBrainsByConfigExplicit } from './getBrainsByConfigExplicit';
import { getHooksByConfigExplicit } from './getHooksByConfigExplicit';
import { getRegistriesByConfigExplicit } from './getRegistriesByConfigExplicit';
import { getRegistriesByConfigImplicit } from './getRegistriesByConfigImplicit';

/**
 * .what = extracts config path from cli args
 * .why = supports custom config location via --config flag
 *
 * .example
 *   npx rhachet ask --config ./custom/rhachet.use.ts
 *   npx rhachet roles link --config /abs/path/rhachet.use.ts
 */
const extractConfigPathFromArgs = (input: {
  args: string[];
}): string | null => {
  const configIndex = input.args.findIndex(
    (a) => a === '--config' || a === '-c',
  );
  if (configIndex === -1) return null;
  const configPath = input.args[configIndex + 1];
  if (!configPath || configPath.startsWith('-')) return null;
  return configPath;
};

/**
 * .what = resolves explicit config path
 * .why = checks --config arg first, falls back to git root discovery
 */
const resolveExplicitConfigPath = async (input: {
  args: string[];
  cwd: string;
}): Promise<string | null> => {
  // prefer --config <path> if provided
  const configPathFromArgs = extractConfigPathFromArgs({ args: input.args });
  if (configPathFromArgs) {
    const resolved = path.resolve(input.cwd, configPathFromArgs);
    if (fs.existsSync(resolved)) return resolved;
    return null;
  }

  // fall back to git root discovery
  const gitRoot = await getGitRepoRoot({ from: input.cwd });
  const configPathFromGitRoot = path.join(gitRoot, 'rhachet.use.ts');
  if (fs.existsSync(configPathFromGitRoot)) return configPathFromGitRoot;

  return null;
};

/**
 * .what = simple memoization wrapper
 * .why = ensures each getter is called at most once per context instance
 */
const memoize = <T>(fn: () => Promise<T>): (() => Promise<T>) => {
  let cached: Promise<T> | null = null;
  return () => {
    if (cached === null) cached = fn();
    return cached;
  };
};

/**
 * .what = creates context with config for the current invocation
 * .why = centralizes config resolution logic, enables just-in-time load
 *
 * .note = extracts --config <path> from args if present
 * .note = uses closure-based memoization for lazy getters
 */
export const genContextConfigOfUsage = async (input: {
  args: string[];
  cwd: string;
}): Promise<ContextConfigOfUsage> => {
  // resolve explicit config path once
  const explicitConfigPath = await resolveExplicitConfigPath({
    args: input.args,
    cwd: input.cwd,
  });

  // create memoized getters
  const getRegistriesExplicit = memoize(
    async (): Promise<{
      registries: RoleRegistry[];
    }> => {
      if (!explicitConfigPath) {
        throw new BadRequestError(
          'explicit config required but not found. create rhachet.use.ts or use --config',
        );
      }
      const registries = await getRegistriesByConfigExplicit({
        opts: { config: explicitConfigPath },
      });
      return { registries };
    },
  );

  const getRegistriesImplicit = memoize(
    async (): Promise<{
      manifests: HasPackageRoot<RoleRegistryManifest>[];
      errors: { packageName: string; error: Error }[];
    }> => {
      return getRegistriesByConfigImplicit({ from: input.cwd });
    },
  );

  const getBrainsExplicit = memoize(async (): Promise<BrainRepl[]> => {
    if (!explicitConfigPath) {
      throw new BadRequestError(
        'explicit config required but not found. create rhachet.use.ts or use --config',
      );
    }
    return getBrainsByConfigExplicit({ opts: { config: explicitConfigPath } });
  });

  const getHooksExplicit = memoize(async (): Promise<InvokeHooks | null> => {
    if (!explicitConfigPath) {
      throw new BadRequestError(
        'explicit config required but not found. create rhachet.use.ts or use --config',
      );
    }
    return getHooksByConfigExplicit({ opts: { config: explicitConfigPath } });
  });

  return {
    config: {
      usage: {
        isExplicit: () => explicitConfigPath !== null,
        getExplicitPath: () => {
          if (!explicitConfigPath) {
            throw new BadRequestError(
              'explicit config required but not found. create rhachet.use.ts or use --config',
            );
          }
          return explicitConfigPath;
        },
        get: {
          registries: {
            explicit: getRegistriesExplicit,
            implicit: getRegistriesImplicit,
          },
          brains: {
            explicit: getBrainsExplicit,
          },
          hooks: {
            explicit: getHooksExplicit,
          },
        },
      },
    },
  };
};
