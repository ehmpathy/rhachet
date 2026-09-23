import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import {
  asCloneEnrollDepth,
  CLONE_ENROLL_DEPTH_MAX,
} from './asCloneEnrollDepth';

/**
 * .what = the depth a fresh enroll would mint, over every shape the caller's env takes
 * .why = the +1 is the subtlety — the env holds the CALLER's depth and the transformer
 *   returns the CHILD's. these cases pin both ends of that shift, plus the permissive
 *   reads (absent, malformed, negative) that must all fall back to the root depth
 */
const TEST_CASES: {
  description: string;
  given: { depth: string | undefined };
  expect: number;
}[] = [
  {
    description: 'a human caller (no depth var) mints a root clone at depth 0',
    given: { depth: undefined },
    expect: 0,
  },
  {
    description: 'a root clone (depth 0) mints a peer at depth 1',
    given: { depth: '0' },
    expect: 1,
  },
  {
    description: 'a peer clone (depth 1) would mint at depth 2 — over budget',
    given: { depth: '1' },
    expect: 2,
  },
  {
    description:
      'a malformed depth falls back to the root depth, never a fault',
    given: { depth: 'deep' },
    expect: 0,
  },
  {
    description: 'an empty depth falls back to the root depth',
    given: { depth: '' },
    expect: 0,
  },
  {
    description: 'a negative depth falls back to the root depth',
    given: { depth: '-3' },
    expect: 0,
  },
];

describe('asCloneEnrollDepth', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(
        asCloneEnrollDepth({
          env: { [CLONE_ENV_KEYS.depth]: thisCase.given.depth },
        }),
      ).toEqual(thisCase.expect);
    }),
  );

  test('the budget permits a root clone to enroll exactly one peer', () => {
    // a human's enroll and that clone's peer enroll both fit
    expect(asCloneEnrollDepth({ env: {} })).toBeLessThanOrEqual(
      CLONE_ENROLL_DEPTH_MAX,
    );
    expect(
      asCloneEnrollDepth({ env: { [CLONE_ENV_KEYS.depth]: '0' } }),
    ).toBeLessThanOrEqual(CLONE_ENROLL_DEPTH_MAX);

    // the peer's own enroll does not
    expect(
      asCloneEnrollDepth({ env: { [CLONE_ENV_KEYS.depth]: '1' } }),
    ).toBeGreaterThan(CLONE_ENROLL_DEPTH_MAX);
  });
});
