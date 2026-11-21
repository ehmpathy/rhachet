import { given, then, when } from 'test-fns';

import { asBrainAuthWriteLockHint } from './asBrainAuthWriteLockHint';

describe('asBrainAuthWriteLockHint', () => {
  given('[case1] an enroll that waited out the lock', () => {
    when('[t0] the hint is built', () => {
      then('it names the enroll to retry', () => {
        expect(asBrainAuthWriteLockHint({ retry: 'enroll' })).toEqual(
          'a live claude-code process holds the lock past the wait; retry the enroll. a lock dir older than 15s is stale, and is cleared on the next try',
        );
      });
    });
  });

  given('[case2] a use that waited out the lock', () => {
    when('[t0] the hint is built', () => {
      then('it names the use to retry', () => {
        expect(asBrainAuthWriteLockHint({ retry: 'use' })).toEqual(
          'a live claude-code process holds the lock past the wait; retry the use. a lock dir older than 15s is stale, and is cleared on the next try',
        );
      });
    });
  });
});
