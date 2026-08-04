import { given, then, when } from 'test-fns';

import { asKeyrackAwsParamName } from './asKeyrackAwsParamName';

describe('asKeyrackAwsParamName', () => {
  given('[case1] full key coordinates', () => {
    when('[t0] the name is derived', () => {
      const name = asKeyrackAwsParamName({
        owner: 'mechanic',
        org: 'ehmpathy',
        env: 'prod',
        key: 'ANTHROPIC_API_KEY',
      });

      then('it matches the versioned template', () => {
        expect(name).toEqual(
          '/keyrack/infra/vault/aws.params/v1/mechanic/ehmpathy/prod/ANTHROPIC_API_KEY',
        );
      });
      then('it carries the v1 version segment', () => {
        expect(name).toContain('/aws.params/v1/');
      });
      then('it stays within the SSM-legal charset', () => {
        expect(name).toMatch(/^[a-zA-Z0-9_.\-/]+$/);
      });
    });
  });

  given('[case2] an absent owner', () => {
    when('[t0] the name is derived', () => {
      then('it throws (never a skipped segment)', () => {
        expect(() =>
          asKeyrackAwsParamName({
            owner: '',
            org: 'ehmpathy',
            env: 'prod',
            key: 'K',
          }),
        ).toThrow();
      });
    });
  });

  given('[case4] the @all machine-wide org sentinel', () => {
    when('[t0] the name is derived for an @all key', () => {
      const name = asKeyrackAwsParamName({
        owner: 'mechanic',
        org: '@all',
        env: 'prod',
        key: 'GITHUB_APP_TOKEN',
      });

      then(
        'the @all sentinel is legalized to _all_ (the @ is outside SSM charset)',
        () => {
          expect(name).toEqual(
            '/keyrack/infra/vault/aws.params/v1/mechanic/_all_/prod/GITHUB_APP_TOKEN',
          );
        },
      );
      then('the machine-wide name stays within the SSM-legal charset', () => {
        expect(name).toMatch(/^[a-zA-Z0-9_.\-/]+$/);
      });
      then(
        'the name carries no @ (which would throw at the SSM boundary)',
        () => {
          expect(name).not.toContain('@');
        },
      );
    });

    when('[t1] the same @all key is derived again', () => {
      then(
        'the legalized name is stable across calls (roundtrip set/get parity)',
        () => {
          const first = asKeyrackAwsParamName({
            owner: 'mechanic',
            org: '@all',
            env: 'prod',
            key: 'GITHUB_APP_TOKEN',
          });
          const second = asKeyrackAwsParamName({
            owner: 'mechanic',
            org: '@all',
            env: 'prod',
            key: 'GITHUB_APP_TOKEN',
          });
          expect(first).toEqual(second);
        },
      );
    });
  });

  given('[case3] a stray char in a coordinate', () => {
    when('[t0] the derived name would be illegal', () => {
      then('the output self-validation throws', () => {
        expect(() =>
          asKeyrackAwsParamName({
            owner: 'me',
            org: 'e h',
            env: 'prod',
            key: 'K',
          }),
        ).toThrow();
      });
    });
  });
});
