import { MalfunctionError } from 'helpful-errors';

import type { BrainTokenCounter } from '../brainCost/getOneBrainTokenCounter';
import { asBootEmittedPayload } from './asBootEmittedPayload';
import type { BootPayloadMeasurable } from './BootPayloadMeasurable';

/**
 * .what = counts the real tokens of the WHOLE boot render — body and both stats blocks
 * .why = a budget refuses a boot, so the number it refuses on is measured rather than
 *        estimated, over the full emitted payload (`0.wish.md` requirement 7)
 *
 * ⚠️ .note = the count is SELF-REFERENTIAL — the stats block reports the number it is part
 *   of. the feedback is bounded, since the block's rendered length moves only when the
 *   digit-count of the number moves, so it settles in two passes; `PASSES_MAX` caps the
 *   pathological case at a terminated loop rather than a hang.
 *
 * 🔴 .note = a run that exhausts `PASSES_MAX` with no fixed point RAISES: no pass reproduced
 *   its own stats block, so no number it holds is one the render would print
 *   (`rule.forbid.failhide`).
 *
 * .note = each pass counts the EXACT emitted string, never a sum of parts, since a token can
 *   span a join boundary.
 *
 * 🔴 .note = the counter is INJECTED, so this compute leaf stays pure and synchronous. the
 *   lazy load lives in `getOneBrainTokenCounter`.
 *
 * .note = the count is exact for the `o200k_base` vocabulary and approximate across other
 *   model families — a residual disclosed wherever the budget is documented.
 */
export const calcBootPayloadTokens = (
  input: { of: BootPayloadMeasurable },
  context: { countTokens: BrainTokenCounter },
): { chars: number; tokens: number } => {
  const { countTokens } = context;

  /**
   * .what = the exact render, and its count, for one candidate total
   * .why = the pass body is a transformer the loop applies, and it belongs behind a name so
   *        the loop reads as a convergence rather than a render inlined into arithmetic
   *        (`rule.require.named-transformers`)
   */
  const countOnePass = (pass: {
    tokens: number;
  }): { chars: number; tokens: number } => {
    const linesStats = input.of.genStatsLines({
      counted: { tokens: pass.tokens },
    });
    return countTokens({
      of: {
        words: asBootEmittedPayload({
          linesStats,
          linesBody: input.of.linesBody,
        }),
      },
    });
  };

  // seed with the body alone, then converge
  //
  // .note = the seed is an UNDERCOUNT by construction, so every pass moves the total upward
  //   and the sequence is monotone until it settles. four passes is generous: two suffice
  //   unless the total crosses a power of ten on the way up
  const PASSES_MAX = 4;

  // ⚠️ .note = DELIBERATE MUTATION — `counted` is reassigned per pass, since each pass renders
  //   from the prior pass's total, and the loop counter `pass` is covered by the same grant.
  //   scoped to this body; only the return escapes
  let counted = countTokens({
    of: { words: input.of.linesBody.join('\n') },
  });
  for (let pass = 0; pass < PASSES_MAX; pass += 1) {
    const countedNext = countOnePass({ tokens: counted.tokens });
    const hasSettled = countedNext.tokens === counted.tokens;
    counted = countedNext;

    // 🔴 the ONLY exit that returns a number. a settled pass rendered its own total, so the
    //    count is a proof rather than a snapshot of an unfinished sequence
    if (hasSettled) return counted;
  }

  // the loop fell through, so no pass reproduced its predecessor's total
  //
  // .note = MALFUNCTION, never constraint. the caller supplied a payload; our own render fed
  //   our own counter and the pair would not settle. no act of the caller's can fix it, and
  //   `rule.require.exit-code-semantics` sorts by exactly that (`rule.require.failloud`).
  throw new MalfunctionError('the boot token count did not converge', {
    passesMax: PASSES_MAX,
    tokensLastPass: counted.tokens,
    why: 'the stats block reports the count it is part of, so each pass re-renders it from the prior total. a payload whose total oscillates across the passes never reproduces its own block',
    hint: 'report it — the render and the counter disagree, and a re-run reproduces it',
  });
};
