import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { asBrainTokenMemoKey } from './asBrainTokenMemoKey';
import { getOneBrainTokenMemo } from './getOneBrainTokenMemo';
import { getOneBrainTokenMemoPath } from './getOneBrainTokenMemoPath';
import { setOneBrainTokenMemo } from './setOneBrainTokenMemo';

/**
 * .what = counts the tokens of one text
 * .why = the boot counters compose a counter rather than reach one, so the contract they
 *        depend upon is a type rather than a module path
 */
export type BrainTokenCounter = (input: { of: { words: string } }) => {
  chars: number;
  tokens: number;
};

/**
 * .what = the most counts the memo holds; the oldest are dropped first
 * .why = the memo is keyed by content, so each edit of a brief adds a key and none is ever
 *        reclaimed. a cap keeps the file small; a dropped count costs one recount, never a
 *        wrong one
 */
const BRAIN_TOKEN_MEMO_CAP = 4096;

/**
 * .what = the ONE owner of the lazy tokenizer boundary
 * .why = `js-tiktoken` must stay out of the bun binary's eval graph, and exactly one file
 *        should say so. two callers that each hold their own lazy load are two statements of
 *        one boundary contract — they agree until one is edited, and the perf invariant is
 *        what silently breaks when they diverge.
 *
 * 🔴 .note = this is a COMMUNICATOR, and its whole body is the boundary. `calcBootPayloadTokens`
 *   and `getAllCostRows` are compute operations that RECEIVE a `BrainTokenCounter` and stay
 *   pure and synchronous, which also lets their unit suites supply a cheap counter rather than
 *   construct a real encoder (`rule.require.dependency-injection`).
 *
 * 🔴 .note = the encoder is built ONLY on a memo miss. its construction costs ~1–2s (the
 *   o200k_base rank table), so `roles cost` paid that on every run before the memo. a count is
 *   a pure function of the text, so the memo is keyed by the text's digest and a hit returns
 *   the exact count the encoder would — a repeat run over unchanged briefs never loads it.
 *
 * .note = `memo: null` counts with no memo — for a caller with no repo to cache within. the
 *   memo is written only where `<cwd>/.agent` already exists, so a stray cwd never sprouts one.
 *
 * .note = the miss path loads `./calcBrainTokens` via a synchronous lazy `require`, because a
 *   `BrainTokenCounter` is synchronous. `load` is injectable so a test can observe that a hit
 *   never reaches the encoder.
 *
 * ⚠️ .note = the load path is the DIRECT module, never `@src/contract/sdk`. that barrel
 *   re-exports this very file, so the longer path crosses `domain.* → contract/` — a
 *   `rule.require.directional-deps` blocker — and drags ~25 modules into the one lazy load
 *   whose narrowness is its whole purpose.
 */
export const getOneBrainTokenCounter = async (
  input: { memo: { cwd: string } | null },
  context?: { load?: () => BrainTokenCounter },
): Promise<BrainTokenCounter> => {
  // the miss path: load the real encoder on first need, at most once
  const load =
    context?.load ??
    ((): BrainTokenCounter =>
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      (require('./calcBrainTokens') as typeof import('./calcBrainTokens'))
        .calcBrainTokens);
  // .note = deliberate mutation: the encoder is memoized once loaded, so a run loads it once
  let countTokensReal: BrainTokenCounter | null = null;
  const countTokensMissed = (words: string): number => {
    countTokensReal = countTokensReal ?? load();
    return countTokensReal({ of: { words } }).tokens;
  };

  // no memo: every count goes to the encoder
  const memoCwd = input.memo?.cwd ?? null;
  const isMemoWritable =
    memoCwd !== null && existsSync(join(memoCwd, '.agent'));
  if (!memoCwd || !isMemoWritable)
    return ({ of }) => ({
      chars: of.words.length,
      tokens: countTokensMissed(of.words),
    });

  // with a memo: a hit skips the encoder; a miss counts, then writes through
  const counts = new Map(
    Object.entries(
      getOneBrainTokenMemo({
        path: getOneBrainTokenMemoPath({ cwd: memoCwd }),
      }),
    ),
  );
  return ({ of }) => {
    const key = asBrainTokenMemoKey({ words: of.words });
    const tokensMemo = counts.get(key);
    if (tokensMemo !== undefined)
      return { chars: of.words.length, tokens: tokensMemo };

    // count the miss, drop the oldest past the cap, and persist
    // .note = deliberate mutation: the memo is a per-run cache this closure alone owns
    const tokens = countTokensMissed(of.words);
    counts.set(key, tokens);
    const keyOldest = counts.keys().next().value;
    if (counts.size > BRAIN_TOKEN_MEMO_CAP && keyOldest !== undefined)
      counts.delete(keyOldest);
    setOneBrainTokenMemo({ cwd: memoCwd, counts: Object.fromEntries(counts) });
    return { chars: of.words.length, tokens };
  };
};
