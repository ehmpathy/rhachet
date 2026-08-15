import {
  type CloneSlugClaimState,
  computeCloneSlugDecision,
} from './computeCloneSlugDecision';

const TEST_CASES: {
  description: string;
  given: { requestedSlug: string | null; claim: CloneSlugClaimState | null };
  expect: string;
}[] = [
  {
    description: 'no requested slug → always bake-fresh (an unnamed enroll)',
    given: { requestedSlug: null, claim: null },
    expect: 'bake-fresh',
  },
  {
    description: 'a slug with no claim → bake-fresh (claim it fresh)',
    given: { requestedSlug: 'driver', claim: { kind: 'unclaimed' } },
    expect: 'bake-fresh',
  },
  {
    description:
      'a slug with a null claim → bake-fresh (defaults to unclaimed)',
    given: { requestedSlug: 'driver', claim: null },
    expect: 'bake-fresh',
  },
  {
    description: 'a slug held by a DIFFERENT actor, live → collision',
    given: {
      requestedSlug: 'driver',
      claim: { kind: 'live', sameActor: false },
    },
    expect: 'collision',
  },
  {
    description: 'a slug held by a DIFFERENT actor, dead → collision',
    given: {
      requestedSlug: 'driver',
      claim: { kind: 'dead', sameActor: false },
    },
    expect: 'collision',
  },
  {
    description: 'a same-actor LIVE slug → reuse (idempotent re-enroll)',
    given: {
      requestedSlug: 'driver',
      claim: { kind: 'live', sameActor: true },
    },
    expect: 'reuse',
  },
  {
    description: 'a same-actor DEAD slug → rebind (fresh clone, same name)',
    given: {
      requestedSlug: 'driver',
      claim: { kind: 'dead', sameActor: true },
    },
    expect: 'rebind',
  },
];

describe('computeCloneSlugDecision', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(computeCloneSlugDecision(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
