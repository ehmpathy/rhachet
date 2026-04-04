import { given, then, when } from 'test-fns';

import { asKeyrackKeyOrg } from './asKeyrackKeyOrg';

describe('asKeyrackKeyOrg', () => {
  given('[case1] a standard slug', () => {
    when('[t0] org is extracted', () => {
      then('returns the org segment', () => {
        expect(asKeyrackKeyOrg({ slug: 'rhight.prod.USPTO_KEY' })).toEqual(
          'rhight',
        );
        expect(asKeyrackKeyOrg({ slug: 'ahbode.test.AWS_PROFILE' })).toEqual(
          'ahbode',
        );
      });
    });
  });

  given('[case2] a slug with dots in key name', () => {
    when('[t0] org is extracted', () => {
      then('returns only the first segment', () => {
        expect(asKeyrackKeyOrg({ slug: 'ehmpathy.prod.API.KEY.V2' })).toEqual(
          'ehmpathy',
        );
      });
    });
  });
});
