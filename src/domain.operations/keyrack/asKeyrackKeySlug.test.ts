import { getError, given, then, when } from 'test-fns';

import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack';

import { asKeyrackKeySlug } from './asKeyrackKeySlug';

/**
 * .what = mock manifest for test slug resolution
 */
const genMockManifest = (): KeyrackRepoManifest => ({
  org: 'ehmpathy',
  envs: ['test', 'prod'],
  keys: {
    'ehmpathy.test.AWS_PROFILE': {
      slug: 'ehmpathy.test.AWS_PROFILE',
      name: 'AWS_PROFILE',
      env: 'test',
      mech: 'EPHEMERAL_VIA_AWS_SSO',
      grade: null,
    },
    'ehmpathy.prod.AWS_PROFILE': {
      slug: 'ehmpathy.prod.AWS_PROFILE',
      name: 'AWS_PROFILE',
      env: 'prod',
      mech: 'EPHEMERAL_VIA_AWS_SSO',
      grade: null,
    },
    'ehmpathy.test.GITHUB_TOKEN': {
      slug: 'ehmpathy.test.GITHUB_TOKEN',
      name: 'GITHUB_TOKEN',
      env: 'test',
      mech: 'EPHEMERAL_VIA_GITHUB_APP',
      grade: null,
    },
  },
});

describe('asKeyrackKeySlug', () => {
  given('[case1] no manifest provided', () => {
    when('[t0] key is passed', () => {
      then('returns key as-is', () => {
        const result = asKeyrackKeySlug({
          key: 'AWS_PROFILE',
          env: null,
          manifest: null,
        });
        expect(result.slug).toEqual('AWS_PROFILE');
        expect(result.env).toBeNull();
      });
    });
  });

  given('[case2] key is already a full slug', () => {
    const manifest = genMockManifest();

    when('[t0] slug exists in manifest', () => {
      then('returns slug as-is', () => {
        const result = asKeyrackKeySlug({
          key: 'ehmpathy.test.AWS_PROFILE',
          env: null,
          manifest,
        });
        expect(result.slug).toEqual('ehmpathy.test.AWS_PROFILE');
      });
    });

    when('[t1] slug has org.env.key pattern', () => {
      then('returns slug as-is', () => {
        const result = asKeyrackKeySlug({
          key: 'ehmpathy.prep.SOME_KEY',
          env: null,
          manifest,
        });
        expect(result.slug).toEqual('ehmpathy.prep.SOME_KEY');
      });
    });
  });

  given('[case3] raw key name with --env provided', () => {
    const manifest = genMockManifest();

    when('[t0] env is specified', () => {
      then('constructs full slug from org.env.key', () => {
        const result = asKeyrackKeySlug({
          key: 'AWS_PROFILE',
          env: 'test',
          manifest,
        });
        expect(result.slug).toEqual('ehmpathy.test.AWS_PROFILE');
        expect(result.env).toEqual('test');
      });
    });
  });

  given('[case4] raw key name found in exactly one env', () => {
    const manifest = genMockManifest();

    when('[t0] GITHUB_TOKEN only exists in test env', () => {
      then('infers env and constructs full slug', () => {
        const result = asKeyrackKeySlug({
          key: 'GITHUB_TOKEN',
          env: null,
          manifest,
        });
        expect(result.slug).toEqual('ehmpathy.test.GITHUB_TOKEN');
        expect(result.env).toEqual('test');
      });
    });
  });

  given('[case5] raw key name found in multiple envs', () => {
    const manifest = genMockManifest();

    when('[t0] AWS_PROFILE exists in test and prod', () => {
      then('throws BadRequestError that asks for --env', async () => {
        const error = await getError(
          Promise.resolve().then(() =>
            asKeyrackKeySlug({
              key: 'AWS_PROFILE',
              env: null,
              manifest,
            }),
          ),
        );
        expect(error).toBeDefined();
        expect(error!.message).toContain('found in multiple envs');
        expect(error!.message).toContain('test');
        expect(error!.message).toContain('prod');
        expect(error!.message).toContain('--env');
      });
    });
  });

  given('[case6] raw key name not found in any env', () => {
    const manifest = genMockManifest();

    when('[t0] UNKNOWN_KEY does not exist', () => {
      then('returns key as-is (let downstream fail)', () => {
        const result = asKeyrackKeySlug({
          key: 'UNKNOWN_KEY',
          env: null,
          manifest,
        });
        expect(result.slug).toEqual('UNKNOWN_KEY');
        expect(result.env).toBeNull();
      });
    });
  });
});
