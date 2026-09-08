import { ConstraintError } from 'helpful-errors';

/**
 * .what = the render `keyrack get` owes this invocation, read from the three flags that can name it
 *
 * .why = `--value`, `--json`, and `--output` can all name a render, and two of them can be
 *        spelled at once — so the answer is a PRECEDENCE, and a precedence a human cannot
 *        see is a latent surprise (`rule.forbid.surprises`). one cast is where that order
 *        is stated once, and where a fourth flag would be added
 *
 * .why.named = the call site is an orchestrator, and a three-way nested ternary there must
 *        be simulated to learn it means "which render does this invocation owe"
 *        (`rule.forbid.inline-decode-friction`). it is the last ask-shape fork in this file
 *        spelled at the call site — `asKeyrackAskFor`, `asKeyrackSelectorOrg`,
 *        `asKeyrackFilterOrg`, and `asKeyrackAskOrg` each already own theirs
 *
 * ⚠️ .note.precedence = `--value` outranks EVERY other flag, `--output` outranks `--json`,
 *        and `vibes` is the floor. the order is deliberate: `--value` is the one mode whose
 *        contract is a raw secret on stdout for a `$(…)` capture, so a stray `--json` beside
 *        it must not turn that capture into a json blob
 *
 * ⚠️ .note.term = `…Mode`, never `…Kind`, and the two are peers rather than synonyms. a `kind`
 *        reports what a VALUE is — hand the same slug to two callers and they get the same
 *        answer, always (`asKeyrackSlugOrgKind`). a `mode` reports what the COMMAND will do,
 *        chosen by precedence over the CALLER's own flags, so two callers can differ. both
 *        partition and both wear this same `as*`-over-a-closed-set shape, which is exactly why
 *        the shape cannot be the test (`domain.terms/term=mode._.choice.reason.md`, the `kind`
 *        dispute, RESOLVED 2026-09-02). the `.note.precedence` above is the obligation only a
 *        mode carries: a value cannot argue with itself, but two flags can
 */
const MODES_VALID = ['value', 'json', 'vibes'] as const;

export const asKeyrackGetOutputMode = (input: {
  /** `--value` — emit the raw secret alone, for shell capture */
  value?: boolean;
  /** `--json` — the shorthand for `--output json` */
  json?: boolean;
  /**
   * `--output` — the explicit render, when a human names it outright
   *
   * ⚠️ .note.type = `string`, NOT the closed union, and the wider type is deliberate. commander
   *        declares `--output <mode>` with no `.choices()` (the `get` verb in `invokeKeyrack.ts`),
   *        so it hands over ANY string. to annotate the closed union here would be a claim the
   *        boundary
   *        never enforced — the type would read as a guarantee while the value stayed arbitrary
   */
  output?: string;
}): (typeof MODES_VALID)[number] => {
  // ⚠️ refuse an unrecognized mode BEFORE the precedence — a silent fallthrough is the defect
  // .why = the switch at the call site ends `case 'vibes': default:`, so an unrecognized mode
  //        renders VIBES at exit 0. a human who typo'd `--output josn` asked for machine-parseable
  //        json and silently got prose — and a `$(…)` capture or a `| jq` then parses that prose.
  //        a wrong answer at exit 0 is the failure mode this whole surface exists to close
  //        (`rule.forbid.unexpected-defaults`); the loud refusal is the only honest reply
  // .note = the VALUE at fault rides in the metadata, never only the valid set — a refusal that
  //         names what is allowed and not what was typed cannot show a human their own typo
  //         (`rule.require.refusals-carry-context`, and the `--vault` peer gate in `invokeKeyrack.ts`)
  if (
    input.output !== undefined &&
    !MODES_VALID.includes(input.output as (typeof MODES_VALID)[number])
  )
    throw new ConstraintError(
      `invalid --output: must be one of ${MODES_VALID.join(', ')}`,
      { outputGiven: input.output },
    );

  if (input.value) return 'value';
  if (input.output) return input.output as (typeof MODES_VALID)[number];
  if (input.json) return 'json';
  return 'vibes';
};
