import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { given, then, when } from 'test-fns';

import { logoutAwsSsoSession } from './logoutAwsSsoSession';

// mock AWS SDK client (don't call real AWS)
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-sso', () => ({
  SSOClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  LogoutCommand: jest.fn().mockImplementation((input) => ({ input })),
}));
const mockSSOClient = jest.requireMock('@aws-sdk/client-sso')
  .SSOClient as jest.Mock;
const mockLogoutCommand = jest.requireMock('@aws-sdk/client-sso')
  .LogoutCommand as jest.Mock;

describe('logoutAwsSsoSession.integration', () => {
  const cacheDir = join(homedir(), '.aws', 'sso', 'cache');
  const testDomain = 'https://rhachet-logout-test.awsapps.com/start';
  const testFileName = 'rhachet-logout-integration-test.json';
  const testFilePath = join(cacheDir, testFileName);

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockReset();

    // ensure cache dir exists
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }
  });

  afterEach(() => {
    // cleanup test file if it exists
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  /**
   * positive: cache file with accessToken and region
   */
  given('[case1] cache file exists with accessToken and region', () => {
    beforeEach(() => {
      writeFileSync(
        testFilePath,
        JSON.stringify({
          startUrl: testDomain,
          accessToken: 'test-access-token-123',
          region: 'us-east-1',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        }),
      );
    });

    when('[t0] logoutAwsSsoSession is called', () => {
      then('calls SDK LogoutCommand with accessToken', async () => {
        await logoutAwsSsoSession({ ssoStartUrl: testDomain });

        expect(mockLogoutCommand).toHaveBeenCalledWith({
          accessToken: 'test-access-token-123',
        });
        expect(mockSend).toHaveBeenCalled();
      });

      then('creates SSOClient with correct region', async () => {
        await logoutAwsSsoSession({ ssoStartUrl: testDomain });

        expect(mockSSOClient).toHaveBeenCalledWith({ region: 'us-east-1' });
      });

      then('deletes local cache file', async () => {
        expect(existsSync(testFilePath)).toBe(true);

        const result = await logoutAwsSsoSession({ ssoStartUrl: testDomain });

        expect(existsSync(testFilePath)).toBe(false);
        expect(result.diskCache.deleted).toContain(testFileName);
      });
    });
  });

  /**
   * negative: cache file without accessToken
   */
  given('[case2] cache file exists without accessToken', () => {
    beforeEach(() => {
      writeFileSync(
        testFilePath,
        JSON.stringify({
          startUrl: testDomain,
          // no accessToken
          region: 'us-east-1',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        }),
      );
    });

    when('[t0] logoutAwsSsoSession is called', () => {
      then('skips SDK call', async () => {
        await logoutAwsSsoSession({ ssoStartUrl: testDomain });

        expect(mockSend).not.toHaveBeenCalled();
      });

      then('still deletes local cache file', async () => {
        expect(existsSync(testFilePath)).toBe(true);

        const result = await logoutAwsSsoSession({ ssoStartUrl: testDomain });

        expect(existsSync(testFilePath)).toBe(false);
        expect(result.diskCache.deleted).toContain(testFileName);
      });
    });
  });

  /**
   * negative: cache file without region
   */
  given('[case3] cache file exists without region', () => {
    beforeEach(() => {
      writeFileSync(
        testFilePath,
        JSON.stringify({
          startUrl: testDomain,
          accessToken: 'test-access-token-123',
          // no region
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        }),
      );
    });

    when('[t0] logoutAwsSsoSession is called', () => {
      then('skips SDK call', async () => {
        await logoutAwsSsoSession({ ssoStartUrl: testDomain });

        expect(mockSend).not.toHaveBeenCalled();
      });

      then('still deletes local cache file', async () => {
        expect(existsSync(testFilePath)).toBe(true);

        const result = await logoutAwsSsoSession({ ssoStartUrl: testDomain });

        expect(existsSync(testFilePath)).toBe(false);
        expect(result.diskCache.deleted).toContain(testFileName);
      });
    });
  });

  /**
   * negative: SDK call fails (expired token)
   */
  given('[case4] SDK LogoutCommand fails', () => {
    beforeEach(() => {
      writeFileSync(
        testFilePath,
        JSON.stringify({
          startUrl: testDomain,
          accessToken: 'expired-token',
          region: 'us-east-1',
          expiresAt: '2020-01-01T00:00:00Z', // expired
        }),
      );
      mockSend.mockRejectedValue(new Error('Token expired'));
    });

    when('[t0] logoutAwsSsoSession is called', () => {
      then('still deletes local cache file', async () => {
        expect(existsSync(testFilePath)).toBe(true);

        const result = await logoutAwsSsoSession({ ssoStartUrl: testDomain });

        expect(existsSync(testFilePath)).toBe(false);
        expect(result.diskCache.deleted).toContain(testFileName);
      });

      then('records server-logout skip reason', async () => {
        const result = await logoutAwsSsoSession({ ssoStartUrl: testDomain });

        expect(result.diskCache.skipped).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              file: testFileName,
              reason: expect.stringContaining('server-logout'),
            }),
          ]),
        );
      });
    });
  });

  /**
   * negative: no cache file for domain
   */
  given('[case5] no cache file exists for domain', () => {
    // don't create any test file

    when('[t0] logoutAwsSsoSession is called', () => {
      then('returns empty deleted array', async () => {
        const result = await logoutAwsSsoSession({ ssoStartUrl: testDomain });

        expect(result.diskCache.deleted).toHaveLength(0);
      });

      then('does not call SDK', async () => {
        await logoutAwsSsoSession({ ssoStartUrl: testDomain });

        expect(mockSend).not.toHaveBeenCalled();
      });
    });
  });

  /**
   * negative: cache file for different domain (should not be touched)
   */
  given('[case6] cache file exists for different domain', () => {
    const otherDomain = 'https://other-org.awsapps.com/start';

    beforeEach(() => {
      writeFileSync(
        testFilePath,
        JSON.stringify({
          startUrl: otherDomain, // different domain
          accessToken: 'other-token',
          region: 'us-west-2',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        }),
      );
    });

    when('[t0] logoutAwsSsoSession is called for target domain', () => {
      then('does not delete other domain cache file', async () => {
        expect(existsSync(testFilePath)).toBe(true);

        const result = await logoutAwsSsoSession({ ssoStartUrl: testDomain });

        expect(existsSync(testFilePath)).toBe(true);
        expect(result.diskCache.deleted).toHaveLength(0);
      });

      then('does not call SDK', async () => {
        await logoutAwsSsoSession({ ssoStartUrl: testDomain });

        expect(mockSend).not.toHaveBeenCalled();
      });
    });
  });
});
