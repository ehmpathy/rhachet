import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genMockedBrainAtom } from './genMockedBrainAtom';

describe('genMockedBrainAtom', () => {
  given('[case1] a mock told both content and output', () => {
    when('[t0] the mock is built', () => {
      then('it refuses, so neither input is dropped in silence', async () => {
        const error = await getError(() =>
          genMockedBrainAtom({
            content: 'hi',
            output: { ask: { answer: 'hi' } },
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain(
          'genMockedBrainAtom was told both content and output',
        );
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('[case2] a mock told content alone', () => {
    when('[t0] the mock is built', () => {
      then('it builds an atom', () => {
        expect(genMockedBrainAtom({ content: 'hi' }).slug).toEqual(
          '__mock_atom__',
        );
      });
    });
  });
});
