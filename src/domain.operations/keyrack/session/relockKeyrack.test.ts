import { given, then, when } from 'test-fns';

import { relockKeyrack } from './relockKeyrack';

// mock the daemon interactions to avoid socket access in unit tests
const mockDaemonAccessRelock = jest.fn();
jest.mock('../daemon/sdk', () => ({
  daemonAccessRelock: (...args: unknown[]) => mockDaemonAccessRelock(...args),
}));

// mock the daemon socket path
jest.mock('../daemon/infra/getKeyrackDaemonSocketPath', () => ({
  getKeyrackDaemonSocketPath: jest
    .fn()
    .mockReturnValue('/tmp/keyrack.test.sock'),
}));

describe('relockKeyrack', () => {
  beforeEach(() => {
    mockDaemonAccessRelock.mockReset();
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
      then('both are passed to daemon (daemon decides priority)', async () => {
        mockDaemonAccessRelock.mockResolvedValue({ relocked: ['KEY_A'] });

        const result = await relockKeyrack({ slugs: ['KEY_A'], env: 'sudo' });

        expect(mockDaemonAccessRelock).toHaveBeenCalledWith({
          socketPath: '/tmp/keyrack.test.sock',
          slugs: ['KEY_A'],
          env: 'sudo',
        });
        expect(result.relocked).toEqual(['KEY_A']);
      });
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
});
