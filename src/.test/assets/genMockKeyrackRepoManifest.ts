import { KeyrackKeySpec, KeyrackRepoManifest } from '@src/domain.objects/keyrack';

/**
 * .what = generates a mock KeyrackRepoManifest for tests
 * .why = provides reusable fixture with sensible defaults
 */
export const genMockKeyrackRepoManifest = (input?: {
  keys?: Record<string, Partial<KeyrackKeySpec>>;
}): KeyrackRepoManifest => {
  const keys: Record<string, KeyrackKeySpec> = {};

  // populate keys from input
  for (const [slug, partialSpec] of Object.entries(input?.keys ?? {})) {
    keys[slug] = new KeyrackKeySpec({
      slug,
      mech: partialSpec.mech ?? 'REPLICA',
    });
  }

  return new KeyrackRepoManifest({ keys });
};
