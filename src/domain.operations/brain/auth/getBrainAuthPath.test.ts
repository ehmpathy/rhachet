import { given, then, when } from 'test-fns';

import { getBrainAuthPath } from './getBrainAuthPath';

describe('getBrainAuthPath', () => {
  given('[case1] a home dir', () => {
    when('[t0] the shared login path is computed', () => {
      then('it is the credentials file under ~/.claude', () => {
        expect(getBrainAuthPath({ home: '/home/surfer' })).toEqual(
          '/home/surfer/.claude/.credentials.json',
        );
      });
    });
  });
});
