import { getError } from 'test-fns';

import { genMockKeyrackRepoManifest } from '@src/.test/assets/genMockKeyrackRepoManifest';

import { assertKeyrackEnvIsSpecified } from './assertKeyrackEnvIsSpecified';

describe('assertKeyrackEnvIsSpecified', () => {
  test('returns env when provided', () => {
    const manifest = genMockKeyrackRepoManifest({ envs: ['prod', 'prep'] });
    const result = assertKeyrackEnvIsSpecified({ manifest, env: 'prod' });
    expect(result).toEqual('prod');
  });

  test('returns "all" when no env-specific sections and env is null', () => {
    const manifest = genMockKeyrackRepoManifest({ envs: [] });
    const result = assertKeyrackEnvIsSpecified({ manifest, env: null });
    expect(result).toEqual('all');
  });

  test('throws when env-specific sections exist but env is null', async () => {
    const manifest = genMockKeyrackRepoManifest({ envs: ['prod', 'prep'] });
    const error = await getError(() =>
      assertKeyrackEnvIsSpecified({ manifest, env: null }),
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('--env is required');
    expect((error as Error).message).toContain('prod');
    expect((error as Error).message).toContain('prep');
  });

  test('returns "all" when env is explicitly "all"', () => {
    const manifest = genMockKeyrackRepoManifest({ envs: ['prod', 'prep'] });
    const result = assertKeyrackEnvIsSpecified({ manifest, env: 'all' });
    expect(result).toEqual('all');
  });
});
