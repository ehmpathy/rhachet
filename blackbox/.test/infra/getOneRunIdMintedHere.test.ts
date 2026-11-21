import { given, then, when } from 'test-fns';

import { getOneRunIdMintedHere, RUN_MINTER_ENV_KEY } from './getOneRunIdMintedHere';

const TEST_CASES = [
  {
    description: 'a run id this process minted is returned',
    env: { TEST_FNS_RUN: 'r1a1a1a1a', [RUN_MINTER_ENV_KEY]: '4242:r1a1a1a1a' },
    expect: 'r1a1a1a1a',
  },
  {
    description: 'a run id inherited from a parent run, with its minter mark, is refused',
    env: { TEST_FNS_RUN: 'r1a1a1a1a', [RUN_MINTER_ENV_KEY]: '1001:r1a1a1a1a' },
    expect: null,
  },
  {
    description: 'a run id with no minter mark at all is refused',
    env: { TEST_FNS_RUN: 'r1a1a1a1a' },
    expect: null,
  },
  {
    description: 'a minter mark for another run id is refused',
    env: { TEST_FNS_RUN: 'r1a1a1a1a', [RUN_MINTER_ENV_KEY]: '4242:r2b2b2b2b' },
    expect: null,
  },
  {
    description: 'no run id at all reads as none',
    env: {},
    expect: null,
  },
];

describe('getOneRunIdMintedHere', () => {
  given('[case1] the env of a process with pid 4242', () => {
    TEST_CASES.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then(`it reads ${thisCase.expect === null ? 'no run id' : 'the run id'}`, () => {
          expect(getOneRunIdMintedHere({ env: thisCase.env, pid: 4242 })).toEqual(thisCase.expect);
        });
      }),
    );
  });
});
