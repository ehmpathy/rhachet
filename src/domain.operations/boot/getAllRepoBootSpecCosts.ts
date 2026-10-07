import { ConstraintError } from 'helpful-errors';

import { asBootSpecUnreadableLines } from '@src/domain.operations/boot/asBootSpecUnreadableLines';
import { calcBootPayloadTokens } from '@src/domain.operations/boot/calcBootPayloadTokens';
import { genBootPayload } from '@src/domain.operations/boot/genBootPayload';
import { getAllRepoBootSpecPaths } from '@src/domain.operations/boot/getAllRepoBootSpecPaths';
import { getOneBootSourceFromSpecPath } from '@src/domain.operations/boot/getOneBootSourceFromSpecPath';
import { isBootSpecForeign } from '@src/domain.operations/boot/isBootSpecForeign';
import type { BrainTokenCounter } from '@src/domain.operations/brainCost/getOneBrainTokenCounter';
import { getOneBrainTokenCounter } from '@src/domain.operations/brainCost/getOneBrainTokenCounter';

/**
 * .what = what one boot spec costs, and the cap it declared — or null where it declared none
 * .why = `roles cost --all` reports both columns, and a spec with no cap is still a cost a
 *        reader came for. the two are separate facts, so the row carries them separately
 */
export interface BootSpecCost {
  pathToSpec: string;
  tokens: number;
  budget: number | null;

  /**
   * .what = whether ANOTHER repo owns this spec — the requirement-8 ownership test
   * .why = the repo-wide report reaches linked specs this repo cannot edit, and that
   *        population is exactly the specs a boot-time gate cannot safely refuse. so a reader
   *        of `--all` must be able to part a row they can fix from one they structurally
   *        cannot, the same split the gate's rung holds (requirement 8).
   *
   * .note = it is the same predicate the gate computes its rung from, never a second test
   *   that could disagree (`isBootSpecForeign`).
   */
  isForeign: boolean;
}

/**
 * .what = one spec's cost, or null where the spec could not be read or holds no resource
 * .why = the per-spec arm is where the one tolerance lives, so the sweep below reads as a
 *        walk rather than as a walk wrapped in a catch
 *
 * 🔴 .note = the catch is narrowed to `ConstraintError` — the class every read and parse
 *   fault on this path carries. a `MalfunctionError` raises through, because a count that
 *   could not converge is OUR defect and a report that swallowed it would print a roster
 *   whose rows nobody can trust (`rule.forbid.failhide`).
 */
const getOneBootSpecCost = async (
  input: {
    pathToSpec: string;
    cwd: string;
  },
  context: { countTokens: BrainTokenCounter },
): Promise<BootSpecCost | null> => {
  try {
    const source = getOneBootSourceFromSpecPath({
      pathToSpec: input.pathToSpec,
      cwd: input.cwd,
    });

    // .note = a spec that holds NO resource renders naught, so it returns null with no row.
    //   a vanished spec throws out of `getOneBootSourceFromSpecPath` instead, and the catch
    //   below discloses it
    const payload = await genBootPayload({ source, subjects: null });
    if (!payload) return null;

    // .note = the counted payload is the WHOLE render — body plus both stats blocks — and it
    //   goes through the operation `roles boot` uses. the report and the gate must agree on
    //   what one spec costs, or a row here contradicts the halt a boot renders.
    const counted = calcBootPayloadTokens(
      { of: payload },
      { countTokens: context.countTokens },
    );

    return {
      pathToSpec: input.pathToSpec,
      tokens: counted.tokens,
      budget: payload.budget?.tokens ?? null,

      // .note = the SAME predicate the gate computes its rung from, never a second test. a
      //   report that disagreed with the gate about who owns a spec would send a reader to
      //   edit a file the gate would refuse to hold them to, or the reverse
      isForeign: isBootSpecForeign({
        pathToSpec: input.pathToSpec,
        cwd: input.cwd,
      }),
    };
  } catch (error) {
    if (!(error instanceof ConstraintError)) throw error;

    for (const line of asBootSpecUnreadableLines({
      pathToSpec: input.pathToSpec,
      cwd: input.cwd,
      error,
    }))
      console.error(line);

    return null;
  }
};

/**
 * .what = what every boot spec in this repo costs, measured the way the budget gate measures
 * .why = it answers the repo-wide form of the one question `roles cost` answers per spec, so
 *        it is that command's `--all` arm rather than a second noun beside it. the limit a
 *        spec declares is a COLUMN of this report; the halt that enforces it lives at
 *        `roles boot`, which is the command that would spend the tokens.
 *
 * 🔴 .note = it REPORTS, and never throws on an over-budget spec. a report that refuses is not
 *   a report — a human who typed `cost --all` asked what the specs cost rather than for a
 *   verdict on them. the refusal lives at `roles boot`, the one command that emits a payload.
 *
 * .note = it costs EVERY spec, budgeted or not. the gate peeks at the declared cap first so
 *   an unbudgeted boot never loads the tokenizer (requirement 4); a report has no such
 *   shortcut to take, because the cost of an unbudgeted spec is exactly what its reader asked
 *   for. the tokenizer's encoder is constructed once per process, so the sweep pays it once.
 */
export const getAllRepoBootSpecCosts = async (input: {
  cwd: string;
  globs: readonly string[] | null;
}): Promise<{ costs: BootSpecCost[]; globs: readonly string[] }> => {
  const { paths: pathsToSpec, globs } = await getAllRepoBootSpecPaths({
    cwd: input.cwd,
    globs: input.globs,
  });

  // ⚠️ .note = DELIBERATE MUTATION — `rule.require.immutable-vars` grants one escape, for an
  //   unavoidable mutation stated at its site. the loop is sequential-await by necessity:
  //     1. a `Promise.all` would tokenize every spec at once, so the warn readouts each spec
  //        may emit would interleave on stderr into one unreadable frame
  //     2. the tokenizer's encoder construction is once-per-process, so parallelism buys
  //        naught and costs the peak memory of N payloads held at once
  //   ⇒ a `.map` + `Promise.all` is wrong rather than merely different, and a `reduce` over a
  //     promise chain is the decode-friction `rule.forbid.inline-decode-friction` forbids. the
  //     accumulator is scoped to this function and escapes only as the return.
  const costs: BootSpecCost[] = [];

  // the boundary is crossed ONCE for the whole sweep, and every spec receives the counter.
  //   the repo's token memo backs it, so a repeat sweep over unchanged specs never builds
  //   the encoder
  const countTokens = await getOneBrainTokenCounter({
    memo: { cwd: input.cwd },
  });

  for (const pathToSpec of pathsToSpec) {
    const cost = await getOneBootSpecCost(
      { pathToSpec, cwd: input.cwd },
      { countTokens },
    );
    if (cost) costs.push(cost);
  }

  // 🔴 the reach rides back with the roster, so the readout prints the bound this sweep
  //    actually applied rather than a second copy of it a cli file would have to keep in sync
  return { costs, globs };
};
