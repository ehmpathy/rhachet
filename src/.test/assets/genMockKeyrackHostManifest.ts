import { KeyrackHostManifest, KeyrackKeyHost } from '@src/domain.objects/keyrack';

/**
 * .what = generates a mock KeyrackHostManifest for tests
 * .why = provides reusable fixture with sensible defaults
 */
export const genMockKeyrackHostManifest = (input?: {
  uri?: string;
  hosts?: Record<string, Partial<KeyrackKeyHost>>;
}): KeyrackHostManifest => {
  const hosts: Record<string, KeyrackKeyHost> = {};

  // populate hosts from input
  for (const [slug, partialHost] of Object.entries(input?.hosts ?? {})) {
    hosts[slug] = new KeyrackKeyHost({
      slug,
      mech: partialHost.mech ?? 'REPLICA',
      vault: partialHost.vault ?? 'os.direct',
      exid: partialHost.exid ?? null,
      createdAt: partialHost.createdAt ?? new Date().toISOString(),
      updatedAt: partialHost.updatedAt ?? new Date().toISOString(),
    });
  }

  return new KeyrackHostManifest({
    uri: input?.uri ?? 'file://~/.rhachet/keyrack.manifest.json',
    hosts,
  });
};
