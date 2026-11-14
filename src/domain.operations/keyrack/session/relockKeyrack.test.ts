import { given, then, when } from 'test-fns';

import { relockKeyrack } from './relockKeyrack';

// mock the daemon interactions to avoid socket access in unit tests
const mockDaemonAccessRelock = jest.fn();
const mockDaemonAccessGet = jest.fn();
const mockDaemonAccessStatus = jest.fn();
jest.mock('../daemon/sdk', () => ({
  daemonAccessRelock: (...args: unknown[]) => mockDaemonAccessRelock(...args),
  daemonAccessGet: (...args: unknown[]) => mockDaemonAccessGet(...args),
  daemonAccessStatus: (...args: unknown[]) => mockDaemonAccessStatus(...args),
}));

/**
 * .mock = delAwsProfileExport, as a spy
 * .why = the drop is disk; a unit case asserts only which profiles the relock drops
 * .real = genAwsProfileExport.integration.test.ts [case14] proves the drop on disk, and the
 *   acceptance keyrack.vault.awsIamSso [case20] proves `rhx keyrack relock` drops the cache
 */
const mockDelAwsProfileExport = jest.fn();
jest.mock('../adapters/mechanisms/aws.sso/delAwsProfileExport', () => ({
  delAwsProfileExport: (...args: unknown[]) => mockDelAwsProfileExport(...args),
}));

/**
 * .what = a held grant row as the daemon GET returns it
 */
const asHeldRow = (input: { slug: string; vault: string; secret: string }) => ({
  slug: input.slug,
  key: { secret: input.secret, grade: null },
  source: { vault: input.vault, mech: 'PERMANENT_VIA_REPLICA' },
  env: 'test',
  org: 'acme',
  expiresAt: '2099-01-01T00:00:00.000Z',
});

// mock the daemon socket path
jest.mock('../daemon/infra/getKeyrackDaemonSocketPath', () => ({
  getKeyrackDaemonSocketPath: jest
    .fn()
    .mockReturnValue('/tmp/keyrack.test.sock'),
}));

