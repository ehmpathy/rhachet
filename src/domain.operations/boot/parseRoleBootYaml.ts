import { BadRequestError } from 'helpful-errors';
import { parse as parseYaml } from 'yaml';

import {
  type ResourceCurationResolved,
  type RoleBootSpec,
  RoleBootSpecSimplified,
  RoleBootSpecSubjected,
  type SubjectSectionResolved,
  schemaRoleBootSpecSimplified,
  schemaRoleBootSpecSubjected,
} from '@src/domain.objects/RoleBootSpec';

import { computeBootMode } from './computeBootMode';

/**
 * .what = resolves a ResourceCuration to ResourceCurationResolved
 * .why = applies defaults (say/ref arrays default to empty)
 */
/**
 * .what = resolves a ResourceCuration to ResourceCurationResolved
 * .why = applies defaults while retains "say key present" vs "say key absent" distinction
 *
 * .note = say: null means key was absent (say all default)
 *         say: [] means key was present but empty (say none)
 */
const resolveResourceCuration = (
  input: { say?: string[]; ref?: string[] } | undefined,
): ResourceCurationResolved | null => {
  if (!input) return null;
  return {
    say: input.say ?? null, // undefined → null (key absent), array → array (key present)
    ref: input.ref ?? [],
  };
};

/**
 * .what = resolves a subject section to SubjectSectionResolved
 * .why = applies defaults for briefs and skills within a section
 */
const resolveSubjectSection = (
  input:
    | {
        briefs?: { say?: string[]; ref?: string[] };
        skills?: { say?: string[]; ref?: string[] };
      }
    | undefined,
): SubjectSectionResolved | null => {
  if (!input) return null;
  return {
    briefs: resolveResourceCuration(input.briefs),
    skills: resolveResourceCuration(input.skills),
  };
};

/**
 * .what = parses boot.yml content into validated RoleBootSpec
 * .why = centralizes yaml parse + mode detection + zod validation
 *
 * .note = returns null if content is empty or null (means no boot.yml)
 */
export const parseRoleBootYaml = (input: {
  content: string;
  path: string;
}): RoleBootSpec | null => {
  // parse yaml
  let raw: unknown;
  try {
    raw = parseYaml(input.content);
  } catch (error) {
    throw new BadRequestError('boot.yml has invalid yaml', {
      path: input.path,
      error: (error as Error).message,
    });
  }

  // handle null or empty content
  if (!raw || typeof raw !== 'object') return null;

  const rawObject = raw as Record<string, unknown>;

  // detect mode
  const mode = computeBootMode({ raw: rawObject });

  // handle none mode (no boot.yml config)
  if (mode === 'none') return null;

  // validate and return based on mode
  if (mode === 'simple') {
    const result = schemaRoleBootSpecSimplified.safeParse(rawObject);
    if (!result.success) {
      throw new BadRequestError('boot.yml has invalid schema for simple mode', {
        path: input.path,
        errors: result.error.issues,
      });
    }

    return new RoleBootSpecSimplified({
      mode: 'simple',
      briefs: resolveResourceCuration(result.data.briefs),
      skills: resolveResourceCuration(result.data.skills),
    });
  }

  // subject mode
  const result = schemaRoleBootSpecSubjected.safeParse(rawObject);
  if (!result.success) {
    throw new BadRequestError('boot.yml has invalid schema for subject mode', {
      path: input.path,
      errors: result.error.issues,
    });
  }

  // extract subjects from result.data (keys that start with "subject.")
  const subjects: Record<string, SubjectSectionResolved> = {};
  for (const [key, value] of Object.entries(result.data)) {
    if (key.startsWith('subject.')) {
      const slugSubject = key.replace('subject.', '');
      const section = resolveSubjectSection(
        value as {
          briefs?: { say?: string[]; ref?: string[] };
          skills?: { say?: string[]; ref?: string[] };
        },
      );
      if (section) {
        subjects[slugSubject] = section;
      }
    }
  }

  return new RoleBootSpecSubjected({
    mode: 'subject',
    always: resolveSubjectSection(result.data.always),
    subjects,
  });
};
