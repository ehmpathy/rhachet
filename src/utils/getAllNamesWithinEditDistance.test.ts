import { getAllNamesWithinEditDistance } from './getAllNamesWithinEditDistance';

const TEST_CASES = [
  {
    description: 'a one-letter drop is within reach of a short name',
    given: { names: ['list', 'say', 'get'], nameTyped: 'lst' },
    expect: { output: ['list'] },
  },
  {
    description: 'a distant name is never offered',
    given: { names: ['list', 'say', 'get'], nameTyped: 'claude' },
    expect: { output: [] },
  },
  {
    description: 'a tie in distance orders by name',
    given: { names: ['solo', 'sole', 'crew'], nameTyped: 'sola' },
    expect: { output: ['sole', 'solo'] },
  },
  {
    description: 'nearest first, ahead of a farther name in reach',
    given: { names: ['boot', 'boots'], nameTyped: 'bootss' },
    expect: { output: ['boots', 'boot'] },
  },
  {
    description: 'the threshold scales with the typed name',
    given: { names: ['abcdefghijkl'], nameTyped: 'abcdefgh' },
    expect: { output: [] },
  },
];

describe('getAllNamesWithinEditDistance', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(getAllNamesWithinEditDistance(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
