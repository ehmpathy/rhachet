import { calcEditDistance, getAllNamesNearby } from './getAllNamesNearby';

/**
 * .what = pins the edit distance the near-match offer is scored by
 * .why = the offer is only as honest as this number; these rows pin its edges
 */
const DISTANCE_CASES = [
  {
    description: 'identical names are zero apart',
    given: { from: 'boot.yml', into: 'boot.yml' },
    expect: { distance: 0 },
  },
  {
    description: 'one insertion is one apart',
    given: { from: 'boot.yml', into: 'boot.yaml' },
    expect: { distance: 1 },
  },
  {
    description: 'one substitution is one apart',
    given: { from: 'boot.yml', into: 'boat.yml' },
    expect: { distance: 1 },
  },
  {
    description: 'an empty name is as far as the other is long',
    given: { from: '', into: 'abc' },
    expect: { distance: 3 },
  },
];

/**
 * .what = pins the filter, threshold, order, and cap of the near-match offer
 * .why = an offer that fires on a distant name is worse than none, so each step is a row
 */
const NEARBY_CASES = [
  {
    description:
      'a one-edit-away spec is offered, an unrelated neighbor is not',
    given: {
      names: ['boot.yml', 'readme.md', 'zzzzzz.yml'],
      nameTyped: 'boot.yaml',
    },
    expect: { names: ['boot.yml'] },
  },
  {
    description: 'a non-yaml neighbor is never offered, however close',
    given: { names: ['boot.ymx', 'boot.json'], nameTyped: 'boot.yml' },
    expect: { names: [] },
  },
  {
    description: 'a distant typo gets no offer',
    given: { names: ['boot.yml'], nameTyped: 'zzz.yml' },
    expect: { names: [] },
  },
  {
    description: 'offers sort nearest first, then by name',
    given: {
      names: ['bxxt.yml', 'boot.yml', 'boat.yml'],
      nameTyped: 'boot.yml.',
    },
    expect: { names: ['boot.yml', 'boat.yml', 'bxxt.yml'] },
  },
  {
    description: 'offers cap at three',
    given: {
      names: ['boot1.yml', 'boot2.yml', 'boot3.yml', 'boot4.yml'],
      nameTyped: 'boot.yml',
    },
    expect: { names: ['boot1.yml', 'boot2.yml', 'boot3.yml'] },
  },
];

describe('getAllNamesNearby', () => {
  DISTANCE_CASES.map((thisCase) =>
    test(`calcEditDistance: ${thisCase.description}`, () => {
      expect(calcEditDistance(thisCase.given)).toEqual(
        thisCase.expect.distance,
      );
    }),
  );

  NEARBY_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(getAllNamesNearby(thisCase.given)).toEqual(thisCase.expect.names);
    }),
  );
});
