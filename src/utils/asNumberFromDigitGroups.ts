/**
 * .what = casts a digit-group literal to a number — `'5_000'` → `5000`
 * .why = yaml has no digit separator, so `tokens: 5_000` parses as the STRING `'5_000'`.
 *        every author who writes a large cap reaches for the separator, because that is how
 *        a thousands group is written in every doc this repo publishes — `0.wish.md`'s own
 *        declared example and the refusal's own `expected` line among them.
 *
 * 🔴 .note = measured 2026-09-22 by a dogfood of `budget: { tokens: 5_000 }` on this repo's
 *   own `repo=.this/role=any` spec: the boot refused, and the refusal recommended the exact
 *   syntax it had just rejected (`rule.require.errors-name-the-fix` — a hint that names an
 *   unaccepted fix is worse than an absent one).
 *
 * .note = it is deliberately NARROW. a bare number passes through untouched, and any string
 *   that is not a run of digits with interior single separators returns unchanged, so the
 *   caller's own refusal still fires with the author's literal shown back to them.
 */
export const asNumberFromDigitGroups = (input: unknown): unknown => {
  // a real number needs no cast — the common case, and the one yaml already handles
  if (typeof input !== 'string') return input;

  // digits in groups, split by a single `_` or `,` — never at either end, never doubled
  if (!/^\d+([_,]\d+)*$/.test(input)) return input;

  return Number(input.replace(/[_,]/g, ''));
};
