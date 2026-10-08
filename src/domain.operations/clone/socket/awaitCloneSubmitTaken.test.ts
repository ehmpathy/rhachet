import { given, then, when } from 'test-fns';

import type { CloneScreenRead } from '../screen/genCloneScreenFeed';
import { awaitCloneSubmitTaken } from './awaitCloneSubmitTaken';
import { CLONE_SUBMIT_RESEND_MAX } from './constants';

/**
 * .what = a rendered screen whose input box holds the given rows
 * .why = the classifier locates the box as the `❯` band between the last full-width rule
 *   pair, so a fixture must draw that shape (the measured haiku structure)
 */
const genScreen = (input: { boxRows: string[] }): CloneScreenRead => {
  const rule = '─'.repeat(40);
  const lines = [
    'some earlier turn',
    rule,
    ...input.boxRows.map((row, i) => (i === 0 ? `❯ ${row}` : `  ${row}`)),
    rule,
  ];
  return {
    live: true,
    lines,
    linesBright: lines,
    cursorX: 2,
    cursorY: 2,
    cols: 80,
    rows: lines.length,
  };
};

/** a deterministic clock + sleep pair, so no clamp waits on wall time */
const genClock = () => {
  // .note = deliberate mutation — a virtual clock local to one test, never shared
  let at = 0;
  return {
    now: () => at,
    sleep: async (ms: number) => {
      at += ms;
    },
  };
};

/**
 * .what = a fake child whose box clears only after the Nth submit `\r` it receives
 * .why = models a TUI that swallows the first `\r`(s) mid boot animation — the CI case
 */
const genChildThatSwallows = (input: {
  swallowed: number;
  message: string;
}) => {
  // .note = deliberate mutation — the count of `\r` this fake child has received
  let submits = 1; // the caller already wrote the first `\r` before the watch starts
  return {
    read: (): CloneScreenRead =>
      submits > input.swallowed
        ? genScreen({ boxRows: [''] })
        : genScreen({ boxRows: [input.message] }),
    resubmit: () => {
      submits += 1;
    },
    getSubmits: () => submits,
  };
};

describe('awaitCloneSubmitTaken', () => {
  given('[case1] a child that takes the first submit', () => {
    when('[t0] the watch runs', () => {
      then('it reports taken and re-sends naught', async () => {
        const clock = genClock();
        const child = genChildThatSwallows({ swallowed: 0, message: 'hello' });
        const result = await awaitCloneSubmitTaken({
          read: child.read,
          message: 'hello',
          countBefore: 0,
          observedReady: true,
          resubmit: child.resubmit,
          ...clock,
        });
        expect(result).toEqual({ taken: true, resubmits: 0 });
        expect(child.getSubmits()).toEqual(1);
      });
    });
  });

  given('[case2] a child that swallows the first submit', () => {
    when('[t0] the watch runs', () => {
      then(
        'it re-sends the submit once, and the message is taken',
        async () => {
          // 🔴 the clamp for the CI flake: the first `\r` to a fresh TUI was lost and the say
          // sat `buffered`. without the re-send, this child never clears its box
          const clock = genClock();
          const child = genChildThatSwallows({
            swallowed: 1,
            message: 'hello',
          });
          const result = await awaitCloneSubmitTaken({
            read: child.read,
            message: 'hello',
            countBefore: 0,
            observedReady: true,
            resubmit: child.resubmit,
            ...clock,
          });
          expect(result).toEqual({ taken: true, resubmits: 1 });
          expect(child.getSubmits()).toEqual(2);
        },
      );
    });
  });

  given('[case3] a child whose box never clears', () => {
    when('[t0] the watch runs', () => {
      then('it stops at the resend bound and reports not taken', async () => {
        const clock = genClock();
        const child = genChildThatSwallows({
          swallowed: Number.POSITIVE_INFINITY,
          message: 'hello',
        });
        const result = await awaitCloneSubmitTaken({
          read: child.read,
          message: 'hello',
          countBefore: 0,
          observedReady: true,
          resubmit: child.resubmit,
          ...clock,
        });
        expect(result).toEqual({
          taken: false,
          resubmits: CLONE_SUBMIT_RESEND_MAX,
        });
      });
    });
  });

  given('[case4] a content commit that was never observed', () => {
    when('[t0] the watch runs', () => {
      then('it re-sends naught — no baseline to compare against', async () => {
        const clock = genClock();
        const child = genChildThatSwallows({ swallowed: 1, message: 'hello' });
        const result = await awaitCloneSubmitTaken({
          read: child.read,
          message: 'hello',
          countBefore: 0,
          observedReady: false,
          resubmit: child.resubmit,
          ...clock,
        });
        expect(result).toEqual({ taken: null, resubmits: 0 });
        expect(child.getSubmits()).toEqual(1);
      });
    });
  });

  given('[case5] a screen that cannot be read', () => {
    when('[t0] the watch runs', () => {
      then('it re-sends naught and reports taken unknown', async () => {
        const clock = genClock();
        // .note = deliberate mutation — a resend counter local to this case
        let resubmits = 0;
        const result = await awaitCloneSubmitTaken({
          read: () => ({ live: false, reason: 'feed-not-live' }),
          message: 'hello',
          countBefore: 0,
          observedReady: true,
          resubmit: () => {
            resubmits += 1;
          },
          ...clock,
        });
        expect(result).toEqual({ taken: null, resubmits: 0 });
        expect(resubmits).toEqual(0);
      });
    });
  });
});
