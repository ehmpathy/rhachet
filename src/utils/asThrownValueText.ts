/**
 * .what = the TEXT of an arbitrary thrown value, rendered TOTALLY — never throws
 *
 * 🚨 .why it is total rather than a bare `String()` call = it runs inside catch blocks
 *   whose whole job is to compose a report for a human. a render that faults THERE does
 *   not degrade the report; it destroys it, and the caller's throw escapes with the
 *   render fault in its place. one real input does exactly that:
 *
 *   | the value | what `String(value)` does |
 *   |---|---|
 *   | an object whose own `toString` throws | raises whatever that `toString` raised |
 *
 *   `Object.prototype.toString.call` invokes no user code at all, so the object branch
 *   cannot fault. the cure is a TOTAL function rather than a swallowed catch
 *   (`rule.forbid.failhide`).
 *
 * 🚨 there is NO symbol branch, and its absence is deliberate. this function carried one,
 *   justified by *"`String(Symbol)` raises a TypeError"* — which is FALSE. `String(value)`
 *   holds an explicit carve-out for symbols and returns their descriptive text; what
 *   raises `TypeError: Cannot convert a Symbol value to a string` is IMPLICIT conversion,
 *   a template literal or `+ ''`. so the branch was redundant with the fallback beneath
 *   it, and is strictly weaker: the carve-out reads a symbol's description directly,
 *   where `thrown.toString()` goes through a prototype method that a caller could patch.
 *
 *   ⚠️ the defect was invisible to every output assertion, because both paths render a
 *   symbol identically. only a `not.toThrow` on `String` itself can part them, and
 *   `asThrownValueText.test.ts` now carries one so the premise cannot re-drift.
 *
 * ⚠️ `thrown !== null` carries real weight — `typeof null === 'object'`, so without it a
 *   thrown `null` would render `[object Null]` where `null` is the honest word.
 *
 * .note = ONE owner, deliberately. it was written for the cli's last-resort classifier
 *   and a second site (`execUpgrade`'s warn-and-continue) was later found to carry the
 *   same `String(error)` hazard with no guard. a copy at each site would drift, and the
 *   drift stays invisible until the day a hostile `toString` is thrown (raised by the
 *   r009 `behavior-friction-hazards` lane at i076).
 */
export const asThrownValueText = (thrown: unknown): string => {
  if (typeof thrown === 'object' && thrown !== null)
    return Object.prototype.toString.call(thrown);
  return String(thrown);
};
