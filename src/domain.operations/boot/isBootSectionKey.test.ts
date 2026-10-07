import { given, then, when } from 'test-fns';

import { isBootSectionKey } from './isBootSectionKey';

/**
 * .what = clamps which top-level `boot.yml` keys name a payload SECTION
 * .why = `computeBootMode` and `assertNoInertBudget` both consume it, so a boot's mode and
 *        its budget guard agree on what a section is
 * .note = `budget` must read `false`, or a budget beside `briefs:` trips the mixed-mode guard
 */
describe('isBootSectionKey', () => {
  given('[case1] the two shapes a section can take', () => {
    when('[t0] each is asked', () => {
      then('`always` is a section', () => {
        expect(isBootSectionKey('always')).toEqual(true);
      });

      then('any `subject.` coordinate is a section', () => {
        // the subject axis is OPEN — the schema's catchall admits any coordinate, so
        // the test is a prefix rather than a roster
        expect(isBootSectionKey('subject.repo')).toEqual(true);
        expect(isBootSectionKey('subject.env')).toEqual(true);
        expect(isBootSectionKey('subject.a.deeper.one')).toEqual(true);
      });
    });
  });

  given('[case2] the top-level keys that are NOT sections', () => {
    when('[t0] each is asked', () => {
      then('`budget` is a MODIFIER, never a section', () => {
        // 🔴 the clamp that bites. `computeBootMode` excludes `budget` from mode
        //    detection on purpose: it caps whatever payload the mode selects, so a
        //    `true` here reads as a second mode pattern beside `briefs:` and the
        //    mixed-mode guard refuses a spec that is legal
        expect(isBootSectionKey('budget')).toEqual(false);
      });

      then('the simple-mode payload keys are not sections', () => {
        expect(isBootSectionKey('briefs')).toEqual(false);
        expect(isBootSectionKey('skills')).toEqual(false);
      });

      then('a key that merely STARTS like one is not a section', () => {
        // `subject` bare, and `subjective`, both lack the `.` the coordinate form
        // requires — so neither parses as a section and neither may be read as one
        expect(isBootSectionKey('subject')).toEqual(false);
        expect(isBootSectionKey('subjective')).toEqual(false);
      });

      then('a forward-compat key a foreign spec adds is not a section', () => {
        // .why = the parse is permissive by design, so an unknown top-level key from a
        //   spec this repo cannot edit must fall through rather than halt a consumer
        //   (`define.invariant.a-symlink-under-agent-is-foreign`)
        expect(isBootSectionKey('aKeyUpstreamAddedLater')).toEqual(false);
      });
    });
  });
});
