import { given, then, when } from 'test-fns';

import { getLoginSessionId } from './getLoginSessionId';

describe('getLoginSessionId', () => {
  given('[case1] valid process', () => {
    when('[t0] read current process sessionid', () => {
      then('returns a number', () => {
        const sessionId = getLoginSessionId({ pid: process.pid });
        expect(typeof sessionId).toBe('number');
      });

      then('sessionid is not NaN', () => {
        const sessionId = getLoginSessionId({ pid: process.pid });
        expect(Number.isNaN(sessionId)).toBe(false);
      });

      then('sessionid is positive or zero', () => {
        const sessionId = getLoginSessionId({ pid: process.pid });
        expect(sessionId).toBeGreaterThanOrEqual(0);
      });
    });

    when('[t1] read parent process sessionid', () => {
      then('returns same sessionid as current process', () => {
        // parent and child in same session have same sessionid
        const currentSessionId = getLoginSessionId({ pid: process.pid });
        const parentSessionId = getLoginSessionId({ pid: process.ppid });
        expect(parentSessionId).toEqual(currentSessionId);
      });
    });
  });

  given('[case2] invalid process', () => {
    when('[t0] pid does not exist', () => {
      then('throws error with ENOENT or process not found', () => {
        expect(() => getLoginSessionId({ pid: 999999999 })).toThrow(
          /ENOENT|process not found/,
        );
      });
    });
  });
});
