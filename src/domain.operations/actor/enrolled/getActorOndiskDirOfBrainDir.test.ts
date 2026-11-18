import { getActorOndiskDirOfBrainDir } from './getActorOndiskDirOfBrainDir';

const TEST_CASES = [
  {
    description: 'an actor brain dir maps to its actor dir',
    given: {
      brainDir: '/repo/.agent/.actors/actor.via.slug=surfer/brain/.claude',
    },
    expect: { output: '/repo/.agent/.actors/actor.via.slug=surfer' },
  },
  {
    description: 'a `.claude` dir outside a `brain` dir has no actor',
    given: { brainDir: '/repo/.claude' },
    expect: { output: null },
  },
  {
    description: 'a `brain` dir with no `.claude` leaf has no actor',
    given: { brainDir: '/repo/.agent/.actors/actor.via.slug=surfer/brain' },
    expect: { output: null },
  },
];

describe('getActorOndiskDirOfBrainDir', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(
        getActorOndiskDirOfBrainDir({ brainDir: thisCase.given.brainDir }),
      ).toEqual(thisCase.expect.output);
    }),
  );
});
