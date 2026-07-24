import { given, then, when } from 'test-fns';

import { genMockGhRun } from '@src/.test/assets/genMockGhRun';

import { getKeyrackInfraExists } from './getKeyrackInfraExists';

describe('getKeyrackInfraExists', () => {
  given('[case1] an org whose keyrack-infra repo exists', () => {
    const ghRun = genMockGhRun({ repos: ['ehmpathy/keyrack-infra'] });

    when('[t0] checked', () => {
      then('it is true', () => {
        expect(getKeyrackInfraExists({ org: 'ehmpathy' }, { ghRun })).toBe(
          true,
        );
      });
    });
  });

  given('[case2] an org with no keyrack-infra repo', () => {
    const ghRun = genMockGhRun({ repos: [] });

    when('[t0] checked', () => {
      then('it is false', () => {
        expect(getKeyrackInfraExists({ org: 'ehmpathy' }, { ghRun })).toBe(
          false,
        );
      });
    });
  });
});
