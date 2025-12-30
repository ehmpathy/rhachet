import type { RefByUnique } from 'domain-objects';
import { BadRequestError } from 'helpful-errors';

import type { BrainRepl } from '@src/domain.objects/BrainRepl';

/**
 * .what = finds a brain repl by its unique reference
 * .why = enables lookup of registered repls by { repo, slug }
 */
export const findBrainReplByRef = (input: {
  repls: BrainRepl[];
  ref: RefByUnique<typeof BrainRepl>;
}): BrainRepl => {
  // fail fast if no repls available
  if (input.repls.length === 0)
    throw new BadRequestError('no repls available in context', {
      ref: input.ref,
    });

  // lookup repl by ref
  const replFound = input.repls.find(
    (r) => r.repo === input.ref.repo && r.slug === input.ref.slug,
  );

  // fail if not found
  if (!replFound)
    throw new BadRequestError('brain repl not found', { ref: input.ref });

  return replFound;
};
