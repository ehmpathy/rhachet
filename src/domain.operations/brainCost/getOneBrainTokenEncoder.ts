import { encodingForModel, type Tiktoken } from 'js-tiktoken';

/**
 * .what = the bpe encoder every token count shares, constructed once per process
 * .why = encoder construction is expensive and does not vary by input, so a per-call
 *        construction pays a fixed cost for no gain
 *
 * .note = measured 2026-09-18 on this repo: construction ≈ 1,800ms, invariant to the
 *         input; encode ≈ 0.97 MB/s, the only part that scales. ⇒ a caller that
 *         constructs per call pays ~1.8s per call.
 *
 * ⚠️ the cache is module-scoped, never closure-scoped, so every caller in the process
 *   shares ONE encoder — a per-caller closure re-pays construction per caller. it is the
 *   one deliberate mutation here (`rule.require.immutable-vars`).
 *
 * ⚠️ `gpt-4o` selects the `o200k_base` vocabulary, so the count is EXACT for that
 *   vocabulary and approximate across other model families — disclose the residual
 *   wherever the count is published.
 *
 * ⚠️ the STATIC import is safe under `rule.forbid.eager-esm-imports-in-prod`:
 *   `js-tiktoken` is dual-published, so a CJS consumer resolves
 *   `exports['.'].require: ./dist/index.cjs`. verify with
 *   `rhx get.package.format --package js-tiktoken`.
 */
let encoderShared: Tiktoken | null = null;

export const getOneBrainTokenEncoder = (): Tiktoken => {
  // reuse the extant encoder — construction is the whole cost, and it is input-invariant
  if (encoderShared) return encoderShared;

  encoderShared = encodingForModel('gpt-4o');
  return encoderShared;
};
