import type { RoleBootSpec } from '@src/domain.objects/RoleBootSpec';

import { getAllDeclaredSubjectSlugs } from './getAllDeclaredSubjectSlugs';

/**
 * .what = casts a parsed boot spec into the mode the REMEDY LADDER is built for
 * .why = `asBootBudgetReadout` offers a fifth rung — `narrow`, *"boot fewer subjects"* — and it
 *        is a real remedy only where the spec has a subject to narrow to. the schema's own
 *        `mode` is the wrong input for that question, so the ladder needs its own word.
 *
 * 🔴 .note = a spec with ONLY `always:` parses as `mode: 'subject'` by schema, and declares no
 *   subject section at all. so a ladder built on the schema's `mode` offers `narrow` on a spec
 *   where `--subject` shrinks naught — five strategies, the fifth inert.
 *
 * ⇒ so the two words are deliberately distinct, and the split is the whole point:
 *
 *     the SCHEMA's mode    which shape the yaml validated against
 *     the REMEDY mode      whether `narrow` names a move the caller can actually take
 *
 * .note = null in (no spec) yields `'simple'`, which is correct rather than a fallback: a boot
 *   with no spec has no subject to narrow to, so the four-rung ladder is the whole truth.
 *
 * 🔴 .note = the declared set is read from `getAllDeclaredSubjectSlugs` rather than unpacked
 *   here, because the halt's subject ROSTER reads the same set. two independent unpacks would
 *   let the ladder offer `narrow` beside a roster of none — one predicate, drifted once.
 */
export const asBootRemedyMode = (input: {
  spec: RoleBootSpec | null;
}): 'simple' | 'subject' =>
  // a spec that declares no subject section offers no narrow, whatever its schema says
  getAllDeclaredSubjectSlugs(input).length > 0 ? 'subject' : 'simple';
