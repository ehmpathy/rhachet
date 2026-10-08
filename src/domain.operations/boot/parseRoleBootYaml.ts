import { ConstraintError } from 'helpful-errors';

import {
  type BootBudget,
  type ResourceCurationResolved,
  type RoleBootSpec,
  RoleBootSpecSimplified,
  RoleBootSpecSubjected,
  type SubjectSectionResolved,
  schemaBootBudget,
  schemaRoleBootSpecSimplified,
  schemaRoleBootSpecSubjected,
} from '@src/domain.objects/RoleBootSpec';

import { computeBootMode } from './computeBootMode';
import { isBootSectionKey } from './isBootSectionKey';
import { parseBootYamlRaw } from './parseBootYamlRaw';

/**
 * .what = refuses a declared budget the GATE CANNOT SEE — by place, or by name
 * .why = one concept, two spellings of the same defect: an author wrote a cap, the
 *        parse accepted it, and no payload is gated by it. a silent pass is exactly
 *        what requirement 2 forbids, and it is worse than an absent budget — the
 *        author believes they are capped when they are not.
 *
 * .note = both branches are STRUCTURAL, since the parse is permissive by design
 *   (`define.invariant.a-symlink-under-agent-is-foreign`).
 */
const assertNoInertBudget = (input: {
  raw: Record<string, unknown>;
  path: string;
}): void => {
  for (const [key, value] of Object.entries(input.raw)) {
    if (!value || typeof value !== 'object') continue;
    const section = value as Record<string, unknown>;

    // by PLACE — a budget nested in a section (always: or subject.*)
    //
    // .why = the budget caps the whole emitted payload, so it has exactly one home:
    //   the top level. a nested one parses (the section schema is non-strict, so the
    //   key is dropped in silence) and gates naught — the cap a reader sees would
    //   apply to no payload at all. the grid's one nurture-forbidden cell.
    if (isBootSectionKey(key)) {
      if ('budget' in section)
        throw new ConstraintError(
          'boot.yml declares a budget inside a section — a budget caps the whole payload, so it belongs at the top level',
          { path: input.path, section: key },
        );
      continue;
    }

    // by NAME — a MISSPELLED top-level budget key
    //
    // ⇒ the test is STRUCTURAL, never a list of typos: a top-level key other than
    //   `budget` that carries a `tokens` field declares a token count no gate reads.
    //   the INNER key needs no guard here, since `tokens` is required by its schema.
    if (key !== 'budget' && 'tokens' in section)
      throw new ConstraintError(
        'boot.yml declares a top-level key with a token count, but the budget key is spelled `budget` — as written, the cap gates naught',
        { path: input.path, key, expected: 'budget' },
      );
  }
};

/**
 * 🔴 .what = refuses a declared payload SECTION that no mode reads — a mistyped section key
 * .why = the exact twin of `assertNoInertBudget`'s by-NAME branch, one axis over. that branch
 *        catches a cap the gate cannot see; this catches a PAYLOAD the render cannot see.
 *        both are the same defect class: an author declared it, the parse accepted it, and no
 *        code reads it.
 *
 * .note = a swallowed section drops briefs the author believes are resident, at exit 0.
 *   `subjct.repo:` and `subject-repo:` each land here.
 *
 * ⇒ the test is STRUCTURAL, never a list of typos, for the same reason its twin is: a
 *   top-level key whose value carries `briefs` or `skills` IS a payload section, however it is
 *   spelled. a forward-compat key a foreign spec adds later is untouched unless it carries one
 *   of those two — and a key that does is a section under any account
 *   (`define.invariant.a-symlink-under-agent-is-foreign`).
 *
 * ⚠️ .note = `briefs`/`skills` at the TOP level are simple mode's own section keys, so they
 *   are excluded by name. without that, every simple-mode spec would refuse itself.
 */
const assertNoInertSection = (input: {
  raw: Record<string, unknown>;
  path: string;
}): void => {
  for (const [key, value] of Object.entries(input.raw)) {
    if (!value || typeof value !== 'object') continue;
    if (key === 'briefs' || key === 'skills') continue; // simple mode's own keys
    if (key === 'budget') continue; // its twin guard owns this one
    if (isBootSectionKey(key)) continue; // a section the render does read

    const section = value as Record<string, unknown>;
    if (!('briefs' in section) && !('skills' in section)) continue;

    throw new ConstraintError(
      'boot.yml declares a payload section under a key no mode reads — as written, its briefs and skills boot for no one',
      {
        path: input.path,
        key,
        expected: '`always`, or a `subject.<coordinate>` prefix',
        hint: 'a section key is either `always` or begins with `subject.` — check how this one is spelled',
      },
    );
  }
};

/**
 * .what = refuses a budget whose VALUE cannot be a token count
 * .why = `budget` is a top-level, mode-independent key, so its refusal names the budget
 *        and the fix rather than a mode schema (`rule.require.errors-name-the-fix`).
 *
 * .note = it runs BEFORE the mode branch, beside `assertNoInertBudget`, so one declared
 *   budget yields one refusal regardless of which mode the rest of the spec is in.
 */
