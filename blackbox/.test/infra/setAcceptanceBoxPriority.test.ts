import { given, then, when } from 'test-fns';

import { setAcceptanceBoxPriority } from './setAcceptanceBoxPriority';

/**
 * .what = a stand-in for the os priority calls, which records each set
 */
const genOsFake = (input: { cores: number; niceStart: number }) => {
  // .note = deliberate mutation — the fake holds the nice a set would leave on a real process
  let nice = input.niceStart;
  const sets: number[] = [];
  return {
    sets,
    os: {
      cores: () => input.cores,
      getPriority: () => nice,
      setPriority: (niceNext: number) => {
        sets.push(niceNext);
        nice = niceNext;
      },
    },
  };
};

describe('setAcceptanceBoxPriority', () => {
  given('[case1] a shared box at normal priority', () => {
    when('[t0] the run starts', () => {
      then('it lowers the priority to nice 10', () => {
        const fake = genOsFake({ cores: 12, niceStart: 0 });
        const result = setAcceptanceBoxPriority({ env: {} }, { os: fake.os });
        expect(fake.sets).toEqual([10]);
        expect(result.niceNow).toEqual(10);
        expect(result.box.box).toEqual('shared');
        expect(result.cores).toEqual(12);
      });
    });
  });

  given('[case2] a shared box already at a lower priority than the target', () => {
    when('[t0] the run starts', () => {
      then('it never raises the priority', () => {
        const fake = genOsFake({ cores: 12, niceStart: 19 });
        const result = setAcceptanceBoxPriority({ env: {} }, { os: fake.os });
        expect(fake.sets).toEqual([]);
        expect(result.niceNow).toEqual(19);
      });
    });
  });

  given('[case3] ci', () => {
    when('[t0] the run starts', () => {
      then('it leaves the priority as it was', () => {
        const fake = genOsFake({ cores: 4, niceStart: 0 });
        const result = setAcceptanceBoxPriority(
          { env: { GITHUB_ACTIONS: 'true' } },
          { os: fake.os },
        );
        expect(fake.sets).toEqual([]);
        expect(result.niceNow).toEqual(0);
        expect(result.box.box).toEqual('ci');
      });
    });
  });
});
