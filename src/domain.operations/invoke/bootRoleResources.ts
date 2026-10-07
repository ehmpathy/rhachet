import type { PickOne } from 'type-fns';

import { asBootPayloadLogged } from '@src/domain.operations/boot/asBootPayloadLogged';
import { asBootSubjectFlagSuffix } from '@src/domain.operations/boot/asBootSubjectFlagSuffix';
import { assertBootWithinBudget } from '@src/domain.operations/boot/assertBootWithinBudget';
import { genBootPayload } from '@src/domain.operations/boot/genBootPayload';
import { getOneBootBudgetRung } from '@src/domain.operations/boot/getOneBootBudgetRung';
import { getOneBootSource } from '@src/domain.operations/boot/getOneBootSource';

/**
 * .what = boots resources (readme, briefs, skills) from a role default or a declared manifest
 * .why = outputs resources with stats for context load
 * .how = looks up the SOURCE (`getOneBootSource`), assembles the payload, gates it, emits it
 *
 * .note = both sources share one renderer; every difference lives in the `BootSource`
 *
 * .note = `genBootPayload` is the one assembler, shared with every caller that measures this
 *   payload (requirement 9)
 */
export const bootRoleResources = async ({
  from,
  ifPresent,
  subjects,
  cwd = process.cwd(),
}: {
  from: PickOne<{
    role: { slugRepo: string; slugRole: string };
    manifest: { path: string };
  }>;
  ifPresent: boolean;
  subjects?: string[];
  cwd?: string;
}): Promise<void> => {
  // look up where the resources come from, and how they are addressed
  const source = getOneBootSource({ from, ifPresent, cwd });

  // an absent role dir under --if-present: exit silently, as it does today
  if (!source) return;

  // assemble the payload to a buffer rather than stream it
  //
  // .why = the budget gate must measure the whole payload BEFORE a byte of it is emitted —
  //        a halt that first prints the payload has already spent the tokens it refuses to
  //        authorize (requirement 2). so the body is built, measured, then flushed or dropped.
  const payload = await genBootPayload({ source, subjects: subjects ?? null });

  // an empty universe: warn, unless --if-present said an absence is expected
  if (!payload) {
    if (ifPresent) return;
    // one shape for one state: the peer `roles cost` renders this exact pair, so a reader
    //   who met the state once has learned it on both commands
    console.log(
      `🧢 roles boot ${source.coordinates}${asBootSubjectFlagSuffix({ subjects })}`,
    );
    console.log('   └─ 🟡 no resources found — this boot emits naught');
    return;
  }

  // 🔴 the `--subject` selection rides into BOTH commands the halt prints, and it is one
  //    suffix because the two would otherwise disagree with each other in the same readout:
  //
  //    | the line | what it names | what it said without this |
  //    |---|---|---|
  //    | the header | the command that produced this boot | a command whose payload is WIDER than the one measured |
  //    | the cost line | the command that itemizes the cost | the WHOLE spec's cost, beside a halt that quotes a slice |
  //
  // ⇒ the second is the sharper half: the halt tells the author to run that command, so an
  //   author who took the `narrow` rung would meet a number the halt never quoted.
  const suffixSubject = asBootSubjectFlagSuffix({ subjects });

  // gate the payload BEFORE a byte of it is emitted (requirement 2)
  //
  // 🔴 .note = the gated payload is the WHOLE render — body PLUS both stats blocks — never
  //   the body alone. a stats block occupies context exactly as a brief does, so to exclude
  //   one is a scope error, and a scope error is the larger half of the 3.29x understatement
  //   requirement 7 exists to kill. it errs LOW, which is the direction that passes an
  //   over-budget boot. the self-reference (the block reports the number it is part of) is
  //   settled by convergence inside `calcBootPayloadTokens`.
  const counted = await assertBootWithinBudget({
    of: { linesBody: payload.linesBody, genStatsLines: payload.genStatsLines },
    budget: payload.budget,

    rung: getOneBootBudgetRung({
      budget: payload.budget,
      pathToSpec: source.pathToSpec,
      cwd,
    }),
    invocation: source.invocation + suffixSubject,
    coordinates: source.coordinates + suffixSubject,
    mode: payload.mode,

    // the roster behind the ladder's `narrow` rung — priced only where the gate breaches
    subjects: payload.subjects,
  });

  // 🔴 .note = a spec that declares NO budget is never refused; the cap is opt-in. it is
  //   called out instead, in-band: its `<stats>` block reads `/ unlimited budget`.
  //
  // ⇒ the exact cost of an uncapped payload is answerable by the command whose job that is:
  //   `roles cost`, per spec, or `roles cost --all` across the repo.

  // emit the payload: stats header, body, stats footer
  //
  // .note = console.log, never `process.stdout.write`. both are equivalent on the wire, but
  //         the extant test harness captures console.log, so a write would bypass every
  //         assertion silently. each single-arg call appends exactly one '\n' and does no
  //         format substitution.
  //
  // 🔴 .note = the assembly is `asBootPayloadLogged`, never an inline join, because the
  //         COUNTER must measure these exact bytes. its peer `asBootEmittedPayload` adds the
  //         one '\n' console.log appends below — so the gate counts what the wire carries
  //         rather than what this line passes in (`0.wish.md` requirement 7).
  //
  // 🔴 .note = one console.log PER LINE, never one call for the whole string. the bun binary
  //         cut a single >64KB console.log off at the pipe buffer (65536 bytes, exit 0) when
  //         stdout was a pipe, which is how every hook and harness reads a boot. per-line calls
  //         put the same bytes on the wire, since each appends exactly the '\n' the join put
  //         between them.
  const linesStats = payload.genStatsLines({ counted });
  getAllBootPayloadLinesLogged({
    linesStats,
    linesBody: payload.linesBody,
  }).forEach((line) => console.log(line));
};

/**
 * .what = the logged payload, as the lines one console.log call each emits
 * .why = the counter measures `asBootPayloadLogged`'s bytes, so the emit splits that exact
 *        string back into lines rather than rejoin the parts a second way
 */
const getAllBootPayloadLinesLogged = (input: {
  linesStats: Parameters<typeof asBootPayloadLogged>[0]['linesStats'];
  linesBody: Parameters<typeof asBootPayloadLogged>[0]['linesBody'];
}): string[] => asBootPayloadLogged(input).split('\n');
