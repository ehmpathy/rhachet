import { BadRequestError } from 'helpful-errors';

import type { KeyrackKeyGrade } from '@src/domain.objects/keyrack';

import { detectKeyGradeChange } from './detectKeyGradeChange';

/**
 * .what = assert that a grade change does not represent degradation
 * .why = grades must never degrade — this enforces the security boundary
 *
 * .note = throws BadRequestError if degradation detected (user mistake, not system error)
 */
export const assertKeyGradeProtected = (input: {
  source: KeyrackKeyGrade;
  target: KeyrackKeyGrade;
}): void => {
  const result = detectKeyGradeChange(input);

  // throw if degradation detected
  if (result.degrades) {
    throw new BadRequestError(`grade degradation forbidden: ${result.reason}`, {
      source: input.source,
      target: input.target,
    });
  }
};
