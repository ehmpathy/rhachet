import { asActorRefNearbyHint } from './asActorRefNearbyHint';

const TEST_CASES = [
  {
    description: 'a one-letter typo names the slug meant, then the list',
    given: { ref: '@bulder', slugs: ['builder', 'scholar'] },
    expect: {
      output: "did you mean '@builder'? declared: '@builder', '@scholar'",
    },
  },
  {
    description: 'a ref with no near slug lists every slug, with no guess',
    given: { ref: '@nobody', slugs: ['builder', 'scholar'] },
    expect: { output: "use one of '@builder', '@scholar'" },
  },
  {
    description: 'a short ref cannot match a distant peer',
    given: { ref: '@ab', slugs: ['xy'] },
    expect: { output: "use one of '@xy'" },
  },
  {
    description: 'the nearest of two near slugs wins',
    given: { ref: '@crewx', slugs: ['crews', 'crew'] },
    expect: { output: "did you mean '@crew'? declared: '@crews', '@crew'" },
  },
];

describe('asActorRefNearbyHint', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asActorRefNearbyHint(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
