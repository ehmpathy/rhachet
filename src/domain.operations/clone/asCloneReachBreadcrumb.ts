import { asCloneAddressHuman } from './asCloneAddressHuman';

/**
 * .what = the exact stderr breadcrumb `rhx enroll` emits, in tree mode, once a clone
 *   stands up — the confirmation that it enrolled, plus BOTH halves of the reach loop:
 *   the command that speaks to it and the command that reads it back
 * .why =
 *   - it is the ONE rhachet-authored line a human sees on a successful enroll, so its
 *     text must not drift silently. one owner means one place to change it and one
 *     exact-text clamp that catches drift (the `asCloneAccrualWarnLine` model, its peer)
 *   - keeps the invoker a narrative — the emit reads `console.error(asCloneReachBreadcrumb(...))`
 *     rather than an inline template with decode-friction (rule.require.named-transformers)
 *
 * ⚠️ it fires on EVERY successful enroll, named or bare. its job is CONFIRMATION — proof
 *   the clone stood up — never address disclosure, so a `--as <slug>` enroll owes it just
 *   as much as a bare one does. the reuse path confirms too
 *   (`♻ reused the live clone that already answers to @:<slug>`).
 *
 * ⚠️ the root carries the confirmation and the branches carry the reach, so the two sit at
 *   their own grains (rule.require.treestruct-output).
 *
 * ⚠️ BOTH `say` and `get`, and no more. a `say` alone is half a loop — the clone answers
 *   asynchronously, into its transcript rather than onto the dispatcher's screen, so `get`
 *   is the next move a human needs. `clone list`/`prune` stay off: this is not a `--help`.
 *
 * ⚠️ the glyphs are READ off the commands they name, never coined here — `clone say` emits
 *   `😶🎙️` (`invokeCloneSay`) and `clone get` emits `😶🎧` (`asCloneConversationText`).
 *   the pair carries the DIRECTION, so the branches need no word label: the command is the
 *   label, and a `say:` in front of `rhx clone say` states one word twice.
 *
 * ⚠️ `😶` is the clone domain-root glyph, settled in `choice.clone-glyph`. it is NOT a
 *   role-mascot (`🐢`, `🦉`), so no mascot line is owed here.
 *
 * .note = the caller pads it with a blank line above and below. that pad lives at the emit
 *   rather than in this value, so the exact-text clamp reads the CONTENT alone and a change
 *   to the blank lines around it cannot redden a text assertion
 */
export const asCloneReachBreadcrumb = (input: {
  /** the clone's `--as` slug when it was named, else null */
  slug: string | null;

  /** the clone's serial — its primary ref, always present. taken WHOLE, never pre-cut */
  serial: string;

  /**
   * whether the clone stood up with a dispatch socket — `result.clone.socketEligible`.
   * REQUIRED rather than defaulted: a default would let a caller omit it and get the
   * reachable render for a deaf clone.
   */
  reachable: boolean;
}): string => {
  // the one owner of a clone's human-faced address, sigil and all — computed ONCE, so
  // the branches can never disagree about which clone they name
  const address = asCloneAddressHuman({
    slug: input.slug,
    serial: input.serial,
  });

  // ⚠️ a DEAF clone gets the confirmation and NOT the say — `clone say` is a command it
  //   cannot honor, so to print it would name a next move that fails.
  //
  // ⚠️ `get` STAYS: `CloneUnreachableCause.DEAF` is defined as *"can't hear a say, but
  //   `get` still observes it"*, so a deaf clone genuinely answers the second branch.
  //   the root names the cause, rather than a fourth row about the absent one
  if (!input.reachable)
    return [
      '😶 clone enrolled — deaf, so it cannot hear a `say`',
      `   └─ 🎧 rhx clone get ${address} --tail 50`,
    ].join('\n');

  return [
    '😶 clone enrolled',
    `   ├─ 🎙️ rhx clone say ${address} --what "…"`,
    `   └─ 🎧 rhx clone get ${address} --tail 50`,
  ].join('\n');
};
