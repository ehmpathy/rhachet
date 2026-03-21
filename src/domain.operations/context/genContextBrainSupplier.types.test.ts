/**
 * .what = type-level tests for genContextBrainSupplier
 * .why = verifies return type inference, slug literal preservation, and assignability
 *
 * .note = these tests run at compile time, not runtime
 *   if the file compiles, the type tests pass
 */
import type { ContextBrainSupplier } from '@src/domain.objects/ContextBrainSupplier';

import { genContextBrainSupplier } from './genContextBrainSupplier';

// declare mock supplies types for type tests
interface BrainSuppliesXai {
  creds: () => Promise<{ XAI_API_KEY: string }>;
}

interface BrainSuppliesAnthropic {
  creds: () => Promise<{ ANTHROPIC_API_KEY: string }>;
}

/**
 * test: return type inference preserves slug literal
 */
() => {
  const ctx = genContextBrainSupplier('xai', {
    creds: async () => ({ XAI_API_KEY: 'key' }),
  });

  // positive: key is 'brain.supplier.xai' (literal)
  const _supplies = ctx['brain.supplier.xai'];

  // negative: wrong slug key does not exist
  // @ts-expect-error - 'brain.supplier.wrong' does not exist
  const _wrongKey = ctx['brain.supplier.wrong'];
};

/**
 * test: supplies type flows through
 */
() => {
  const ctx = genContextBrainSupplier('xai', {
    creds: async () => ({ XAI_API_KEY: 'key' }),
  });

  const supplies = ctx['brain.supplier.xai'];

  // positive: supplies has creds method
  if (supplies) {
    const _creds = supplies.creds();
  }

  // negative: supplies does not have wrong method
  // @ts-expect-error - 'wrongMethod' does not exist on supplies
  supplies?.wrongMethod();
};

/**
 * test: result is assignable to ContextBrainSupplier
 */
() => {
  const ctx = genContextBrainSupplier('xai', {
    creds: async () => ({ XAI_API_KEY: 'key' }),
  } as BrainSuppliesXai);

  // positive: assignable to correct ContextBrainSupplier type
  const _typed: ContextBrainSupplier<'xai', BrainSuppliesXai> = ctx;

  // negative: not assignable to different slug type
  // @ts-expect-error - 'xai' is not 'anthropic'
  const _wrongSlug: ContextBrainSupplier<'anthropic', BrainSuppliesAnthropic> =
    ctx;
};

/**
 * test: multiple supplier contexts via spread
 */
() => {
  const ctxXai = genContextBrainSupplier('xai', {
    creds: async () => ({ XAI_API_KEY: 'key' }),
  } as BrainSuppliesXai);

  const ctxAnthropic = genContextBrainSupplier('anthropic', {
    creds: async () => ({ ANTHROPIC_API_KEY: 'key' }),
  } as BrainSuppliesAnthropic);

  const combined = { ...ctxXai, ...ctxAnthropic };

  // positive: both keys exist
  const _xaiSupplies = combined['brain.supplier.xai'];
  const _anthropicSupplies = combined['brain.supplier.anthropic'];

  // positive: assignable to intersection type
  const _typed: ContextBrainSupplier<'xai', BrainSuppliesXai> &
    ContextBrainSupplier<'anthropic', BrainSuppliesAnthropic> = combined;
};

/**
 * test: different slug types produce incompatible results
 */
() => {
  const ctxXai = genContextBrainSupplier('xai', {
    creds: async () => ({ XAI_API_KEY: 'key' }),
  });

  const ctxAnthropic = genContextBrainSupplier('anthropic', {
    creds: async () => ({ ANTHROPIC_API_KEY: 'key' }),
  });

  // negative: cannot access xai key on anthropic context
  // @ts-expect-error - 'brain.supplier.xai' does not exist
  const _wrongAccess = ctxAnthropic['brain.supplier.xai'];

  // negative: cannot access anthropic key on xai context
  // @ts-expect-error - 'brain.supplier.anthropic' does not exist
  const _wrongAccess2 = ctxXai['brain.supplier.anthropic'];
};

/**
 * runtime test that validates the type tests compiled successfully
 * if this file compiles, all type tests pass
 */
describe('genContextBrainSupplier types', () => {
  it('should compile type tests successfully', () => {
    // if we reach here, all type tests above compiled successfully
    expect(true).toBe(true);
  });
});
