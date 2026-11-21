import { given, then, when } from 'test-fns';

import { isBoxStarved } from './isBoxStarved';

const TEST_CASES = [
  {
    description: 'psi at the #748 figure reads as starved',
    peak: { cpuPsiSomeAvg10: 80.7, load1: 55.7, cores: 12 },
    expect: true,
  },
  {
    description: 'psi of a busy but served grove does not',
    peak: { cpuPsiSomeAvg10: 29, load1: 6.2, cores: 4 },
    expect: false,
  },
  {
    description: 'with no psi, load well over the cores reads as starved',
    peak: { cpuPsiSomeAvg10: null, load1: 20, cores: 8 },
    expect: true,
  },
  {
    description: 'with no psi, load under the cores does not',
    peak: { cpuPsiSomeAvg10: null, load1: 6, cores: 8 },
    expect: false,
  },
];

describe('isBoxStarved', () => {
  given('[case1] the peak pressure of a run', () => {
    TEST_CASES.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then(`isBoxStarved = ${thisCase.expect}`, () => {
          expect(isBoxStarved({ peak: thisCase.peak })).toEqual(thisCase.expect);
        });
      }),
    );
  });
});
