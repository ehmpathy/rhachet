import { given, then, when } from 'test-fns';
import { clearAwsSsoCacheForDomain } from './clearAwsSsoCacheForDomain';
import { getAllAwsSsoCacheEntries } from './getAllAwsSsoCacheEntries';

// mock getAllAwsSsoCacheEntries
jest.mock('./getAllAwsSsoCacheEntries');
const mockGetAllEntries = getAllAwsSsoCacheEntries as jest.MockedFunction<
  typeof getAllAwsSsoCacheEntries
>;

// mock fs.unlinkSync
jest.mock('node:fs', () => ({
  unlinkSync: jest.fn(),
}));
const mockUnlinkSync = jest.requireMock('node:fs').unlinkSync as jest.Mock;

// mock AWS SDK client
jest.mock('@aws-sdk/client-sso', () => ({
  SSOClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  LogoutCommand: jest.fn().mockImplementation((input) => ({ input })),
}));
const mockSSOClient = jest.requireMock('@aws-sdk/client-sso')
  .SSOClient as jest.Mock;
const mockLogoutCommand = jest.requireMock('@aws-sdk/client-sso')
  .LogoutCommand as jest.Mock;

describe('clearAwsSsoCacheForDomain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * positive: cache files exist with accessToken and region
   */
  given('[case1] cache files exist with accessToken and region', () => {
    beforeEach(() => {
      mockGetAllEntries.mockReturnValue([
        {
          file: 'token-abc.json',
          filePath: '/home/.aws/sso/cache/token-abc.json',
          startUrl: 'https://acme.awsapps.com/start',
          accessToken: 'valid-token-123',
          region: 'us-east-1',
          expiresAt: '2026-01-01T00:00:00Z',
        },
      ]);
    });

    when('[t0] clearAwsSsoCacheForDomain is called', () => {
      then('calls SDK LogoutCommand with accessToken', async () => {
        const mockSend = jest.fn();
        mockSSOClient.mockImplementation(() => ({ send: mockSend }));

        await clearAwsSsoCacheForDomain({
          ssoStartUrl: 'https://acme.awsapps.com/start',
        });

        // verify LogoutCommand was called with accessToken
        expect(mockLogoutCommand).toHaveBeenCalledWith({
          accessToken: 'valid-token-123',
        });
        expect(mockSend).toHaveBeenCalled();
      });

      then('creates SSOClient with correct region', async () => {
        mockSSOClient.mockImplementation(() => ({ send: jest.fn() }));

        await clearAwsSsoCacheForDomain({
          ssoStartUrl: 'https://acme.awsapps.com/start',
        });

        expect(mockSSOClient).toHaveBeenCalledWith({ region: 'us-east-1' });
      });

      then('deletes local cache file after server-side logout', async () => {
        mockSSOClient.mockImplementation(() => ({ send: jest.fn() }));

        const result = await clearAwsSsoCacheForDomain({
          ssoStartUrl: 'https://acme.awsapps.com/start',
        });

        expect(mockUnlinkSync).toHaveBeenCalledWith(
          '/home/.aws/sso/cache/token-abc.json',
        );
        expect(result.deleted).toContain('token-abc.json');
      });
    });
  });

  /**
   * negative: cache file has no accessToken
   */
  given('[case2] cache file has no accessToken', () => {
    beforeEach(() => {
      mockGetAllEntries.mockReturnValue([
        {
          file: 'token-no-access.json',
          filePath: '/home/.aws/sso/cache/token-no-access.json',
          startUrl: 'https://acme.awsapps.com/start',
          accessToken: undefined,
          region: 'us-east-1',
          expiresAt: '2026-01-01T00:00:00Z',
        },
      ]);
    });

    when('[t0] clearAwsSsoCacheForDomain is called', () => {
      then('skips server-side logout', async () => {
        const mockSend = jest.fn();
        mockSSOClient.mockImplementation(() => ({ send: mockSend }));

        await clearAwsSsoCacheForDomain({
          ssoStartUrl: 'https://acme.awsapps.com/start',
        });

        // verify LogoutCommand was NOT called
        expect(mockSend).not.toHaveBeenCalled();
      });

      then('still deletes local cache file', async () => {
        mockSSOClient.mockImplementation(() => ({ send: jest.fn() }));

        const result = await clearAwsSsoCacheForDomain({
          ssoStartUrl: 'https://acme.awsapps.com/start',
        });

        expect(mockUnlinkSync).toHaveBeenCalledWith(
          '/home/.aws/sso/cache/token-no-access.json',
        );
        expect(result.deleted).toContain('token-no-access.json');
      });
    });
  });

  /**
   * negative: cache file has no region
   */
  given('[case3] cache file has no region', () => {
    beforeEach(() => {
      mockGetAllEntries.mockReturnValue([
        {
          file: 'token-no-region.json',
          filePath: '/home/.aws/sso/cache/token-no-region.json',
          startUrl: 'https://acme.awsapps.com/start',
          accessToken: 'valid-token-123',
          region: undefined,
          expiresAt: '2026-01-01T00:00:00Z',
        },
      ]);
    });

    when('[t0] clearAwsSsoCacheForDomain is called', () => {
      then('skips server-side logout', async () => {
        const mockSend = jest.fn();
        mockSSOClient.mockImplementation(() => ({ send: mockSend }));

        await clearAwsSsoCacheForDomain({
          ssoStartUrl: 'https://acme.awsapps.com/start',
        });

        // verify LogoutCommand was NOT called
        expect(mockSend).not.toHaveBeenCalled();
      });

      then('still deletes local cache file', async () => {
        mockSSOClient.mockImplementation(() => ({ send: jest.fn() }));

        const result = await clearAwsSsoCacheForDomain({
          ssoStartUrl: 'https://acme.awsapps.com/start',
        });

        expect(mockUnlinkSync).toHaveBeenCalledWith(
          '/home/.aws/sso/cache/token-no-region.json',
        );
        expect(result.deleted).toContain('token-no-region.json');
      });
    });
  });

  /**
   * negative: server-side logout fails
   */
  given('[case4] server-side logout fails', () => {
    beforeEach(() => {
      mockGetAllEntries.mockReturnValue([
        {
          file: 'token-expired.json',
          filePath: '/home/.aws/sso/cache/token-expired.json',
          startUrl: 'https://acme.awsapps.com/start',
          accessToken: 'expired-token',
          region: 'us-east-1',
          expiresAt: '2020-01-01T00:00:00Z',
        },
      ]);
    });

    when('[t0] SDK LogoutCommand throws', () => {
      then('still deletes local cache file', async () => {
        const mockSend = jest.fn().mockRejectedValue(new Error('Token expired'));
        mockSSOClient.mockImplementation(() => ({ send: mockSend }));

        const result = await clearAwsSsoCacheForDomain({
          ssoStartUrl: 'https://acme.awsapps.com/start',
        });

        // file should still be deleted
        expect(mockUnlinkSync).toHaveBeenCalledWith(
          '/home/.aws/sso/cache/token-expired.json',
        );
        expect(result.deleted).toContain('token-expired.json');
      });

      then('records server-logout skip reason', async () => {
        const mockSend = jest.fn().mockRejectedValue(new Error('Token expired'));
        mockSSOClient.mockImplementation(() => ({ send: mockSend }));

        const result = await clearAwsSsoCacheForDomain({
          ssoStartUrl: 'https://acme.awsapps.com/start',
        });

        expect(result.skipped).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              file: 'token-expired.json',
              reason: expect.stringContaining('server-logout'),
            }),
          ]),
        );
      });
    });
  });

  /**
   * negative: no cache files for domain
   */
  given('[case5] no cache files exist for domain', () => {
    beforeEach(() => {
      mockGetAllEntries.mockReturnValue([
        {
          file: 'other-domain.json',
          filePath: '/home/.aws/sso/cache/other-domain.json',
          startUrl: 'https://other.awsapps.com/start',
          accessToken: 'other-token',
          region: 'us-west-2',
          expiresAt: '2026-01-01T00:00:00Z',
        },
      ]);
    });

    when('[t0] clearAwsSsoCacheForDomain is called', () => {
      then('returns empty deleted array', async () => {
        const result = await clearAwsSsoCacheForDomain({
          ssoStartUrl: 'https://acme.awsapps.com/start',
        });

        expect(result.deleted).toHaveLength(0);
      });

      then('does not call SDK LogoutCommand', async () => {
        const mockSend = jest.fn();
        mockSSOClient.mockImplementation(() => ({ send: mockSend }));

        await clearAwsSsoCacheForDomain({
          ssoStartUrl: 'https://acme.awsapps.com/start',
        });

        expect(mockSend).not.toHaveBeenCalled();
      });

      then('does not delete any files', async () => {
        await clearAwsSsoCacheForDomain({
          ssoStartUrl: 'https://acme.awsapps.com/start',
        });

        expect(mockUnlinkSync).not.toHaveBeenCalled();
      });
    });
  });

  /**
   * negative: cache file has parse error
   */
  given('[case6] cache file has parse error', () => {
    beforeEach(() => {
      mockGetAllEntries.mockReturnValue([
        {
          file: 'corrupt.json',
          filePath: '/home/.aws/sso/cache/corrupt.json',
          parseError: 'Unexpected token',
        },
      ]);
    });

    when('[t0] clearAwsSsoCacheForDomain is called', () => {
      then('skips corrupt file with parse reason', async () => {
        const result = await clearAwsSsoCacheForDomain({
          ssoStartUrl: 'https://acme.awsapps.com/start',
        });

        expect(result.skipped).toEqual([
          {
            file: 'corrupt.json',
            reason: 'parse: Unexpected token',
          },
        ]);
      });

      then('does not delete corrupt file', async () => {
        await clearAwsSsoCacheForDomain({
          ssoStartUrl: 'https://acme.awsapps.com/start',
        });

        expect(mockUnlinkSync).not.toHaveBeenCalled();
      });
    });
  });
});
