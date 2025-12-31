import { BadRequestError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { genMockedBrainRepl } from '@src/__test_assets__/genMockedBrainRepl';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';

import { findBrainReplByRef } from './findBrainReplByRef';

describe('findBrainReplByRef', () => {
  given('[case1] repls array contains matching repl', () => {
    const mockRepl = genMockedBrainRepl();
    const repls = [mockRepl];

    when('[t0] findBrainReplByRef is called with matching ref', () => {
      then('it returns the matching repl', () => {
        const result = findBrainReplByRef({
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

    when('[t0] findBrainReplByRef is called', () => {
      then('it throws BadRequestError with "no repls available"', () => {
        expect(() =>
          findBrainReplByRef({
            repls,
            ref: mockRepl,
          }),
        ).toThrow(BadRequestError);

        try {
          findBrainReplByRef({
            repls,
            ref: mockRepl,
          });
        } catch (error) {
          expect((error as Error).message).toContain('no repls available');
        }
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

    when('[t0] findBrainReplByRef is called with non-matching ref', () => {
      then('it throws BadRequestError with "brain repl not found"', () => {
        expect(() =>
          findBrainReplByRef({
            repls,
            ref: mockReplToFind,
          }),
        ).toThrow(BadRequestError);

        try {
          findBrainReplByRef({
            repls,
            ref: mockReplToFind,
          });
        } catch (error) {
          expect((error as Error).message).toContain('brain repl not found');
        }
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

    when('[t0] findBrainReplByRef is called for second repl', () => {
      then('it returns the correct repl', () => {
        const result = findBrainReplByRef({
          repls,
          ref: repl2,
        });
        expect(result).toBe(repl2);
        expect(result.description).toEqual('second repl');
      });
    });
  });
});
