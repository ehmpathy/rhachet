import type { RefByUnique } from 'domain-objects';
import { BadRequestError } from 'helpful-errors';

import type { BrainAtom } from '@src/domain.objects/BrainAtom';

/**
 * .what = finds a brain atom by its unique reference
 * .why = enables lookup of registered atoms by { repo, slug }
 */
export const findBrainAtomByRef = (input: {
  atoms: BrainAtom[];
  ref: RefByUnique<typeof BrainAtom>;
}): BrainAtom => {
  // fail fast if no atoms available
  if (input.atoms.length === 0)
    throw new BadRequestError('no atoms available in context', {
      ref: input.ref,
    });

  // lookup atom by ref
  const atomFound = input.atoms.find(
    (a) => a.repo === input.ref.repo && a.slug === input.ref.slug,
  );

  // fail if not found
  if (!atomFound)
    throw new BadRequestError('brain atom not found', { ref: input.ref });

  return atomFound;
};
