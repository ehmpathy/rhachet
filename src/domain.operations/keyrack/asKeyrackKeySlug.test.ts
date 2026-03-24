import { BadRequestError, getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack';

import { asKeyrackKeySlug } from './asKeyrackKeySlug';

/**
 * .what = mock manifest for test slug operations
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
  given('[case1] key is a full slug', () => {
    const manifest = genMockManifest();

    when('[t0] slug exists in manifest', () => {
      then('returns slug as-is with env extracted', () => {
        const result = asKeyrackKeySlug({
          key: 'ehmpathy.test.AWS_PROFILE',
          env: null,
          manifest,
        });
        expect(result.slug).toEqual('ehmpathy.test.AWS_PROFILE');
        expect(result.env).toEqual('test');
      });
    });

    when('[t1] slug has valid org.env.key pattern but not in manifest', () => {
      then('returns slug as-is with env extracted', () => {
        const result = asKeyrackKeySlug({
          key: 'ehmpathy.prep.SOME_KEY',
          env: null,
          manifest,
        });
        expect(result.slug).toEqual('ehmpathy.prep.SOME_KEY');
        expect(result.env).toEqual('prep');
      });
    });

    when('[t2] slug org does not match manifest org', () => {
      then('throws BadRequestError with ORG_MISMATCH code', async () => {
        const error = await getError(
          Promise.resolve().then(() =>
            asKeyrackKeySlug({
              key: 'other-org.test.SOME_KEY',
              env: null,
              manifest,
            }),
          ),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error!.message).toContain('other-org');
        expect(error!.message).toContain('ehmpathy');
        expect(error!.message).toContain('ORG_MISMATCH');
      });
    });

    when('[t3] --env conflicts with slug env', () => {
      then('throws BadRequestError with ENV_CONFLICT code', async () => {
        const error = await getError(
          Promise.resolve().then(() =>
            asKeyrackKeySlug({
              key: 'ehmpathy.test.AWS_PROFILE',
              env: 'prod',
              manifest,
            }),
          ),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error!.message).toContain('prod');
        expect(error!.message).toContain('test');
        expect(error!.message).toContain('ENV_CONFLICT');
      });
    });

    when('[t4] --env matches slug env', () => {
      then('returns slug as-is (no conflict)', () => {
        const result = asKeyrackKeySlug({
          key: 'ehmpathy.test.AWS_PROFILE',
          env: 'test',
          manifest,
        });
        expect(result.slug).toEqual('ehmpathy.test.AWS_PROFILE');
        expect(result.env).toEqual('test');
      });
    });
  });

  given('[case2] raw key name with --env provided', () => {
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

  given('[case3] raw key name found in exactly one env', () => {
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

  given('[case4] raw key name found in multiple envs', () => {
    const manifest = genMockManifest();

    when('[t0] AWS_PROFILE exists in test and prod', () => {
      then('throws BadRequestError with AMBIGUOUS_KEY code', async () => {
        const error = await getError(
          Promise.resolve().then(() =>
            asKeyrackKeySlug({
              key: 'AWS_PROFILE',
              env: null,
              manifest,
            }),
          ),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error!.message).toContain('AMBIGUOUS_KEY');
        expect(error!.message).toContain('test');
        expect(error!.message).toContain('prod');
        expect(error!.message).toContain('--env');
      });
    });
  });

  given('[case5] raw key name not found in any env', () => {
    const manifest = genMockManifest();

    when('[t0] UNKNOWN_KEY does not exist in manifest', () => {
      then('throws BadRequestError with KEY_NOT_FOUND code', async () => {
        const error = await getError(
          Promise.resolve().then(() =>
            asKeyrackKeySlug({
              key: 'UNKNOWN_KEY',
              env: null,
              manifest,
            }),
          ),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error!.message).toContain('KEY_NOT_FOUND');
        expect(error!.message).toContain('UNKNOWN_KEY');
        expect(error!.message).toContain('--env');
      });
    });
  });
});
