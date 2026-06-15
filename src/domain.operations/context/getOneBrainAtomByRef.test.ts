import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genMockedBrainAtom } from '@src/.test.assets/genMockedBrainAtom';
import type { BrainAtom } from '@src/domain.objects/BrainAtom';

import { getOneBrainAtomByRef } from './getOneBrainAtomByRef';

describe('getOneBrainAtomByRef', () => {
  given('[case1] atoms array contains matching atom', () => {
    const mockAtom = genMockedBrainAtom();
    const atoms = [mockAtom];

    when('[t0] getOneBrainAtomByRef is called with matching ref', () => {
      then('it returns the matching atom', () => {
        const result = getOneBrainAtomByRef({
          atoms,
          ref: mockAtom,
        });
        expect(result).toBe(mockAtom);
      });
    });
  });

  given('[case2] atoms array is empty', () => {
    const mockAtom = genMockedBrainAtom();
    const atoms: BrainAtom[] = [];

    when('[t0] getOneBrainAtomByRef is called', () => {
      then('it throws BadRequestError with "no atoms available"', () => {
        const error = getError(() =>
          getOneBrainAtomByRef({
            atoms,
            ref: mockAtom,
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect((error as BadRequestError).message).toMatchSnapshot();
      });
    });
  });

  given('[case3] atoms array does not contain matching atom', () => {
    const mockAtomInArray = genMockedBrainAtom({
      repo: '__mock_repo_other__',
      slug: '__mock_atom_other__',
    });
    const mockAtomToFind = genMockedBrainAtom();
    const atoms = [mockAtomInArray];

    when('[t0] getOneBrainAtomByRef is called with non-matching ref', () => {
      then('it throws BadRequestError with "brain atom not found"', () => {
        const error = getError(() =>
          getOneBrainAtomByRef({
            atoms,
            ref: mockAtomToFind,
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect((error as BadRequestError).message).toMatchSnapshot();
      });
    });
  });

  given('[case4] atoms array has multiple atoms', () => {
    const atom1 = genMockedBrainAtom({
      repo: '__mock_repo_1__',
      slug: '__mock_atom_1__',
      description: 'first atom',
    });
    const atom2 = genMockedBrainAtom({
      repo: '__mock_repo_2__',
      slug: '__mock_atom_2__',
      description: 'second atom',
    });
    const atoms = [atom1, atom2];

    when('[t0] getOneBrainAtomByRef is called for second atom', () => {
      then('it returns the correct atom', () => {
        const result = getOneBrainAtomByRef({
          atoms,
          ref: atom2,
        });
        expect(result).toBe(atom2);
        expect(result.description).toEqual('second atom');
      });
    });
  });
});
