import { given, then, when } from 'test-fns';

import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { isCloneSpawnCallerLeaf } from './isCloneSpawnCallerLeaf';

const TEST_CASES = [
  {
    description: 'no leaf key — a work clone or a human',
    given: { leaf: undefined },
    expect: { isLeaf: false },
  },
  {
    description: 'an empty leaf key — read as absent',
    given: { leaf: '' },
    expect: { isLeaf: false },
  },
  {
    description: 'the leaf key the writer sets',
    given: { leaf: '1' },
    expect: { isLeaf: true },
  },
  {
    description: 'a smudged leaf key — errs toward the bound',
    given: { leaf: 'yes' },
    expect: { isLeaf: true },
  },
];

describe('isCloneSpawnCallerLeaf', () => {
  given('[case1] a caller env', () => {
    TEST_CASES.map((thisCase) =>
      when(`[t0] it holds ${thisCase.description}`, () => {
        then(`it reads as leaf=${thisCase.expect.isLeaf}`, () => {
          expect(
            isCloneSpawnCallerLeaf({
              env: { [CLONE_ENV_KEYS.leaf]: thisCase.given.leaf },
            }),
          ).toEqual(thisCase.expect.isLeaf);
        });
      }),
    );
  });
});
