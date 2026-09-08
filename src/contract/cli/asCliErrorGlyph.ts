/**
 * .what = the glyph that leads a rendered cli error — read off the error's OWN class
 * .why  = the class IS the message: `MalfunctionError` says "ours to repair",
 *   `ConstraintError` says "yours to amend" (`rule.forbid.ambiguous-labels`).
 *
 * ⚠️ READ off `static emoji`, never a local table — that would be a second owner of an
 *   upstream fact.
 *
 * 🚨 .the unbranded fallback is `💥`, and there is no softer option to reach for.
 *   an unclassified error carries no verdict, but the glyph must still name a party —
 *   `✋` is not neutral, it is a DIFFERENT accusation. so the question is never
 *   "hard or soft", it is "whom do we accuse when we do not know", and the answer is
 *   ourselves: an unclassified throw means our error contract has a gap at its throw
 *   site, and no input a human types can produce one.
 *
 * 🔴 .why it MUST be `💥` rather than merely may be = the two peer channels already say
 *   so, so a `✋` here made the HUMAN channel the lone dissenter:
 *
 *     | channel                  | unclassified verdict |
 *     |--------------------------|----------------------|
 *     | `getExitCodeFromError`   | 1 — ours             |
 *     | `asCliErrorClassified`   | `MalfunctionError`   |
 *     | this glyph               | ← must agree         |
 *
 *   that split is the exact inversion `withCliOutputErrors` records the frame extraction
 *   as owed to — *the exit code carried the distinction for a machine while the screen
 *   dropped it for a human*.
 */
export const asCliErrorGlyph = (input: { error: Error }): string => {
  const ctor = input.error.constructor as { emoji?: unknown };
  return typeof ctor.emoji === 'string' ? ctor.emoji : '💥';
};
