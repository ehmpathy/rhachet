import { BadRequestError } from 'helpful-errors';
import { createCache } from 'simple-in-memory-cache';
import { withSimpleCache } from 'with-simple-cache';

import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import { BrainChoiceNotFoundError } from '@src/domain.objects/BrainChoiceNotFoundError';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type { BrainSuppliesCreds } from '@src/domain.objects/BrainSuppliesCreds';
import {
  type BrainChoice,
  type ContextBrain,
  isBrainRepl,
} from '@src/domain.objects/ContextBrain';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { asBrainAtomWithContextBound } from '@src/domain.operations/brain/asBrainAtomWithContextBound';
import { asBrainReplWithContextBound } from '@src/domain.operations/brain/asBrainReplWithContextBound';
import { getAvailableBrains } from '@src/domain.operations/brains/getAvailableBrains';
import { getBrainSlugFull } from '@src/domain.operations/brains/getBrainSlugFull';

import { genContextBrainSupplier } from './genContextBrainSupplier';
import { getAvailableBrainsInWords } from './getAvailableBrainsInWords';
import { getOneBrainAtomByRef } from './getOneBrainAtomByRef';
import { getOneBrainReplByRef } from './getOneBrainReplByRef';
import { getOneDuplicateBrainKey } from './getOneDuplicateBrainKey';

/**
 * .what = factory to create a brain context with discovery or explicit brains
 * .why =
 *   - provides a clean entry point for context creation
 *   - supports auto-discovery of installed brain packages (async mode)
 *   - supports explicit brain lists for controlled environments (sync mode)
 *   - validates no duplicate { repo, slug } identifiers
 *   - composes the context with lookup and delegation logic
 *   - optionally pre-binds a chosen brain to brain.choice
 *
 * modes:
 *   - discovery mode (async): `await genContextBrain({ choice })`
 *   - explicit mode (sync): `genContextBrain({ brains: { atoms, repls }, choice })`
 *
 * @throws {BrainChoiceNotFoundError} when choice does not match any available brain.
 *   the error message includes a formatted list of available brains sorted by
 *   similarity to the requested choice. consumers can catch this error to display
 *   the helpful message via stderr:
 *   ```ts
 *   try {
 *     return await genContextBrain({ choice });
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

// discovery mode overloads (async)
export function genContextBrain(
  input: { choice: { repl: string }; creds?: BrainSuppliesCreds<any> },
  context?: ContextCli,
): Promise<ContextBrain<BrainRepl>>;
export function genContextBrain(
  input: { choice: { atom: string }; creds?: BrainSuppliesCreds<any> },
  context?: ContextCli,
): Promise<ContextBrain<BrainAtom>>;
export function genContextBrain(
  input: { choice: string; creds?: BrainSuppliesCreds<any> },
  context?: ContextCli,
): Promise<ContextBrain<BrainChoice>>;
export function genContextBrain(
  input: { choice?: undefined; creds?: BrainSuppliesCreds<any> },
  context?: ContextCli,
): Promise<ContextBrain<null>>;
export function genContextBrain(
  input: { creds?: BrainSuppliesCreds<any> },
  context?: ContextCli,
): Promise<ContextBrain<null>>;

// explicit mode overloads (sync)
export function genContextBrain(input: {
  brains: { atoms?: BrainAtom[]; repls?: BrainRepl[] };
  choice: { repl: string };
  creds?: BrainSuppliesCreds<any>;
}): ContextBrain<BrainRepl>;
export function genContextBrain(input: {
  brains: { atoms?: BrainAtom[]; repls?: BrainRepl[] };
  choice: { atom: string };
  creds?: BrainSuppliesCreds<any>;
}): ContextBrain<BrainAtom>;
export function genContextBrain(input: {
  brains: { atoms?: BrainAtom[]; repls?: BrainRepl[] };
  choice: string;
  creds?: BrainSuppliesCreds<any>;
}): ContextBrain<BrainChoice>;
export function genContextBrain(input: {
  brains: { atoms?: BrainAtom[]; repls?: BrainRepl[] };
  choice?: undefined;
  creds?: BrainSuppliesCreds<any>;
}): ContextBrain<null>;

// implementation
export function genContextBrain(
  input: {
    brains?: { atoms?: BrainAtom[]; repls?: BrainRepl[] };
    choice?: string | { repl: string } | { atom: string };
    creds?: BrainSuppliesCreds<any>;
  },
  context?: ContextCli,
): ContextBrain | Promise<ContextBrain> {
  // detect mode based on brains presence
  const isExplicitMode = 'brains' in input && input.brains !== undefined;

  // explicit mode: sync
  if (isExplicitMode) {
    const atoms = input.brains?.atoms ?? [];
    const repls = input.brains?.repls ?? [];
    return buildContextBrain({
      atoms,
      repls,
      choice: input.choice,
      creds: input.creds,
    });
  }

  // discovery mode: async
  return (async () => {
    const brainsFound = await getAvailableBrains({}, context);
    return buildContextBrain({
      atoms: brainsFound.atoms,
      repls: brainsFound.repls,
      choice: input.choice,
      creds: input.creds,
    });
  })();
}

/**
 * .what = builds the ContextBrain from atoms, repls, and optional choice
 * .why = shared logic between discovery and explicit modes
 */
