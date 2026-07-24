import { given, then, when } from 'test-fns';

import { getKeyrackInfraRepoSlug } from './getKeyrackInfraRepoSlug';

describe('getKeyrackInfraRepoSlug', () => {
  given('[case1] an org name', () => {
    when('[t0] the infra repo slug is derived', () => {
      then('it appends the fixed keyrack-infra repo name', () => {
        expect(getKeyrackInfraRepoSlug({ org: 'ehmpathy' })).toEqual(
          'ehmpathy/keyrack-infra',
        );
      });
    });
  });

  given('[case2] a different org name', () => {
    when('[t0] the infra repo slug is derived', () => {
      then('the name stays fixed and only the org varies', () => {
        expect(getKeyrackInfraRepoSlug({ org: 'ahbode' })).toEqual(
          'ahbode/keyrack-infra',
        );
      });
    });
  });
});
