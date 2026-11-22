import { given, then, when } from 'test-fns';

import { asPathsSorted } from './asPathsSorted';

const TEST_CASES = [
  {
    description: 'sorts paths into lexical order',
    given: { paths: ['/r/role=zeta', '/r/role=any', '/r/role=lint'] },
    expect: { output: ['/r/role=any', '/r/role=lint', '/r/role=zeta'] },
  },
  {
    description: 'an empty list stays empty',
    given: { paths: [] },
    expect: { output: [] },
  },
];

describe('asPathsSorted', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the transformer runs', () => {
        then('it returns the expected output', () => {
          expect(asPathsSorted({ paths: thisCase.given.paths })).toEqual(
            thisCase.expect.output,
          );
        });
      });
    }),
  );

  given(`[case${TEST_CASES.length + 1}] a list in a caller's hands`, () => {
    when('[t0] the transformer runs', () => {
      then('leaves the input list as is', () => {
        const paths = ['/b', '/a'];
        asPathsSorted({ paths });
        expect(paths).toEqual(['/b', '/a']);
      });
    });
  });
});
