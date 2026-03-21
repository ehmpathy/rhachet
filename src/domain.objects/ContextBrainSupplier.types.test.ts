/**
 * .what = type-level tests for ContextBrainSupplier
 * .why = verifies key structure, optional by mandate, and slug literal inference
 *
 * .note = these tests run at compile time, not runtime
 *   if the file compiles, the type tests pass
 */
import type { ContextBrainSupplier } from './ContextBrainSupplier';

// declare mock supplies types for type tests
interface BrainSuppliesXai {
  creds: () => Promise<{ XAI_API_KEY: string }>;
}

interface BrainSuppliesAnthropic {
  creds: () => Promise<{ ANTHROPIC_API_KEY: string }>;
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

  // negative: cannot call method without undefined check
  // @ts-expect-error - supplies may be undefined
  supplies.creds();

  // positive: after check, can call method
  if (supplies) {
    const _creds = supplies.creds();
  }
};

/**
 * runtime test that validates the type tests compiled successfully
 * if this file compiles, all type tests pass
 */
describe('ContextBrainSupplier types', () => {
  it('should compile type tests successfully', () => {
    // if we reach here, all type tests above compiled successfully
    expect(true).toBe(true);
  });
});
