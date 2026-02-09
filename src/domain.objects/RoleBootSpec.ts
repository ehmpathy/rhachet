import { DomainLiteral } from 'domain-objects';
import { z } from 'zod';

/**
 * .what = schema for resource curation (briefs or skills)
 * .why = both say and ref are optional arrays of glob patterns
 */
export const schemaResourceCuration = z.object({
  say: z.array(z.string()).optional(),
  ref: z.array(z.string()).optional(),
});
export type ResourceCuration = z.infer<typeof schemaResourceCuration>;

/**
 * .what = schema for simple mode boot.yml
 * .why = top-level briefs/skills curation without subject scopes
 */
export const schemaRoleBootSpecSimplified = z.object({
  briefs: schemaResourceCuration.optional(),
  skills: schemaResourceCuration.optional(),
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
 */
export const schemaRoleBootSpecSubjected = z
  .object({
    always: schemaSubjectSection.optional(),
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
 */
export interface ResourceCurationResolved {
  say: string[] | null;
  ref: string[];
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
}
export class RoleBootSpecSubjected
  extends DomainLiteral<RoleBootSpecSubjected>
  implements RoleBootSpecSubjected {}

/**
 * .what = discriminated union of boot.yml modes
 * .why = enables type-safe branch on mode
 */
export type RoleBootSpec = RoleBootSpecSimplified | RoleBootSpecSubjected;
