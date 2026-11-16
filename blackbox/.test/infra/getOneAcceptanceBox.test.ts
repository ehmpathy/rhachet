import { given, then, when } from 'test-fns';

import { getOneAcceptanceBox } from './getOneAcceptanceBox';

const TEST_CASES = [
  {
    description: 'a github actions runner takes the full width at normal priority',
    given: { env: { GITHUB_ACTIONS: 'true' }, cores: 2 },
    expect: { box: 'ci', maxWorkersDefault: '50%', niceTarget: null },
  },
  {
    description: 'a laptop with CI=true alone stays a shared box (credfree sets CI)',
    given: { env: { CI: 'true' }, cores: 12 },
    expect: { box: 'shared', maxWorkersDefault: 3, niceTarget: 10 },
  },
  {
    description: 'a bare laptop takes a quarter of its cores',
    given: { env: {}, cores: 12 },
    expect: { box: 'shared', maxWorkersDefault: 3, niceTarget: 10 },
  },
  {
    description: 'a 4-core grove takes one worker',
    given: { env: {}, cores: 4 },
    expect: { box: 'shared', maxWorkersDefault: 1, niceTarget: 10 },
  },
  {
    description: 'a 2-core box still takes one worker, never zero',
    given: { env: {}, cores: 2 },
    expect: { box: 'shared', maxWorkersDefault: 1, niceTarget: 10 },
  },
  {
    description: 'GITHUB_ACTIONS set to a value other than true reads as shared',
    given: { env: { GITHUB_ACTIONS: 'false' }, cores: 8 },
    expect: { box: 'shared', maxWorkersDefault: 2, niceTarget: 10 },
  },
];

describe('getOneAcceptanceBox', () => {
  given('[case1] the host signal and the core count of a box', () => {
    TEST_CASES.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then('it reads the box, its default width, and its priority', () => {
          expect(getOneAcceptanceBox(thisCase.given)).toEqual(thisCase.expect);
        });
      }),
    );
  });
});
