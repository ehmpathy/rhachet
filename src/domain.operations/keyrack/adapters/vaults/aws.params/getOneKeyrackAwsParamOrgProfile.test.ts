import { given, then, when } from 'test-fns';

import {
  KeyrackHostManifest,
  KeyrackKeyHost,
} from '@src/domain.objects/keyrack';

import { getOneKeyrackAwsParamOrgProfile } from './getOneKeyrackAwsParamOrgProfile';

/**
 * .what = unit test for the org AWS_PROFILE peer-lookup transformer
 * .why = the org-scope hardcut's tree-wide identity source is a manifest fact; this pure
 *        lookup must return the peer profile only for a tree-scoped aws.params key
 */
const genManifest = (
  hosts: Record<string, KeyrackKeyHost>,
): KeyrackHostManifest =>
  new KeyrackHostManifest({
    uri: '~/.rhachet/keyrack/keyrack.host.test.age',
    owner: null,
    recipients: [],
    hosts,
  });

const genProfileHost = (input: {
  slug: string;
  exid: string;
}): KeyrackKeyHost =>
  new KeyrackKeyHost({
    slug: input.slug,
    mech: 'PERMANENT_VIA_REFERENCE',
    vault: 'aws.config',
    exid: input.exid,
    env: 'prod',
    org: 'ehmpathy',
    meta: null,
    maxDuration: null,
    createdAt: '2026-07-30T00:00:00.000Z',
    updatedAt: '2026-07-30T00:00:00.000Z',
  });

describe('getOneKeyrackAwsParamOrgProfile', () => {
  given(
    '[case1] a tree-scoped aws.params key with a peer AWS_PROFILE entry',
    () => {
      const hostManifest = genManifest({
        'ehmpathy.prod.AWS_PROFILE': genProfileHost({
          slug: 'ehmpathy.prod.AWS_PROFILE',
          exid: 'ehmpathy-prod',
        }),
      });

      when('[t0] the profile is looked up for the aws.params key', () => {
        then('the peer entry exid is returned', () => {
          const profile = getOneKeyrackAwsParamOrgProfile({
            vault: 'aws.params',
            slug: 'ehmpathy.prod.ANTHROPIC_API_KEY',
            hostManifest,
          });
          expect(profile).toEqual('ehmpathy-prod');
        });
      });
    },
  );

  given('[case2] a grove-scoped (@all) aws.params key', () => {
    const hostManifest = genManifest({});

    when('[t0] the profile is looked up', () => {
      then('null is returned (the grove uses its IMDS role)', () => {
        const profile = getOneKeyrackAwsParamOrgProfile({
          vault: 'aws.params',
          slug: '@all.prod.ANTHROPIC_API_KEY',
          hostManifest,
        });
        expect(profile).toEqual(null);
      });
    });
  });

  given('[case3] a non-aws.params vault key', () => {
    const hostManifest = genManifest({
      'ehmpathy.prod.AWS_PROFILE': genProfileHost({
        slug: 'ehmpathy.prod.AWS_PROFILE',
        exid: 'ehmpathy-prod',
      }),
    });

    when('[t0] the profile is looked up for a 1password key', () => {
      then('null is returned (the field is ignored by other vaults)', () => {
        const profile = getOneKeyrackAwsParamOrgProfile({
          vault: '1password',
          slug: 'ehmpathy.prod.SOME_KEY',
          hostManifest,
        });
        expect(profile).toEqual(null);
      });
    });
  });

  given(
    '[case4] a tree-scoped aws.params key with NO peer AWS_PROFILE entry',
    () => {
      const hostManifest = genManifest({});

      when('[t0] the profile is looked up', () => {
        then('null is returned (absent peer entry)', () => {
          const profile = getOneKeyrackAwsParamOrgProfile({
            vault: 'aws.params',
            slug: 'ehmpathy.prod.ANTHROPIC_API_KEY',
            hostManifest,
          });
          expect(profile).toEqual(null);
        });
      });
    },
  );
});
