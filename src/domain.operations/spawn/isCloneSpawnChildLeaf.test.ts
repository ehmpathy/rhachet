import { given, then, when } from 'test-fns';

import { isCloneSpawnChildLeaf } from './isCloneSpawnChildLeaf';

describe('isCloneSpawnChildLeaf', () => {
  given('[case1] the enroll door', () => {
    when('[t0] a session enroll, with no -p', () => {
      then('the child is a work clone — it may enroll one more', () => {
        expect(
          isCloneSpawnChildLeaf({ door: 'enroll', isPrintMode: false }),
        ).toEqual(false);
      });
    });

    when("[t1] a print-mode enroll, `-p '<prompt>'`", () => {
      then('the child is a reviewer leaf', () => {
        expect(
          isCloneSpawnChildLeaf({ door: 'enroll', isPrintMode: true }),
        ).toEqual(true);
      });
    });
  });

  given('[case2] the repl door', () => {
    when('[t0] a repl brain is spawned', () => {
      then('the child is a reviewer leaf', () => {
        expect(isCloneSpawnChildLeaf({ door: 'repl' })).toEqual(true);
      });
    });
  });
});
