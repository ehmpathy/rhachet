import { given, then, when } from 'test-fns';

import type { RoleBootSpec } from '@src/domain.objects/RoleBootSpec';
import { asBootRemedyMode } from '@src/domain.operations/boot/asBootRemedyMode';

/**
 * .what = the REMEDY mode parts from the SCHEMA mode exactly where it must
 * .why = the ladder's fifth rung — `narrow`, *"boot fewer subjects"* — is a real move only
 *   where a subject exists to narrow to. a spec with only `always:` is `mode: 'subject'`
 *   by schema, and offers no narrow at all.
 */
describe('asBootRemedyMode', () => {
  given('[case1] no spec at all', () => {
    when('[t0] the remedy mode is cast', () => {
      then(
        'it is simple — a boot with no spec has no subject to narrow to',
        () => {
          expect(asBootRemedyMode({ spec: null })).toEqual('simple');
        },
      );
    });
  });

  given('[case2] a simple-mode spec', () => {
    const spec: RoleBootSpec = {
      mode: 'simple',
      briefs: { say: ['briefs/**/*.md'], ref: [], not: [] },
      skills: null,
      budget: { tokens: 5000 },
    } as RoleBootSpec;

    when('[t0] the remedy mode is cast', () => {
      then('it is simple', () => {
        expect(asBootRemedyMode({ spec })).toEqual('simple');
      });
    });
  });

  given('[case3] a subject-mode spec that declares NO subject section', () => {
    // `always:` alone parses as subject mode by schema, with no subject to narrow to
    const spec: RoleBootSpec = {
      mode: 'subject',
      always: {
        briefs: { say: ['briefs/**/*.md'], ref: [], not: [] },
        skills: null,
      },
      subjects: {},
      budget: { tokens: 5000 },
    } as RoleBootSpec;

    when('[t0] the remedy mode is cast', () => {
      then('it is SIMPLE, never subject — a narrow here shrinks naught', () => {
        expect(asBootRemedyMode({ spec })).toEqual('simple');
      });

      then('it disagrees with the schema mode, deliberately', () => {
        expect(spec.mode).toEqual('subject');
        expect(asBootRemedyMode({ spec })).not.toEqual(spec.mode);
      });
    });
  });

  given('[case4] a subject-mode spec with at least one subject section', () => {
    const spec: RoleBootSpec = {
      mode: 'subject',
      always: null,
      subjects: {
        'subject.review': {
          briefs: { say: ['briefs/review/**/*.md'], ref: [], not: [] },
          skills: null,
        },
      },
      budget: { tokens: 5000 },
    } as RoleBootSpec;

    when('[t0] the remedy mode is cast', () => {
      then('it is subject — a narrow names a real move', () => {
        expect(asBootRemedyMode({ spec })).toEqual('subject');
      });
    });
  });
});