const buildContextBrain = (input: {
  atoms: BrainAtom[];
  repls: BrainRepl[];
  choice?: string | { repl: string } | { atom: string };
  creds?: BrainSuppliesCreds<any>;
}): ContextBrain => {
  const { atoms, repls, creds } = input;

  // JIT supplier context getter with per-repo cache
  const getContextOfSupplier = withSimpleCache(
    (repoInput: { repo: string }): Record<string, unknown> => {
      if (!creds) return {};
      return genContextBrainSupplier(repoInput.repo, { creds });
    },
    { cache: createCache() },
  );

  // validate no duplicate atoms
  const duplicateAtomKey = getOneDuplicateBrainKey({ brains: atoms });
  if (duplicateAtomKey)
    BadRequestError.throw(
      `duplicate atom identifier: ${duplicateAtomKey}

each atom must have a unique {repo, slug} combination.
remove the duplicate or rename one of the atoms.`,
      { duplicateAtomKey, atoms: atoms.map((a) => `${a.repo}:${a.slug}`) },
    );

  // validate no duplicate repls
  const duplicateReplKey = getOneDuplicateBrainKey({ brains: repls });
  if (duplicateReplKey)
    BadRequestError.throw(
      `duplicate repl identifier: ${duplicateReplKey}

each repl must have a unique {repo, slug} combination.
remove the duplicate or rename one of the repls.`,
      { duplicateReplKey, repls: repls.map((r) => `${r.repo}:${r.slug}`) },
    );

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
      BadRequestError.throw(
        `ambiguous brain slug: ${input.choice}

multiple brains match this slug. use a typed choice to disambiguate:
  choice: { atom: '${input.choice}' }  // for atom brain
  choice: { repl: '${input.choice}' }  // for repl brain`,
        { choice: input.choice, matched: allMatched.map(getBrainSlugFull) },
      );

    return allMatched[0]!;
  })();

  // wrap choice brain with its own supplier context
  const choiceBound = ((): BrainChoice | null => {
    if (!brainChoice) return null;
    const contextOfSupplier = getContextOfSupplier({ repo: brainChoice.repo });
    if (isBrainRepl(brainChoice))
      return asBrainReplWithContextBound(brainChoice, contextOfSupplier);
    return asBrainAtomWithContextBound(brainChoice, contextOfSupplier);
  })();

  // return context with lookup and delegation
  return {
    brain: {
      atom: {
        ask: async (askInput) => {
          const atom = getOneBrainAtomByRef({ atoms, ref: askInput.brain });
          const contextOfSupplier = getContextOfSupplier({ repo: atom.repo });
          const atomBound = asBrainAtomWithContextBound(
            atom,
            contextOfSupplier,
          );
          return atomBound.ask(askInput);
        },
      },
      repl: {
        ask: async (askInput) => {
          const repl = getOneBrainReplByRef({ repls, ref: askInput.brain });
          const contextOfSupplier = getContextOfSupplier({ repo: repl.repo });
          const replBound = asBrainReplWithContextBound(
            repl,
            contextOfSupplier,
          );
          return replBound.ask(askInput);
        },
        act: async (actInput) => {
          const repl = getOneBrainReplByRef({ repls, ref: actInput.brain });
          const contextOfSupplier = getContextOfSupplier({ repo: repl.repo });
          const replBound = asBrainReplWithContextBound(
            repl,
            contextOfSupplier,
          );
          return replBound.act(actInput);
        },
      },
      choice: choiceBound,
    },
  };
};
