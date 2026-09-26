import { given, then, when } from 'test-fns';

import { asCloneBrainDir } from './asCloneBrainDir';

const BRAIN_DIR = '/repo/.agent/.actors/actor.via.hash=abc12345/brain/.claude';

const TEST_CASES = [
  {
    description: 'spawned after the brain dir was born',
    brainDirBornAt: 1000,
    spawnedAt: 2000,
    expected: BRAIN_DIR,
  },
  {
    description: 'spawned before the brain dir was born',
    brainDirBornAt: 2000,
    spawnedAt: 1000,
    expected: '/home/h/.claude',
  },
  {
    description: 'spawned at the birth instant',
    brainDirBornAt: 2000,
    spawnedAt: 2000,
    expected: BRAIN_DIR,
  },
  {
    description: 'an fs with no birth time',
    brainDirBornAt: 0,
    spawnedAt: 1000,
    expected: BRAIN_DIR,
  },
];

describe('asCloneBrainDir', () => {
  given('[case1] a clone and its actor brain dir', () => {
    TEST_CASES.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then(`the brain dir is ${thisCase.expected}`, () => {
          expect(
            asCloneBrainDir({
              brainDir: BRAIN_DIR,
              brainDirBornAt: thisCase.brainDirBornAt,
              spawnedAt: thisCase.spawnedAt,
              home: '/home/h',
            }),
          ).toEqual(thisCase.expected);
        });
      }),
    );
  });
});
