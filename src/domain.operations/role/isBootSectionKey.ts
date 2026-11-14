/**
 * .what = whether a top-level `boot.yml` key names a PAYLOAD SECTION
 * .why = two operations ask this same question for opposite purposes — `computeBootMode`
 *        to decide which schema the spec parses under, `assertNoInertBudget` to decide
 *        which keys may not hide a nested budget. they agreed by hand, and a hand-kept
 *        agreement between two typed predicates is one that drifts the first time a
 *        section kind is added (`rule.require.named-transformers`).
 *
 * 🔴 .note = a SECTION is the one axis this answers, and `budget` is deliberately NOT one.
 *   a budget is a MODIFIER — it caps whatever payload the mode selects — so a `true` here
 *   would make a budget beside `briefs:` read as a second mode pattern and trip the
 *   mixed-mode guard.
 *
 * .note = `subject.` is a PREFIX rather than an exact key, because the subject axis is
 *   open: a spec declares `subject.repo`, `subject.env`, or any coordinate it wants, and
 *   the schema's catchall admits them all.
 */
export const isBootSectionKey = (key: string): boolean =>
  key === 'always' || key.startsWith('subject.');