describe('relockKeyrack', () => {
  beforeEach(() => {
    mockDaemonAccessRelock.mockReset();
    mockDaemonAccessGet.mockReset();
    mockDaemonAccessStatus.mockReset();
    mockDelAwsProfileExport.mockReset();
    // default: the daemon holds no grant
    mockDaemonAccessGet.mockResolvedValue({ keys: [] });
    mockDaemonAccessStatus.mockResolvedValue({ keys: [] });
  });

  given('[case1] bare relock (no filters)', () => {
    when('[t0] relock called without slugs or env', () => {
      then('passes no filters to daemon', async () => {
        mockDaemonAccessRelock.mockResolvedValue({
          relocked: ['KEY_A', 'KEY_B'],
        });

        const result = await relockKeyrack({});

        expect(mockDaemonAccessRelock).toHaveBeenCalledWith({
          socketPath: '/tmp/keyrack.test.sock',
          slugs: undefined,
          env: undefined,
        });
        expect(result.relocked.sort()).toEqual(['KEY_A', 'KEY_B']);
      });
    });
  });

  given('[case2] env filter', () => {
    when('[t0] relock called with env=sudo', () => {
      then('passes env filter to daemon', async () => {
        mockDaemonAccessRelock.mockResolvedValue({ relocked: ['SUDO_KEY'] });

        const result = await relockKeyrack({ env: 'sudo' });

        expect(mockDaemonAccessRelock).toHaveBeenCalledWith({
          socketPath: '/tmp/keyrack.test.sock',
          slugs: undefined,
          env: 'sudo',
        });
        expect(result.relocked).toEqual(['SUDO_KEY']);
      });
    });
  });

  given('[case3] slugs filter', () => {
    when('[t0] relock called with specific slugs', () => {
      then('passes slugs to daemon', async () => {
        mockDaemonAccessRelock.mockResolvedValue({ relocked: ['KEY_A'] });

        const result = await relockKeyrack({ slugs: ['KEY_A'] });

        expect(mockDaemonAccessRelock).toHaveBeenCalledWith({
          socketPath: '/tmp/keyrack.test.sock',
          slugs: ['KEY_A'],
          env: undefined,
        });
        expect(result.relocked).toEqual(['KEY_A']);
      });
    });
  });

  given('[case4] slugs take priority over env', () => {
    when('[t0] relock called with both slugs and env', () => {
      // the priority is resolved HERE, at the call site, never handed down as an ambiguous
      // pair for the daemon to unpick. the sdk's input is a union — a slug ask and an env
      // sweep are two shapes — so a `{ slugs, env }` bag is unrepresentable by construction
      then(
        'only the slugs ask reaches the daemon — env is dropped',
        async () => {
          mockDaemonAccessRelock.mockResolvedValue({ relocked: ['KEY_A'] });

          const result = await relockKeyrack({ slugs: ['KEY_A'], env: 'sudo' });

          expect(mockDaemonAccessRelock).toHaveBeenCalledWith({
            socketPath: '/tmp/keyrack.test.sock',
            slugs: ['KEY_A'],
          });
          expect(result.relocked).toEqual(['KEY_A']);
        },
      );

      // the clamp that bites: `toHaveBeenCalledWith` treats an absent key and an `undefined`
      // one alike, so the assertion above cannot tell "env dropped" from "env: undefined".
      // read the recorded call directly, where the difference is visible
      then(
        'the env key is absent from the payload, not merely undefined',
        async () => {
          mockDaemonAccessRelock.mockResolvedValue({ relocked: ['KEY_A'] });

          await relockKeyrack({ slugs: ['KEY_A'], env: 'sudo' });

          const payload = mockDaemonAccessRelock.mock.calls[0]![0];
          expect(Object.keys(payload)).not.toContain('env');
        },
      );
    });
  });

  given('[case5] daemon not reachable', () => {
    when('[t0] daemon returns null', () => {
      then('returns empty relocked array', async () => {
        mockDaemonAccessRelock.mockResolvedValue(null);

        const result = await relockKeyrack({});

        expect(result.relocked).toEqual([]);
      });
    });
  });

  given('[case6] owner-based socket path', () => {
    when('[t0] relock called with owner', () => {
      then('passes owner to socket path resolver', async () => {
        const getKeyrackDaemonSocketPath = jest.requireMock(
          '../daemon/infra/getKeyrackDaemonSocketPath',
        ).getKeyrackDaemonSocketPath;
        getKeyrackDaemonSocketPath.mockReturnValue(
          '/tmp/keyrack.daemon.mechanic.sock',
        );
        mockDaemonAccessRelock.mockResolvedValue({ relocked: [] });

        await relockKeyrack({ owner: 'mechanic' });

        expect(getKeyrackDaemonSocketPath).toHaveBeenCalledWith({
          owner: 'mechanic',
        });
        expect(mockDaemonAccessRelock).toHaveBeenCalledWith({
          socketPath: '/tmp/keyrack.daemon.mechanic.sock',
          slugs: undefined,
          env: undefined,
        });
      });
    });
  });

  given('[case7] held aws.config keys point at cached aws exports', () => {
    when('[t0] a slug relock purges an aws.config key and a peer key', () => {
      then(
        "it drops the aws.config key's export by its profile, and no other",
        async () => {
          mockDaemonAccessGet.mockResolvedValue({
            keys: [
              asHeldRow({
                slug: 'acme.test.AWS_PROFILE',
                vault: 'aws.config',
                secret: 'acme-test',
              }),
              asHeldRow({
                slug: 'acme.test.API_KEY',
                vault: 'os.secure',
                secret: 'not-a-profile',
              }),
            ],
          });
          mockDaemonAccessRelock.mockResolvedValue({
            relocked: ['acme.test.AWS_PROFILE', 'acme.test.API_KEY'],
          });

          await relockKeyrack({
            slugs: ['acme.test.AWS_PROFILE', 'acme.test.API_KEY'],
          });

          expect(mockDaemonAccessGet.mock.calls[0]![0]).toMatchObject({
            slugs: ['acme.test.AWS_PROFILE', 'acme.test.API_KEY'],
          });
          expect(mockDelAwsProfileExport.mock.calls).toEqual([
            [{ profile: 'acme-test' }],
          ]);
        },
      );
    });

    when('[t1] an env sweep purges the held keys of one env', () => {
      then(
        'it reads the held slugs of that env, and drops their exports',
        async () => {
          mockDaemonAccessStatus.mockResolvedValue({
            keys: [
              { slug: 'acme.test.AWS_PROFILE', env: 'test', org: 'acme' },
              { slug: 'acme.prod.AWS_PROFILE', env: 'prod', org: 'acme' },
            ],
          });
          mockDaemonAccessGet.mockResolvedValue({
            keys: [
              asHeldRow({
                slug: 'acme.test.AWS_PROFILE',
                vault: 'aws.config',
                secret: 'acme-test',
              }),
            ],
          });
          mockDaemonAccessRelock.mockResolvedValue({
            relocked: ['acme.test.AWS_PROFILE'],
          });

          await relockKeyrack({ env: 'test' });

          expect(mockDaemonAccessGet.mock.calls[0]![0]).toMatchObject({
            slugs: ['acme.test.AWS_PROFILE'],
          });
          expect(mockDelAwsProfileExport.mock.calls).toEqual([
            [{ profile: 'acme-test' }],
          ]);
        },
      );
    });

    when(
      '[t2] the held grant answers for a slug the relock did not purge (an env=all fallback)',
      () => {
        then('it drops no export', async () => {
          mockDaemonAccessGet.mockResolvedValue({
            keys: [
              asHeldRow({
                slug: 'acme.all.AWS_PROFILE',
                vault: 'aws.config',
                secret: 'acme-all',
              }),
            ],
          });
          mockDaemonAccessRelock.mockResolvedValue({ relocked: [] });

          await relockKeyrack({ slugs: ['acme.test.AWS_PROFILE'] });

          expect(mockDelAwsProfileExport).not.toHaveBeenCalled();
        });
      },
    );

    when('[t3] the daemon is not reachable', () => {
      then('it drops no export and relocks naught', async () => {
        mockDaemonAccessGet.mockResolvedValue(null);
        mockDaemonAccessStatus.mockResolvedValue(null);
        mockDaemonAccessRelock.mockResolvedValue(null);

        const result = await relockKeyrack({});

        expect(result.relocked).toEqual([]);
        expect(mockDelAwsProfileExport).not.toHaveBeenCalled();
      });
    });
  });
});
