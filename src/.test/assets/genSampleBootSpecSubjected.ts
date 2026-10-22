import { RoleBootSpecSubjected } from '@src/domain.objects/RoleBootSpec';

/**
 * .what = one subject-mode boot section, with one said brief and the given `always` inheritance
 * .why = the focus suites each build a subject-mode spec from this one section shape, so a
 *   schema change to a section lands in one place (rule.require.shared-test-fixtures)
 */
export const genSampleSubjectSection = (input: { inheritsAlways: boolean }) => ({
  briefs: { say: ['core.md'], ref: [], not: [] },
  skills: null,
  inherit: { always: input.inheritsAlways },
});

/**
 * .what = a subject-mode boot spec: an `always` section plus one section per named subject
 * .why = the focus checks (declared, shed) read a spec, never a file, so a unit suite builds one
 *
 * .note = `shedAlways` names the subjects that opt out of `always`; every other subject inherits
 */
export const genSampleBootSpecSubjected = (input: {
  subjects: string[];
  shedAlways: string[];
}): RoleBootSpecSubjected =>
  new RoleBootSpecSubjected({
    mode: 'subject',
    budget: null,
    always: genSampleSubjectSection({ inheritsAlways: true }),
    subjects: Object.fromEntries(
      input.subjects.map((slug) => [
        slug,
        genSampleSubjectSection({
          inheritsAlways: !input.shedAlways.includes(slug),
        }),
      ]),
    ),
  });
