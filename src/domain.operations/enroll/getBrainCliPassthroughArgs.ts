import { isRolesFlag } from '../roles/deltas/isRolesFlag';

// the enroll-consumed flags that TAKE A VALUE (the flag + its next token drop)
const VALUE_FLAGS = new Set(['--brain', '--as', '--output', '--reason']);

// the enroll-consumed flags that are BOOLEAN (just the flag drops)
//
// 🔴 `--watch`, `--async`, and `--await` sit here, and the absence of the first two was a
//   live defect. all three are
//   registered `.option(...)`s on enroll, so commander reads them into `opts` — but this
//   stripper reads the RAW argv rather than commander's parse, so a flag registered
//   there and unlisted here is read by enroll AND forwarded to the brain. the brain-cli
//   answers `error: unknown option '--async'` and EXITS, and that cascades: the pty child
//   dies, `finalize` closes the socket and unlinks it, the detached host's loop drains,
//   and the host exits. so the enroll hands back an address, and seconds later every
//   `say` to it reads DEAD (measured 2026-09-17, four clones, one per flag form)
//
// ⚠️ ⇒ a flag added to `.option(...)` in `invokeEnroll` MUST be added here too. the two
//   lists are one contract with no compiler tie between them, so the clamp at
//   `./getBrainCliPassthroughArgs.integration.test.ts` reads every registered option out of
//   `invokeEnroll.ts` and asserts each one is stripped. its teeth are on record: with
//   `--async` removed from the set below it names `--async` and goes red
//   (`.log/…/what=integration/2026-09-20T19-52-42Z.stderr.log`)
//
// ⚠️ ⇒ the silent-drop class this whole file guards is declared as an invariant at
//   `.agent/repo=.this/role=any/briefs/define.invariant.an-unknown-flag-is-refused-never-dropped.md`
const BOOLEAN_FLAGS = new Set(['--no-socket', '--watch', '--async', '--await']);

/**
 * .what = strip every token `rhx enroll` consumes from the raw args, so ONLY the
 *   brain's own passthrough survives to reach the child cli
 * .why =
 *   - enroll reads its args off the raw argv (the passthrough goes verbatim to the
 *     brain), so it must remove each flag it owns — the brain (positional), and the
 *     `--brain` / `-r`|`--roles` / `--as` / `--no-socket` / `--watch` / `--async` /
 *     `--await` / `--output` / `--reason` flags — or they leak into the child argv, and a
 *     brain-cli
 *     does not merely get confused by an unknown option: it REFUSES and exits
 *   - both flag forms are handled: the spaced form (`--as @:x`, drop the value too)
 *     and the inline form (`--as=@:x`, one combined token)
 *
 * .note = the positional brain is dropped ONLY when it arrived positionally (its
 *   token is passed in) — a `--brain claude` enroll whose passthrough happens to be
 *   the word "claude" keeps that passthrough, since it was never the positional
 */
export const getBrainCliPassthroughArgs = (input: {
  args: string[];
  positionalBrain: string | null;
}): string[] => {
  // .note = deliberate mutation — a token filter with look-ahead (a value flag drops
  //   its NEXT token) plus a once-only drop (the positional brain) is a linear scan
  //   with two carry flags. the mutation is bounded to this function's local scope
  //   (never leaked; only `result` returns), and a for-loop with early `continue`
  //   reads as narrative where a stateful reduce would force the reader to simulate
  //   the accumulator (rule.forbid.inline-decode-friction).
  const result: string[] = [];
  let skipNext = false;
  let brainDropped = false;

  for (const arg of input.args) {
    // the token right after a value flag is that flag's value → drop it
    if (skipNext) {
      skipNext = false;
      continue;
    }

    // a value flag (spaced form): drop it, mark its value for drop
    if (VALUE_FLAGS.has(arg) || isRolesFlag({ token: arg })) {
      skipNext = true;
      continue;
    }

    // a value flag in the inline `--flag=value` form: drop the whole token
    if (
      arg.startsWith('--brain=') ||
      arg.startsWith('--as=') ||
      arg.startsWith('--output=') ||
      arg.startsWith('--reason=') ||
      arg.startsWith('--roles=')
    )
      continue;

    // a boolean flag: drop it, keep no value
    if (BOOLEAN_FLAGS.has(arg)) continue;

    // the positional brain (once): drop the first bare token that is it
    if (
      !brainDropped &&
      input.positionalBrain !== null &&
      arg === input.positionalBrain
    ) {
      brainDropped = true;
      continue;
    }

    // any other token is the brain's own passthrough
    result.push(arg);
  }

  return result;
};
