import { given, then, when } from 'test-fns';

import { asPeakPressure } from './asPeakPressure';

const TEST_CASES = [
  {
    description: 'the first sample is the peak',
    now: { cpuPsiSomeAvg10: 20, load1: 3, cores: 4 },
    peak: null,
    expect: { cpuPsiSomeAvg10: 20, load1: 3, cores: 4 },
  },
  {
    description: 'a higher sample raises each axis on its own',
    now: { cpuPsiSomeAvg10: 10, load1: 9, cores: 4 },
    peak: { cpuPsiSomeAvg10: 30, load1: 3, cores: 4 },
    expect: { cpuPsiSomeAvg10: 30, load1: 9, cores: 4 },
  },
  {
    description: 'a host with no psi keeps psi null',
    now: { cpuPsiSomeAvg10: null, load1: 2, cores: 8 },
    peak: { cpuPsiSomeAvg10: null, load1: 5, cores: 8 },
    expect: { cpuPsiSomeAvg10: null, load1: 5, cores: 8 },
  },
  {
    description: 'a psi of zero is a measure, not an absence',
    now: { cpuPsiSomeAvg10: 0, load1: 0.1, cores: 4 },
    peak: null,
    expect: { cpuPsiSomeAvg10: 0, load1: 0.1, cores: 4 },
  },
];

describe('asPeakPressure', () => {
  given('[case1] a run that samples its box', () => {
    TEST_CASES.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then('the peak is folded per axis', () => {
          expect(asPeakPressure({ now: thisCase.now, peak: thisCase.peak })).toEqual(
            thisCase.expect,
          );
        });
      }),
    );
  });
});
