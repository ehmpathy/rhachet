import { given, then, when } from 'test-fns';

import { asSecondsFromEtime } from './asSecondsFromEtime';

const TEST_CASES = [
  { description: 'minutes and seconds', etime: '05:07', seconds: 307 },
  { description: 'hours, minutes, seconds', etime: '07:24:00', seconds: 26640 },
  { description: 'days, hours, minutes, seconds', etime: '2-01:00:05', seconds: 176405 },
  { description: 'seconds alone, as some ps forms print', etime: '42', seconds: 42 },
];

describe('asSecondsFromEtime', () => {
  given('[case1] the etime of a process', () => {
    TEST_CASES.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then(`it reads as ${thisCase.seconds} seconds`, () => {
          expect(asSecondsFromEtime({ etime: thisCase.etime })).toEqual(thisCase.seconds);
        });
      }),
    );
  });
});
