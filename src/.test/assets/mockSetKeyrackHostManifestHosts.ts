import { KeyrackHostManifest } from '@src/domain.objects/keyrack';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import type { setKeyrackHostManifestHosts as setKeyrackHostManifestHostsReal } from '@src/domain.operations/keyrack/setKeyrackHostManifestHosts';

/**
 * .what = an in-memory stand-in for `setKeyrackHostManifestHosts`, for unit tests
 * .why = the real op takes a host lock and re-reads the manifest from disk; a unit test holds its
 *   manifest on `context.hostManifest` alone, so the fake applies `mutate` there, with no fs touched
 * .note = it leaves `context.hostManifest` as given, so a context shared across `then` blocks reads
 *   the same manifest in each
 * .note = inject it via `context.boundaries`; `genMockKeyrackHostBoundaries` wires it with the other fakes
 */
export const setKeyrackHostManifestHosts: typeof setKeyrackHostManifestHostsReal =
  async (input, context: ContextKeyrack) => {
    const manifest = context.hostManifest!;
    const hostsNext = input.mutate({ hosts: manifest.hosts });
    if (!hostsNext) return { manifest, changed: false };
    const manifestNext = new KeyrackHostManifest({
      ...manifest,
      hosts: hostsNext,
    });
    return { manifest: manifestNext, changed: true };
  };
