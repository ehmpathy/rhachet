/**
 * .what = type-level tests for genContextBrain return type precision
 * .why = verifies that function overloads provide correct compile-time types
 *
 * .note = these tests run at compile time, not runtime
 *   if the file compiles, the type tests pass
 */
import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import { isBrainAtom, isBrainRepl } from '@src/domain.objects/ContextBrain';

import { genContextBrain } from './genContextBrain';

// declare mock brains for type tests
declare const atoms: BrainAtom[];
declare const repls: BrainRepl[];

/**
 * test: no choice → brain.choice is null
 */
() => {
  const context = genContextBrain({ atoms, repls });

  // positive: brain.choice is null
  const _choice: null = context.brain.choice;

  // negative: brain.choice is not BrainAtom
  // @ts-expect-error - brain.choice is null, not BrainAtom
  const _atom: BrainAtom = context.brain.choice;

  // negative: brain.choice is not BrainRepl
  // @ts-expect-error - brain.choice is null, not BrainRepl
  const _repl: BrainRepl = context.brain.choice;
};

/**
 * test: choice: undefined → brain.choice is null
 */
() => {
  const context = genContextBrain({ atoms, repls, choice: undefined });

  // positive: brain.choice is null
  const _choice: null = context.brain.choice;
};

/**
 * test: choice: { repl: string } → brain.choice is BrainRepl
 */
() => {
  const context = genContextBrain({
    atoms,
    repls,
    choice: { repl: 'anthropic/claude-code' },
  });

  // positive: brain.choice is BrainRepl
  const _repl: BrainRepl = context.brain.choice;

  // positive: can access act method (repl-only)
  const _act = context.brain.choice.act;

  // negative: brain.choice is not null
  // @ts-expect-error - brain.choice is BrainRepl, not null
  const _null: null = context.brain.choice;

  // negative: brain.choice is not BrainAtom (since it's a typed repl choice)
  // @ts-expect-error - brain.choice is BrainRepl, not BrainAtom
  const _atom: BrainAtom = context.brain.choice;
};

/**
 * test: choice: { atom: string } → brain.choice is BrainAtom
 */
() => {
  const context = genContextBrain({
    atoms,
    repls,
    choice: { atom: 'xai/grok-3' },
  });

  // positive: brain.choice is BrainAtom
  const _atom: BrainAtom = context.brain.choice;

  // positive: can access ask method (atom has ask)
  const _ask = context.brain.choice.ask;

  // negative: brain.choice is not null
  // @ts-expect-error - brain.choice is BrainAtom, not null
  const _null: null = context.brain.choice;

  // negative: cannot access act method (atom does not have act)
  // @ts-expect-error - BrainAtom does not have act method
  const _act = context.brain.choice.act;
};

/**
 * test: choice: string → brain.choice is BrainAtom | BrainRepl
 */
() => {
  const context = genContextBrain({
    atoms,
    repls,
    choice: 'xai/grok-3',
  });

  // positive: brain.choice is BrainAtom | BrainRepl (not null)
  const _choice: BrainAtom | BrainRepl = context.brain.choice;

  // positive: can access common properties
  const _repo: string = context.brain.choice.repo;
  const _slug: string = context.brain.choice.slug;
  const _ask = context.brain.choice.ask;

  // negative: brain.choice is not null
  // @ts-expect-error - brain.choice is BrainChoice, not null
  const _null: null = context.brain.choice;

  // negative: cannot access act directly (might be atom)
  // @ts-expect-error - act might not exist (could be BrainAtom)
  const _act = context.brain.choice.act;
};

/**
 * test: type guard isBrainAtom narrows to BrainAtom
 */
() => {
  const context = genContextBrain({
    atoms,
    repls,
    choice: 'xai/grok-3',
  });

  if (isBrainAtom(context.brain.choice)) {
    // positive: inside guard, brain.choice is BrainAtom
    const _atom: BrainAtom = context.brain.choice;
    const _ask = context.brain.choice.ask;

    // negative: act does not exist on atom
    // @ts-expect-error - BrainAtom does not have act method
    const _act = context.brain.choice.act;
  }
};

/**
 * test: type guard isBrainRepl narrows to BrainRepl
 */
() => {
  const context = genContextBrain({
    atoms,
    repls,
    choice: 'anthropic/claude-code',
  });

  if (isBrainRepl(context.brain.choice)) {
    // positive: inside guard, brain.choice is BrainRepl
    const _repl: BrainRepl = context.brain.choice;
    const _ask = context.brain.choice.ask;
    const _act = context.brain.choice.act;
  }
};

/**
 * runtime test that validates the type tests compiled successfully
 * if this file compiles, all type tests pass
 */
describe('genContextBrain types', () => {
  it('should compile type tests successfully', () => {
    // if we reach here, all type tests above compiled successfully
    expect(true).toBe(true);
  });
});
