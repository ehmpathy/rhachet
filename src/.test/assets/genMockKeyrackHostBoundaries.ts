import { setKeyrackHostManifestHosts } from './mockSetKeyrackHostManifestHosts';

/**
 * .what = in-memory fakes for the host-state boundaries a keyrack set or del writes through
 * .why = a unit test injects these via `context.boundaries`, so no fs, daemon socket, inventory,
 *   or keyrack.yml is touched, and no module is jest.mock'd
 * .note = each dao and daemon fake is a `jest.fn`, so a test asserts on the calls it received
 * .note = gen one per `given` (or clear it in a `beforeEach`), so calls do not leak across cases
 */
export const genMockKeyrackHostBoundaries = () => ({
  setKeyrackHostManifestHosts,
  daemonAccessRelock: jest.fn().mockResolvedValue({ relocked: [] }),
  daoKeyrackInventory: {
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  },
  daoKeyrackRepoManifest: {
    set: { findsertKeyToEnv: jest.fn().mockResolvedValue(undefined) },
    del: { keyFromEnv: jest.fn().mockResolvedValue(undefined) },
  },
});
