import { DomainLiteral } from 'domain-objects';
import { z } from 'zod';

import { asNumberFromDigitGroups } from '@src/utils/asNumberFromDigitGroups';

/**
 * .what = schema for resource curation (briefs or skills)
 * .why = say, ref, and not are optional arrays of glob patterns
 *
 * .note = the triple is `say` · `ref` · `not`, each a DESTINATION:
 *   - `say` → resident in the payload, full content
 *   - `ref` → addressable by path, one name in the roster block
 *   - `not` → absent from the payload entirely
 *
 * 🔴 .note = `not` is subtracted from the universe BEFORE the say/ref partition runs,
 *   never sorted by it. so it carries no precedence question against the other two — an
 *   excluded resource cannot be said, reffed, or swept into `<also>`, because the
 *   partition never sees it.
 */
export const schemaResourceCuration = z.object({
  say: z.array(z.string()).optional(),
  ref: z.array(z.string()).optional(),
  not: z.array(z.string()).optional(),
});
export type ResourceCuration = z.infer<typeof schemaResourceCuration>;

/**
 * .what = schema for a declared boot budget
 * .why = caps the resident payload a boot may emit, so cost is a line an author reads
 *        rather than a measurement nobody runs
 *
 * 🔴 .note = it caps CONTEXT OCCUPANCY, never DOLLARS — read the unit before you set one. a
 *   cached token occupies context exactly as an uncached one does, so the occupancy cap holds
 *   always. the dollar sense holds only while a provider's prompt cache MISSES — and a boot
 *   payload is the most cache-friendly object in the system (byte-identical, at token 0, on
 *   every session), so once that cache hits, this number OVERSTATES its cost. tokens are the
 *   right unit for a context cap; they are not a spend cap, and `budget.tokens` was never built
 *   to serve as one.
 *
 * 🔴 .note = the count is exact for ONE encoder — `o200k_base`, via `js-tiktoken`. a payload a
 *   different model family consumes carries a delta of a few percent, so a cap set right at the
 *   line is precise against this encoder and approximate against any other. ⇒ a real residual,
 *   and two orders of magnitude below the 3.29x understatement of the `chars / 4` estimate it
 *   replaced.
 *
 * .note = tokens must be a positive integer:
 *   - 0 is refused because it cannot be MET — the gate counts the FULL EMITTED PAYLOAD, both
 *     `<stats>` blocks and all xml chrome included, and a payload with no resource at all
 *     never reaches the gate (`genBootPayload` returns null on an empty universe). so every
 *     gated payload is nonzero, and 0 would refuse each one. a ref-only boot is declared with
 *     `say: []` plus a chrome-sized cap, never with 0
 *   - negatives, floats, and non-numeric strings are refused as malformed
 *
 * 🔴 .note = a DIGIT-GROUP literal is honored — `tokens: 5_000` and `tokens: 5,000` both mean
 *   5000. yaml has no digit separator, so each parses as a string; `asNumberFromDigitGroups`
 *   casts it before the schema reads it. the separator is how every doc here writes a
 *   thousands group, `0.wish.md`'s own example among them, so a refusal of it would refuse
 *   the declared contract.
 */
export const schemaBootBudget = z.object({
  tokens: z.preprocess(asNumberFromDigitGroups, z.number().int().positive()),
});
export type BootBudgetDeclared = z.infer<typeof schemaBootBudget>;

/**
 * .what = the resolved budget a boot is gated against
 * .why = null means "no budget declared", which renders exactly as it does today
 */
export interface BootBudget {
  tokens: number;
}

/**
 * .what = schema for simple mode boot.yml
 * .why = top-level briefs/skills curation without subject scopes
 */
export const schemaRoleBootSpecSimplified = z.object({
  briefs: schemaResourceCuration.optional(),
  skills: schemaResourceCuration.optional(),
  budget: schemaBootBudget.optional(),
});

/**
 * .what = schema for subject section (always or subject.$slug)
 * .why = subject sections have the same structure as simple mode top-level
 */
export const schemaSubjectSection = z.object({
  briefs: schemaResourceCuration.optional(),
  skills: schemaResourceCuration.optional(),
});
export type SubjectSection = z.infer<typeof schemaSubjectSection>;

/**
 * .what = schema for subject mode boot.yml
 * .why = always section + dynamic subject.$slug sections via catchall
 *
 * .note = catchall captures subject.* keys; validation ensures key format
 *
 * .note = `budget` MUST be declared in the object shape, never left to the catchall.
 *         a catchall applies only to keys the shape does not name, so an unnamed
 *         `budget` was parsed AS a subject section: its `tokens` key dropped by the
 *         non-strict object, the section validated as empty, then discarded by the
 *         `subject.` prefix filter. a declared budget was accepted and meant naught —
 *         exactly the silent pass the budget exists to forbid.
 */
export const schemaRoleBootSpecSubjected = z
  .object({
    always: schemaSubjectSection.optional(),
    budget: schemaBootBudget.optional(),
  })
  .catchall(schemaSubjectSection);

/**
 * .what = resolved resource curation with defaults applied
 * .why = internal representation after defaults are computed
 *
 * .note = say key semantics:
 *   - say: null → key was absent in yaml, means "say all"
 *   - say: [] → key was present but empty, means "say none"
 *   - say: ['pattern'] → key was present with globs, means "say matched"
 *
 * .note = `not` needs no absent/empty distinction, because both mean the same thing —
 *   exclude naught. so it resolves to a plain array rather than a nullable one.
 */
export interface ResourceCurationResolved {
  say: string[] | null;
  ref: string[];
  not: string[];
}

/**
 * .what = simple mode boot.yml — top-level briefs/skills curation
 * .why = most roles use simple mode; no usecase scopes needed
 *
 * .note = defaults:
 *   - briefs/skills key absent → say all
 *   - briefs/skills.say absent → say all
 *   - briefs/skills.say present → say matched, ref unmatched
 */
export interface RoleBootSpecSimplified {
  mode: 'simple';
  briefs: ResourceCurationResolved | null;
  skills: ResourceCurationResolved | null;
  budget: BootBudget | null;
}
export class RoleBootSpecSimplified
  extends DomainLiteral<RoleBootSpecSimplified>
  implements RoleBootSpecSimplified {}

/**
 * .what = subject section with resolved curation
 * .why = internal representation for always and subject.* sections
 */
export interface SubjectSectionResolved {
  briefs: ResourceCurationResolved | null;
  skills: ResourceCurationResolved | null;
}

/**
 * .what = subject mode boot.yml — usecase-scoped curation with always + subjects
 * .why = roles with many briefs can define subject-scoped collections
 *
 * .note = defaults:
 *   - always section absent → no always briefs/skills
 *   - unmatched resources in "also" section when all subjects booted
 *   - unmatched resources omitted when specific subjects booted via --usecase
 */
export interface RoleBootSpecSubjected {
  mode: 'subject';
  always: SubjectSectionResolved | null;
  subjects: Record<string, SubjectSectionResolved>;
  budget: BootBudget | null;
}
export class RoleBootSpecSubjected
  extends DomainLiteral<RoleBootSpecSubjected>
  implements RoleBootSpecSubjected {}

/**
 * .what = discriminated union of boot.yml modes
 * .why = enables type-safe branch on mode
 */
export type RoleBootSpec = RoleBootSpecSimplified | RoleBootSpecSubjected;
