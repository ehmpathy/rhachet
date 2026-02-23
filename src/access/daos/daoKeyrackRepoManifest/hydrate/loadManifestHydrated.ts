import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack';

import { hydrateKeyrackRepoManifest } from './hydrateKeyrackRepoManifest';
import { loadManifestExplicit } from './loadManifestExplicit';

/**
 * .what = loads keyrack manifest from file path with full extends resolution
 * .why = entry point for recursive extends loading; wraps file I/O + hydration
 */
export const loadManifestHydrated = (
  input: {
    path: string;
  },
  context: {
    gitroot: string;
  },
): KeyrackRepoManifest | null => {
  // load explicit manifest (raw yaml without extends resolution)
  const explicit = loadManifestExplicit({ path: input.path });
  if (!explicit) return null;

  // hydrate with extends resolution
  return hydrateKeyrackRepoManifest(
    {
      explicit,
      manifestPath: input.path,
      visited: new Set<string>(),
    },
    context,
  );
};
