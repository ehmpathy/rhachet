import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type { InvokeHooks } from '@src/domain.objects/InvokeHooks';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';
import type { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';

/**
 * .what = adds packageRoot to any type
 * .why = manifest paths are relative to package root; callers need both
 */
export type HasPackageRoot<T> = T & { packageRoot: string };

/**
 * .what = config portion of context for cli invocation
 * .why = enables just-in-time load; commands declare what they need
 *
 * .note = uses with-simple-cache for memoization across calls
 * .note = separates explicit (rhachet.use.ts) from implicit (rhachet.repo.yml) sources
 */
export interface ContextConfigOfUsage {
  config: {
    usage: {
      /**
       * .what = checks if explicit config file exists
       * .why = enables commands to branch on config presence
       *
       * .note = returns true if rhachet.use.ts found (via --config arg or cwd discovery)
       */
      isExplicit: () => boolean;

      /**
       * .what = returns explicit config path if available
       * .why = needed for isolated thread execution which spawns child processes
       *
       * .note = throws BadRequestError if isExplicit() is false
       */
      getExplicitPath: () => string;

      /**
       * .what = lazy getters for config resources
       * .why = load only what each command needs, when it needs it
       */
      get: {
        registries: {
          /**
           * .what = loads RoleRegistry[] from rhachet.use.ts
           * .why = provides full runtime Role objects with capabilities
           *
           * .note = throws BadRequestError if isExplicit() is false
           */
          explicit: () => Promise<{ registries: RoleRegistry[] }>;

          /**
           * .what = discovers manifests from installed packages with their roots
           * .why = enables link/init operations without rhachet.use.ts
           *
           * .note = always available (does not require rhachet.use.ts)
           * .note = returns packageRoot for path resolution of relative manifest paths
           * .note = returns errors for packages that lack rhachet.repo.yml
           */
          implicit: () => Promise<{
            manifests: HasPackageRoot<RoleRegistryManifest>[];
            errors: { packageName: string; error: Error }[];
          }>;
        };

        brains: {
          /**
           * .what = loads BrainRepl[] from rhachet.use.ts
           * .why = provides inference providers for ask/act commands
           *
           * .note = throws BadRequestError if isExplicit() is false
           */
          explicit: () => Promise<BrainRepl[]>;
        };

        hooks: {
          /**
           * .what = loads InvokeHooks from rhachet.use.ts
           * .why = enables input transformation before execution
           *
           * .note = throws BadRequestError if isExplicit() is false
           * .note = returns null if no hooks configured
           */
          explicit: () => Promise<InvokeHooks | null>;
        };
      };
    };
  };
}
