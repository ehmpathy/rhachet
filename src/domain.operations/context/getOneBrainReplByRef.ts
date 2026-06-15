import type { RefByUnique } from 'domain-objects';
import { BadRequestError } from 'helpful-errors';

import type { BrainRepl } from '@src/domain.objects/BrainRepl';

/**
 * .what = finds a brain repl by its unique reference
 * .why = enables lookup of registered repls by { repo, slug }
 */
export const getOneBrainReplByRef = (input: {
  repls: BrainRepl[];
  ref: RefByUnique<typeof BrainRepl>;
}): BrainRepl => {
  // fail fast if no repls available
  if (input.repls.length === 0)
    BadRequestError.throw(
      `no repls available in context

pass repls via genContextBrain({ brains: { repls: [...] } }) or ensure
brain packages are installed for discovery mode.`,
      { ref: input.ref },
    );

  // lookup repl by ref
  const replFound = input.repls.find(
    (r) => r.repo === input.ref.repo && r.slug === input.ref.slug,
  );

  // fail if not found
  if (!replFound)
    BadRequestError.throw(
      `brain repl not found: ${input.ref.repo}/${input.ref.slug}

the repl was not registered in this context.
check that the repl is included in brains.repls or that the brain
package is installed for discovery mode.`,
      { ref: input.ref },
    );

  return replFound;
};
