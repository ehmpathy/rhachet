import { BadRequestError } from 'helpful-errors';

import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import { BrainChoiceNotFoundError } from '@src/domain.objects/BrainChoiceNotFoundError';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type {
  BrainChoice,
  ContextBrain,
} from '@src/domain.objects/ContextBrain';
import { asBrainOutput } from '@src/domain.operations/brain/asBrainOutput';

import { findBrainAtomByRef } from './findBrainAtomByRef';
import { findBrainReplByRef } from './findBrainReplByRef';
import { getAvailableBrainsInWords } from './getAvailableBrainsInWords';

/**
 * .what = computes full slug from brain repo and slug
 * .why = enables match against user-friendly choice strings like 'xai/grok-3-fast'
 */
const getBrainSlugFull = (brain: { repo: string; slug: string }): string =>
  `${brain.repo}/${brain.slug}`;

/**
 * .what = factory to create a brain context from plugin-provided atoms and repls
 * .why =
 *   - provides a clean entry point for context creation
 *   - validates no duplicate { repo, slug } identifiers
 *   - composes the context with lookup and delegation logic
 *   - optionally pre-binds a chosen brain to brain.choice
 *
 * @throws {BrainChoiceNotFoundError} when choice does not match any available brain.
 *   the error message includes a formatted list of available brains sorted by
 *   similarity to the requested choice. consumers can catch this error to display
 *   the helpful message via stderr:
 *   ```ts
 *   try {
 *     return genContextBrain({ atoms, repls, choice });
 *   } catch (error) {
 *     if (error instanceof BrainChoiceNotFoundError) {
 *       console.error(error.message);
 *       process.exit(1);
 *     }
 *     throw error;
 *   }
 *   ```
 *
 * @throws {BadRequestError} when choice matches multiple brains (ambiguous)
 */
export function genContextBrain(input: {
  atoms?: BrainAtom[];
  repls?: BrainRepl[];
  choice: { repl: string };
}): ContextBrain<BrainRepl>;
export function genContextBrain(input: {
  atoms?: BrainAtom[];
  repls?: BrainRepl[];
  choice: { atom: string };
}): ContextBrain<BrainAtom>;
export function genContextBrain(input: {
  atoms?: BrainAtom[];
  repls?: BrainRepl[];
  choice: string;
}): ContextBrain<BrainChoice>;
export function genContextBrain(input: {
  atoms?: BrainAtom[];
  repls?: BrainRepl[];
  choice?: undefined;
}): ContextBrain<null>;
export function genContextBrain(input: {
  atoms?: BrainAtom[];
  repls?: BrainRepl[];
  choice?: string | { repl: string } | { atom: string };
}): ContextBrain {
  // default to empty arrays
  const atoms = input.atoms ?? [];
  const repls = input.repls ?? [];

  // validate no duplicate atoms
  const atomKeys = atoms.map((a) => `${a.repo}:${a.slug}`);
  const duplicateAtom = atomKeys.find((k, i) => atomKeys.indexOf(k) !== i);
  if (duplicateAtom)
    throw new BadRequestError('duplicate atom identifier', { duplicateAtom });

  // validate no duplicate repls
  const replKeys = repls.map((r) => `${r.repo}:${r.slug}`);
  const duplicateRepl = replKeys.find((k, i) => replKeys.indexOf(k) !== i);
  if (duplicateRepl)
    throw new BadRequestError('duplicate repl identifier', { duplicateRepl });

  // resolve choice if provided
  const brainChoice = ((): BrainChoice | null => {
    // no choice provided
    if (!input.choice) return null;

    // typed choice: { repl: string }
    if (typeof input.choice === 'object' && 'repl' in input.choice) {
      const choiceSlug = input.choice.repl;
      const replMatched = repls.find((r) => getBrainSlugFull(r) === choiceSlug);
      if (!replMatched)
        throw new BrainChoiceNotFoundError(
          `repl brain not found: ${choiceSlug}

${getAvailableBrainsInWords({ atoms: [], repls, choice: choiceSlug })}`,
          {
            choice: input.choice,
            available: { repls: repls.map(getBrainSlugFull) },
          },
        );
      return replMatched;
    }

    // typed choice: { atom: string }
    if (typeof input.choice === 'object' && 'atom' in input.choice) {
      const choiceSlug = input.choice.atom;
      const atomMatched = atoms.find((a) => getBrainSlugFull(a) === choiceSlug);
      if (!atomMatched)
        throw new BrainChoiceNotFoundError(
          `atom brain not found: ${choiceSlug}

${getAvailableBrainsInWords({ atoms, repls: [], choice: choiceSlug })}`,
          {
            choice: input.choice,
            available: { atoms: atoms.map(getBrainSlugFull) },
          },
        );
      return atomMatched;
    }

    // generic choice: string
    const atomsMatched = atoms.filter(
      (a) => getBrainSlugFull(a) === input.choice,
    );
    const replsMatched = repls.filter(
      (r) => getBrainSlugFull(r) === input.choice,
    );
    const allMatched = [...atomsMatched, ...replsMatched];

    // not found
    if (allMatched.length === 0)
      throw new BrainChoiceNotFoundError(
        `brain not found: ${input.choice}

${getAvailableBrainsInWords({ atoms, repls, choice: input.choice })}`,
        {
          choice: input.choice,
          available: {
            atoms: atoms.map(getBrainSlugFull),
            repls: repls.map(getBrainSlugFull),
          },
        },
      );

    // ambiguous
    if (allMatched.length > 1)
      throw new BadRequestError(`ambiguous brain slug: ${input.choice}`, {
        choice: input.choice,
        matched: allMatched.map(getBrainSlugFull),
      });

    return allMatched[0]!;
  })();

  // return context with lookup and delegation
  return {
    brain: {
      atom: {
        ask: async (askInput) => {
          const atom = findBrainAtomByRef({ atoms, ref: askInput.brain });
          const result = await atom.ask(askInput, {});
          return asBrainOutput(result) as any;
        },
      },
      repl: {
        ask: async (askInput) => {
          const repl = findBrainReplByRef({ repls, ref: askInput.brain });
          const result = await repl.ask(askInput, {});
          return asBrainOutput(result) as any;
        },
        act: async (actInput) => {
          const repl = findBrainReplByRef({ repls, ref: actInput.brain });
          const result = await repl.act(actInput, {});
          return asBrainOutput(result) as any;
        },
      },
      choice: brainChoice,
    },
  };
}
