import { getActorsIndexDir } from './getActorsIndexDir';

const TEST_CASES: {
  description: string;
  given: { actorsRoot: string; index: 'slugs' | 'serials' | 'exids' };
  expect: string;
}[] = [
  {
    description: 'the slugs index nests `.slugs` under the actors root',
    given: { actorsRoot: '/repo/.agent/.actors', index: 'slugs' },
    expect: '/repo/.agent/.actors/.slugs',
  },
  {
    description: 'the serials index nests `.serials` under the actors root',
    given: { actorsRoot: '/repo/.agent/.actors', index: 'serials' },
    expect: '/repo/.agent/.actors/.serials',
  },
  {
    description: 'the exids index nests `.exids` under the actors root',
    given: { actorsRoot: '/repo/.agent/.actors', index: 'exids' },
    expect: '/repo/.agent/.actors/.exids',
  },
];

describe('getActorsIndexDir', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const output = getActorsIndexDir(thisCase.given);
      expect(output).toEqual(thisCase.expect);
    }),
  );

  test('every index token is dot-prefixed under the root (single-owner format)', () => {
    // the ONE fact this transformer owns: each index folder is `.<index>` — so a
    // consumer never hand-rebuilds `.slugs`/`.serials`/`.exids` as a raw literal
    const root = '/repo/.agent/.actors';
    for (const index of ['slugs', 'serials', 'exids'] as const)
      expect(getActorsIndexDir({ actorsRoot: root, index })).toEqual(
        `${root}/.${index}`,
      );
  });
});
