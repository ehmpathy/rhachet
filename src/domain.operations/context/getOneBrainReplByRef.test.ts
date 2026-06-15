import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genMockedBrainRepl } from '@src/.test.assets/genMockedBrainRepl';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';

import { getOneBrainReplByRef } from './getOneBrainReplByRef';

describe('getOneBrainReplByRef', () => {
  given('[case1] repls array contains matching repl', () => {
    const mockRepl = genMockedBrainRepl();
    const repls = [mockRepl];

    when('[t0] getOneBrainReplByRef is called with matching ref', () => {
      then('it returns the matching repl', () => {
        const result = getOneBrainReplByRef({
          repls,
          ref: mockRepl,
        });
        expect(result).toBe(mockRepl);
      });
    });
  });

  given('[case2] repls array is empty', () => {
    const mockRepl = genMockedBrainRepl();
    const repls: BrainRepl[] = [];

    when('[t0] getOneBrainReplByRef is called', () => {
      then('it throws BadRequestError with "no repls available"', () => {
        const error = getError(() =>
          getOneBrainReplByRef({
            repls,
            ref: mockRepl,
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect((error as BadRequestError).message).toMatchSnapshot();
      });
    });
  });

  given('[case3] repls array does not contain matching repl', () => {
    const mockReplInArray = genMockedBrainRepl({
      repo: '__mock_repo_other__',
      slug: '__mock_repl_other__',
    });
    const mockReplToFind = genMockedBrainRepl();
    const repls = [mockReplInArray];

    when('[t0] getOneBrainReplByRef is called with non-matched ref', () => {
      then('it throws BadRequestError with "brain repl not found"', () => {
        const error = getError(() =>
          getOneBrainReplByRef({
            repls,
            ref: mockReplToFind,
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect((error as BadRequestError).message).toMatchSnapshot();
      });
    });
  });

  given('[case4] repls array has multiple repls', () => {
    const repl1 = genMockedBrainRepl({
      repo: '__mock_repo_1__',
      slug: '__mock_repl_1__',
      description: 'first repl',
    });
    const repl2 = genMockedBrainRepl({
      repo: '__mock_repo_2__',
      slug: '__mock_repl_2__',
      description: 'second repl',
    });
    const repls = [repl1, repl2];

    when('[t0] getOneBrainReplByRef is called for second repl', () => {
      then('it returns the correct repl', () => {
        const result = getOneBrainReplByRef({
          repls,
          ref: repl2,
        });
        expect(result).toBe(repl2);
        expect(result.description).toEqual('second repl');
      });
    });
  });
});
