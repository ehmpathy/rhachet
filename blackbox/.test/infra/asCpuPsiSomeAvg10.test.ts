import { given, then, when } from 'test-fns';

import { asCpuPsiSomeAvg10 } from './asCpuPsiSomeAvg10';

const TEST_CASES = [
  {
    description: 'a kernel with a full line reads the some line',
    content:
      'some avg10=14.21 avg60=12.05 avg300=9.88 total=123456\nfull avg10=0.00 avg60=0.00 avg300=0.00 total=0\n',
    expect: 14.21,
  },
  {
    description: 'an older kernel with the some line alone',
    content: 'some avg10=80.70 avg60=79.10 avg300=60.00 total=99\n',
    expect: 80.7,
  },
  {
    description: 'an idle box reads zero, not null',
    content: 'some avg10=0.00 avg60=0.00 avg300=0.00 total=0\n',
    expect: 0,
  },
  {
    description: 'a file with no some line reads null',
    content: 'full avg10=1.00 avg60=0.00 avg300=0.00 total=0\n',
    expect: null,
  },
];

describe('asCpuPsiSomeAvg10', () => {
  given('[case1] the text of /proc/pressure/cpu', () => {
    TEST_CASES.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then(`it reads ${thisCase.expect}`, () => {
          expect(asCpuPsiSomeAvg10({ content: thisCase.content })).toEqual(thisCase.expect);
        });
      }),
    );
  });
});
