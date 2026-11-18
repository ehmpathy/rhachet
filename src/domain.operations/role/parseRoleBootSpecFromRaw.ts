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

/**
 * .what = refuses a declared budget the GATE CANNOT SEE — by place, or by name
 * .why = a budget the gate cannot read is a cap that applies to no payload
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
    // a top-level key other than `budget` that carries a `tokens` field declares a token
    //   count no gate reads. the inner key needs no guard: its schema requires `tokens`.
    if (key !== 'budget' && 'tokens' in section)
      throw new ConstraintError(
        'boot.yml declares a top-level key with a token count, but the budget key is spelled `budget` — as written, the cap gates naught',
        { path: input.path, key, expected: 'budget' },
      );
  }
};

/**
 * 🔴 .what = refuses a declared payload SECTION that no mode reads — a mistyped section key
 * .why = a section no mode reads drops its briefs at exit 0 (`subjct.repo:`, `subject-repo:`)
 *
 * .note = the check is structural: a top-level key whose value carries `briefs` or `skills` is
 *   a payload section, however it is spelled; a key that carries neither is untouched
 * .note = `briefs`/`skills` at the top level are simple mode's own section keys, so they are
 *   excluded by name
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
        inherit?: { always: boolean };
      }
    | undefined,
): SubjectSectionResolved | null => {
  if (!input) return null;
  return {
    briefs: resolveResourceCuration(input.briefs),
    skills: resolveResourceCuration(input.skills),
    inherit: { always: input.inherit?.always ?? true },
  };
};

/**
 * .what = refuses an `inherit` the render cannot read — by place, or by name
 * .why = the twin of `assertNoInertBudget`: an author wrote `inherit: { always: false }` to
 *        shed `always`, and a misplaced or misspelled one would boot `always` in silence
 *
 * .note = by PLACE: `inherit` on the `always` section names naught to inherit from
 * .note = by NAME: the test is STRUCTURAL, never a list of typos. a subject-section key other
 *   than `inherit` whose value carries an `always` field declares an inheritance no render reads
 */
const assertNoInertInherit = (input: {
  raw: Record<string, unknown>;
  path: string;
}): void => {
  for (const [key, value] of Object.entries(input.raw)) {
    if (!value || typeof value !== 'object') continue;
    if (!isBootSectionKey(key)) continue;
    const section = value as Record<string, unknown>;

    // by PLACE — `always` cannot opt out of itself
    if (key === 'always') {
      if ('inherit' in section)
        throw new ConstraintError(
          'boot.yml declares `inherit` on the `always` section — only a subject inherits `always`',
          {
            path: input.path,
            section: key,
            hint: 'move `inherit: { always: false }` into the `subject.*` section that should shed `always`',
          },
        );
      continue;
    }

    // by INNER NAME — an `inherit` whose own key is not `always` (e.g. `allways`)
    const inherit = section.inherit;
    if (inherit && typeof inherit === 'object') {
      const keysInert = Object.keys(inherit).filter((one) => one !== 'always');
      if (keysInert.length > 0)
        throw new ConstraintError(
          'boot.yml declares `inherit` with a key no render reads — as written, the subject still boots `always`',
          {
            path: input.path,
            section: key,
            keys: keysInert.join(', '),
            expected: 'always',
            hint: `write \`inherit: { always: false }\` in ${input.path}; if the role is a package you do not own, report it to that package, and enroll without this role (\`--roles -<role>\`) until its fix ships — every boot of the role reads this file`,
          },
        );
    }

    // by NAME — a misspelled `inherit` key
    for (const [field, inner] of Object.entries(section)) {
      if (field === 'inherit') continue;
      if (!inner || typeof inner !== 'object') continue;
      if (!('always' in (inner as Record<string, unknown>))) continue;
      throw new ConstraintError(
        'boot.yml declares an `always` inheritance under a key no render reads — as written, the subject still boots `always`',
        {
          path: input.path,
          section: key,
          key: field,
          expected: 'inherit',
          hint: `rename \`${field}\` to \`inherit\` in ${input.path}; if the role is a package you do not own, report it to that package, and enroll without this role (\`--roles -<role>\`) until its fix ships — every boot of the role reads this file`,
        },
      );
    }
  }
};

/**
 * .what = validates a boot.yml's raw object into a RoleBootSpec
 * .why = a role's `boot.yml` and a mod's `boot.yml` share one schema, so the mode detection,
 *        the inert-key guards and the zod validation are written once, over the raw object
 *        each reader has already parsed and checked for its own extra keys
 *
 * .note = returns null where the raw object declares no section (mode `none`)
 */
export const parseRoleBootSpecFromRaw = (input: {
  raw: Record<string, unknown>;
  path: string;
}): RoleBootSpec | null => {
  const rawObject = input.raw;

  // refuse an inert budget before any mode work — a cap the gate cannot see is a silent pass
  assertNoInertBudget({ raw: rawObject, path: input.path });

  // refuse an unusable budget VALUE here too — the key is mode-independent, so its refusal
  // must be as well, or the caller is told the wrong subject failed (`rule.forbid.friction-hazards`)
  assertDeclaredBudgetValid({ raw: rawObject, path: input.path });

  // 🔴 and the twin one axis over: a payload section under a key no mode reads. it runs BEFORE
  //    `computeBootMode`, so a spec whose ONLY section key is mistyped refuses by name rather
  //    than collapse to mode `none` and refuse as "no payload to cap"
  assertNoInertSection({ raw: rawObject, path: input.path });

  // and an `always` opt-out that no render reads — misplaced, or misspelled
  assertNoInertInherit({ raw: rawObject, path: input.path });

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
          inherit?: { always: boolean };
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
