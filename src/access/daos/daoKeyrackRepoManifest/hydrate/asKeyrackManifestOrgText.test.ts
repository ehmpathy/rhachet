import { given, then, when } from 'test-fns';

import { asKeyrackManifestOrgText } from './asKeyrackManifestOrgText';

const fallback = '(none)';

describe('asKeyrackManifestOrgText', () => {
  given('[case1] an org: the report can name', () => {
    const TEST_CASES = [
      { description: 'a scalar', org: 'ahbode', text: 'ahbode' },
      {
        description: 'a list, in declared order',
        org: ['ahbode', 'bhanya'],
        text: 'ahbode, bhanya',
      },
      { description: 'a one-member list', org: ['ahbode'], text: 'ahbode' },
    ];
    TEST_CASES.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then('it renders the org text', () => {
          expect(
            asKeyrackManifestOrgText({ org: thisCase.org, fallback }),
          ).toEqual(thisCase.text);
        });
      }),
    );
  });

  given('[case2] an org: the report cannot name', () => {
    const TEST_CASES = [
      { description: 'an empty text', org: '' },
      { description: 'an empty list', org: [] },
      { description: 'an absent value', org: undefined },
      { description: 'a non-text value', org: 7 },
    ];
    TEST_CASES.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then('it yields the fallback', () => {
          expect(
            asKeyrackManifestOrgText({ org: thisCase.org, fallback }),
          ).toEqual(fallback);
        });
      }),
    );
  });
});
