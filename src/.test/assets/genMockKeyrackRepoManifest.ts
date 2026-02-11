import { KeyrackKeySpec, KeyrackRepoManifest } from '@src/domain.objects/keyrack';

/**
 * .what = generates a mock KeyrackRepoManifest for tests
 * .why = provides reusable fixture with sensible defaults
 */
export const genMockKeyrackRepoManifest = (input?: {
  org?: string;
  envs?: string[];
  keys?: Record<string, Partial<KeyrackKeySpec>>;
}): KeyrackRepoManifest => {
  const org = input?.org ?? 'testorg';
  const envs = input?.envs ?? [];
  const keys: Record<string, KeyrackKeySpec> = {};

  // populate keys from input, derive env and name from slug
  for (const [slug, partialSpec] of Object.entries(input?.keys ?? {})) {
    const slugParts = slug.split('.');
    const name = slugParts.length >= 3 ? slugParts.slice(2).join('.') : slug;
    const env = slugParts.length >= 3 ? slugParts[1]! : 'all';

    keys[slug] = new KeyrackKeySpec({
      slug,
      mech: partialSpec.mech ?? 'REPLICA',
      env: partialSpec.env ?? env,
      name: partialSpec.name ?? name,
      grade: partialSpec.grade ?? null,
    });
  }

  return new KeyrackRepoManifest({ org, envs, keys });
};
