import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type { InvokeHooks } from '@src/domain.objects/InvokeHooks';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';
import type { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';
import type {
  ContextConfigOfUsage,
  HasPackageRoot,
} from '@src/domain.operations/config/ContextConfigOfUsage';

/**
 * .what = creates a mock ContextConfigOfUsage for tests
 * .why = enables tests of command handlers without full config resolution
 */
export const genMockContextConfigOfUsage = (input?: {
  isExplicit?: boolean;
  explicitPath?: string;
  registries?: RoleRegistry[];
  manifestsWithRoots?: HasPackageRoot<RoleRegistryManifest>[];
  brains?: BrainRepl[];
  hooks?: InvokeHooks | null;
}): ContextConfigOfUsage => {
  const isExplicit = input?.isExplicit ?? false;
  const explicitPath = input?.explicitPath ?? '/mock/rhachet.use.ts';
  const registries = input?.registries ?? [];
  const manifestsWithRoots = input?.manifestsWithRoots ?? [];
  const brains = input?.brains ?? [];
  const hooks = input?.hooks ?? null;

  return {
    config: {
      usage: {
        isExplicit: () => isExplicit,
        getExplicitPath: () => {
          if (!isExplicit) {
            throw new Error(
              'explicit config required but not found. create rhachet.use.ts or use --config',
            );
          }
          return explicitPath;
        },
        get: {
          registries: {
            explicit: async () => ({ registries }),
            implicit: async () => ({ manifests: manifestsWithRoots, errors: [] }),
          },
          brains: {
            explicit: async () => brains,
          },
          hooks: {
            explicit: async () => hooks,
          },
        },
      },
    },
  };
};
