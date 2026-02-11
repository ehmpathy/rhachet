import { getError } from 'test-fns';

import { genMockKeyrackRepoManifest } from '@src/.test/assets/genMockKeyrackRepoManifest';

import { assertKeyrackOrgMatchesManifest } from './assertKeyrackOrgMatchesManifest';

describe('assertKeyrackOrgMatchesManifest', () => {
  const manifest = genMockKeyrackRepoManifest({ org: 'ehmpathy' });

  test('resolves @this to manifest org', () => {
    const result = assertKeyrackOrgMatchesManifest({ manifest, org: '@this' });
    expect(result).toEqual('ehmpathy');
  });

  test('passes exact match', () => {
    const result = assertKeyrackOrgMatchesManifest({
      manifest,
      org: 'ehmpathy',
    });
    expect(result).toEqual('ehmpathy');
  });

  test('throws on mismatch', async () => {
    const error = await getError(() =>
      assertKeyrackOrgMatchesManifest({ manifest, org: 'foreign-org' }),
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('foreign-org');
    expect((error as Error).message).toContain('ehmpathy');
  });
});
