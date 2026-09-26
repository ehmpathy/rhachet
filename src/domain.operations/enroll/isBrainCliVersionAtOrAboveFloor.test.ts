import { given, then, when } from 'test-fns';

import { isBrainCliVersionAtOrAboveFloor } from './isBrainCliVersionAtOrAboveFloor';

const FLOOR = { major: 2, minor: 1, patch: 277 };

const TEST_CASES = [
  {
    description: 'equal to the floor',
    version: { major: 2, minor: 1, patch: 277 },
    expected: true,
  },
  {
    description: 'a patch above',
    version: { major: 2, minor: 1, patch: 279 },
    expected: true,
  },
  {
    description: 'a patch below',
    version: { major: 2, minor: 1, patch: 276 },
    expected: false,
  },
  {
    description: 'a minor above with a lower patch',
    version: { major: 2, minor: 2, patch: 0 },
    expected: true,
  },
  {
    description: 'a minor below with a higher patch',
    version: { major: 2, minor: 0, patch: 999 },
    expected: false,
  },
  {
    description: 'a major above',
    version: { major: 3, minor: 0, patch: 0 },
    expected: true,
  },
  {
    description: 'a major below',
    version: { major: 1, minor: 9, patch: 999 },
    expected: false,
  },
];

describe('isBrainCliVersionAtOrAboveFloor', () => {
  given('[case1] versions around the floor 2.1.277', () => {
    TEST_CASES.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then(`it reads ${thisCase.expected}`, () => {
          expect(
            isBrainCliVersionAtOrAboveFloor({
              version: thisCase.version,
              floor: FLOOR,
            }),
          ).toEqual(thisCase.expected);
        });
      }),
    );
  });
});
