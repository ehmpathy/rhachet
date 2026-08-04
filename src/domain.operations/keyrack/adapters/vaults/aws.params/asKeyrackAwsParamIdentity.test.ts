import { getError } from 'test-fns';

import { asKeyrackAwsParamIdentity } from './asKeyrackAwsParamIdentity';

describe('asKeyrackAwsParamIdentity', () => {
  describe('[case1] --org @all → grove-wide → IMDS only', () => {
    it('[c61] returns { source: imds } for @all, with no profile', () => {
      expect(
        asKeyrackAwsParamIdentity({ org: '@all', profileForOrg: null }),
      ).toEqual({ source: 'imds' });
    });
    it('[c61] returns imds for @all even when a profile happens to be present (never SSO/profile)', () => {
      expect(
        asKeyrackAwsParamIdentity({
          org: '@all',
          profileForOrg: 'ehmpathy-prod',
        }),
      ).toEqual({ source: 'imds' });
    });
  });

  describe('[case2] a specific org → tree-wide → that org profile', () => {
    it('[c62] returns { source: profile } with the org profile', () => {
      expect(
        asKeyrackAwsParamIdentity({
          org: 'ehmpathy',
          profileForOrg: 'ehmpathy-prod',
        }),
      ).toEqual({ source: 'profile', profile: 'ehmpathy-prod' });
    });
  });

  describe('[case3] a specific org with no declared profile → fail loud', () => {
    it('[c63] throws a ConstraintError that names the fix + the --org @all alternative', () => {
      const error = getError(() =>
        asKeyrackAwsParamIdentity({ org: 'ehmpathy', profileForOrg: null }),
      );
      expect(error).toBeDefined();
      expect(error.message).toContain(
        'no AWS_PROFILE declared for org "ehmpathy"',
      );
    });
    it('[c64] never falls back to IMDS when a profile is absent for a specific org', () => {
      // a cached SSO session or ambient state must NOT rescue a specific-org key; only the
      // keyrack-declared AWS_PROFILE counts, so an absent profile is a hard fail, not an imds fall
      const error = getError(() =>
        asKeyrackAwsParamIdentity({ org: 'ehmpathy', profileForOrg: null }),
      );
      expect(error).toBeDefined();
    });
  });
});