const assertDeclaredBudgetValid = (input: {
  raw: Record<string, unknown>;
  path: string;
}): void => {
  const declared = input.raw.budget;
  if (declared === undefined) return;

  const result = schemaBootBudget.safeParse(declared);
  if (result.success) return;

  // the found value, stated plainly — a caller reads what they wrote, never a zod path
  const tokensFound =
    declared && typeof declared === 'object'
      ? (declared as Record<string, unknown>).tokens
      : declared;

  throw new ConstraintError(
    'boot.yml declares a budget whose token count is not a positive whole number',
    {
      path: input.path,
      found: tokensFound,
      expected: 'budget: { tokens: <a positive whole number, e.g. 5_000> }',
      // 🔴 zero is the value most likely meant on purpose, so it gets its own line. the gate
      //    counts the FULL emitted payload, so xml chrome alone is nonzero and `0` refuses
      //    every boot — a ref-only spec is `say: []` plus a chrome-sized cap, never `0`
      hint:
        tokensFound === 0
          ? 'a budget of 0 can never be met — the gate counts the whole emitted payload, and chrome alone is nonzero. for a ref-only boot, declare `say: []` and a chrome-sized cap.'
          : 'the budget caps the whole emitted payload, measured in o200k_base tokens.',
    },
  );
};

/**
 * .what = resolves a declared budget to the gate's input
 * .why = null means "no budget declared", which renders exactly as it does today
 */
const resolveBootBudget = (
  input: { tokens: number } | undefined,
): BootBudget | null => {
  if (!input) return null;
  return { tokens: input.tokens };
};

/**
 * .what = one resource's curation as declared, before defaults
 * .why = the triple is read at three sites; a declared name states it once
 */
interface ResourceCurationDeclared {
  say?: string[];
  ref?: string[];
  not?: string[];
}

/**
 * .what = resolves a ResourceCuration to ResourceCurationResolved
 * .why = applies defaults while retains "say key present" vs "say key absent" distinction
 *
 * .note = say: null means key was absent (say all default)
 *         say: [] means key was present but empty (say none)
 *         not: [] means exclude naught — absent and empty agree, so it is not nullable
 */
const resolveResourceCuration = (
  input: ResourceCurationDeclared | undefined,
): ResourceCurationResolved | null => {
  if (!input) return null;
  return {
    say: input.say ?? null, // undefined → null (key absent), array → array (key present)
    ref: input.ref ?? [],
    not: input.not ?? [],
  };
};

/**
 * .what = resolves a subject section to SubjectSectionResolved
 * .why = applies defaults for briefs and skills within a section
 */
const resolveSubjectSection = (
  input:
    | {
        briefs?: ResourceCurationDeclared;
        skills?: ResourceCurationDeclared;
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
  const raw = parseBootYamlRaw({ content: input.content, path: input.path });

  // handle null or empty content
  if (!raw || typeof raw !== 'object') return null;

  const rawObject = raw as Record<string, unknown>;

  // refuse an inert budget before any mode work — a cap the gate cannot see is a silent pass
  assertNoInertBudget({ raw: rawObject, path: input.path });

  // refuse an unusable budget VALUE here too — the key is mode-independent, so its refusal
  // must be as well, or the caller is told the wrong subject failed (`rule.forbid.friction-hazards`)
  assertDeclaredBudgetValid({ raw: rawObject, path: input.path });

  // 🔴 and the twin one axis over: a payload section under a key no mode reads. it runs BEFORE
  //    `computeBootMode`, so a spec whose ONLY section key is mistyped refuses by name rather
  //    than collapse to mode `none` and refuse as "no payload to cap"
  assertNoInertSection({ raw: rawObject, path: input.path });

  // detect mode
  const mode = computeBootMode({ raw: rawObject });

  // handle none mode (no boot.yml config)
  if (mode === 'none') return null;

  // validate and return based on mode
  if (mode === 'simple') {
    const result = schemaRoleBootSpecSimplified.safeParse(rawObject);
    if (!result.success) {
      throw new ConstraintError('boot.yml has invalid schema for simple mode', {
        path: input.path,
        errors: result.error.issues,
      });
    }

    return new RoleBootSpecSimplified({
      mode: 'simple',
      briefs: resolveResourceCuration(result.data.briefs),
      skills: resolveResourceCuration(result.data.skills),
      budget: resolveBootBudget(result.data.budget),
    });
  }

  // subject mode
  const result = schemaRoleBootSpecSubjected.safeParse(rawObject);
  if (!result.success) {
    throw new ConstraintError('boot.yml has invalid schema for subject mode', {
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
          briefs?: ResourceCurationDeclared;
          skills?: ResourceCurationDeclared;
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
    budget: resolveBootBudget(result.data.budget),
  });
};
