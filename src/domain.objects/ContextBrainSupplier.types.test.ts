/**
 * .what = type-level tests for ContextBrainSupplier
 * .why = verifies key structure, optional by mandate, slug literal inference, and creds constraint
 *
 * .note = these tests run at compile time, not runtime
 *   if the file compiles, the type tests pass
 */
import type { BrainSuppliesCreds } from './BrainSuppliesCreds';
import type { ContextBrainSupplier } from './ContextBrainSupplier';

// declare mock supplies types for type tests
interface BrainSuppliesXai {
  creds: BrainSuppliesCreds<{ XAI_API_KEY: string }>;
}

interface BrainSuppliesAnthropic {
  creds: BrainSuppliesCreds<{ ANTHROPIC_API_KEY: string }>;
}

// local supplier with null creds
interface BrainSuppliesOllama {
  creds: null;
  endpoint?: string;
}

// bad supplies without creds
interface BadSuppliesNoCreds {
  foo: string;
}

/**
 * test: ContextBrainSupplier has key 'brain.supplier.${slug}'
 */
() => {
  type Context = ContextBrainSupplier<'xai', BrainSuppliesXai>;

  // positive: key exists as 'brain.supplier.xai'
  const ctx: Context = {
    'brain.supplier.xai': { creds: async () => ({ XAI_API_KEY: 'key' }) },
  };

  // positive: can access via the key
  const _supplies = ctx['brain.supplier.xai'];

  // negative: wrong key name errors
  // @ts-expect-error - 'brain.supplier.wrong' does not exist
  const _wrongKey = ctx['brain.supplier.wrong'];
};

/**
 * test: value is optional (optional by mandate)
 */
() => {
  type Context = ContextBrainSupplier<'xai', BrainSuppliesXai>;

  // positive: empty object is valid (optional value)
  const ctxEmpty: Context = {};

  // positive: undefined value is valid
  const ctxUndefined: Context = { 'brain.supplier.xai': undefined };

  // positive: full value is valid
  const ctxFull: Context = {
    'brain.supplier.xai': { creds: async () => ({ XAI_API_KEY: 'key' }) },
  };

  void ctxEmpty;
  void ctxUndefined;
  void ctxFull;
};

/**
 * test: value type must match TSupplies
 */
() => {
  type Context = ContextBrainSupplier<'xai', BrainSuppliesXai>;

  // negative: wrong supplies type errors
  const ctx: Context = {
    // @ts-expect-error - string is not assignable to BrainSuppliesXai
    'brain.supplier.xai': 'not supplies',
  };

  void ctx;
};

/**
 * test: slug literal is preserved (not widened to string)
 */
() => {
  type ContextXai = ContextBrainSupplier<'xai', BrainSuppliesXai>;
  type ContextAnthropic = ContextBrainSupplier<
    'anthropic',
    BrainSuppliesAnthropic
  >;

  // positive: each context has its specific key
  const xaiCtx: ContextXai = {
    'brain.supplier.xai': { creds: async () => ({ XAI_API_KEY: 'k' }) },
  };
  const anthCtx: ContextAnthropic = {
    'brain.supplier.anthropic': {
      creds: async () => ({ ANTHROPIC_API_KEY: 'k' }),
    },
  };

  // negative: cannot assign xai context to anthropic type
  // @ts-expect-error - 'brain.supplier.xai' key not valid for anthropic context
  const wrongAssign: ContextAnthropic = xaiCtx;

  void xaiCtx;
  void anthCtx;
  void wrongAssign;
};

/**
 * test: intersection of multiple supplier contexts
 */
() => {
  type ContextBoth = ContextBrainSupplier<'xai', BrainSuppliesXai> &
    ContextBrainSupplier<'anthropic', BrainSuppliesAnthropic>;

  // positive: intersection has both keys
  const ctx: ContextBoth = {
    'brain.supplier.xai': { creds: async () => ({ XAI_API_KEY: 'k' }) },
    'brain.supplier.anthropic': {
      creds: async () => ({ ANTHROPIC_API_KEY: 'k' }),
    },
  };

  // positive: can access both keys
  const _xaiSupplies = ctx['brain.supplier.xai'];
  const _anthropicSupplies = ctx['brain.supplier.anthropic'];
};

/**
 * test: access pattern with optional check
 */
() => {
  type Context = ContextBrainSupplier<'xai', BrainSuppliesXai>;

  const ctx: Context = {};

  // positive: optional access returns TSupplies | undefined
  const supplies = ctx['brain.supplier.xai'];

  // negative: cannot access creds without undefined check
  // @ts-expect-error - supplies may be undefined
  supplies.creds;

  // positive: after check, can access creds
  if (supplies) {
    const _creds = supplies.creds;
  }
};

/**
 * test: TSupplies must have creds field (constraint enforcement)
 */
() => {
  // positive: cloud supplier with BrainSuppliesCreds
  type ContextXai = ContextBrainSupplier<'xai', BrainSuppliesXai>;
  const xaiCtx: ContextXai = {
    'brain.supplier.xai': {
      creds: async () => ({ XAI_API_KEY: 'key' }),
    },
  };

  // positive: cloud supplier with keyrack shorthand
  type ContextFireworks = ContextBrainSupplier<
    'fireworks',
    { creds: BrainSuppliesCreds<{ FIREWORKS_API_KEY: string }>; model?: string }
  >;
  const fireworksCtx: ContextFireworks = {
    'brain.supplier.fireworks': {
      creds: { keyrack: { owner: 'ehmpath', env: 'test' } },
      model: 'llama-v3',
    },
  };

  // positive: local supplier with null creds
  type ContextOllama = ContextBrainSupplier<'ollama', BrainSuppliesOllama>;
  const ollamaCtx: ContextOllama = {
    'brain.supplier.ollama': {
      creds: null,
      endpoint: 'http://localhost:11434',
    },
  };

  // negative: supplies without creds field should error
  // @ts-expect-error - BadSuppliesNoCreds does not satisfy { creds: BrainSuppliesCreds<any> | null }
  type ContextBad = ContextBrainSupplier<'bad', BadSuppliesNoCreds>;

  void xaiCtx;
  void fireworksCtx;
  void ollamaCtx;
};

/**
 * test: creds must be correct shape
 */
() => {
  // negative: creds as string should error
  // @ts-expect-error - string does not satisfy BrainSuppliesCreds<any> | null
  const _badCreds: ContextBrainSupplier<'bad', { creds: string }> = {};

  // negative: creds as number should error
  // @ts-expect-error - number does not satisfy BrainSuppliesCreds<any> | null
  const _badCredsNum: ContextBrainSupplier<'bad', { creds: number }> = {};
};

/**
 * type tests compile-time verification
 * if this file compiles without errors, all @ts-expect-error annotations are verified
 * and all positive type assignments are valid
 *
 * .note = the describe/it wrapper exists to satisfy jest's requirement for at least one test
 *   the real verification happens at compile time via @ts-expect-error annotations
 */
describe('ContextBrainSupplier types', () => {
  it('exports the type from the module', () => {
    // verify the type is exported (compile-time check)
    const typeCheck: ContextBrainSupplier<'test', { creds: null }> = {};
    expect(typeCheck).toBeDefined();
  });
});
