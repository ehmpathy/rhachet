import type { RefByUnique } from 'domain-objects';
import { BadRequestError } from 'helpful-errors';

import type { BrainAtom } from '@src/domain.objects/BrainAtom';

/**
 * .what = finds a brain atom by its unique reference
 * .why = enables lookup of registered atoms by { repo, slug }
 */
export const getOneBrainAtomByRef = (input: {
  atoms: BrainAtom[];
  ref: RefByUnique<typeof BrainAtom>;
}): BrainAtom => {
  // fail fast if no atoms available
  if (input.atoms.length === 0)
    BadRequestError.throw(
      `no atoms available in context

pass atoms via genContextBrain({ brains: { atoms: [...] } }) or ensure
brain packages are installed for discovery mode.`,
      { ref: input.ref },
    );

  // lookup atom by ref
  const atomFound = input.atoms.find(
    (a) => a.repo === input.ref.repo && a.slug === input.ref.slug,
  );

  // fail if not found
  if (!atomFound)
    BadRequestError.throw(
      `brain atom not found: ${input.ref.repo}/${input.ref.slug}

the atom was not registered in this context.
check that the atom is included in brains.atoms or that the brain
package is installed for discovery mode.`,
      { ref: input.ref },
    );

  return atomFound;
};
