import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { assertBootMdDelivered } from './assertBootMdDelivered';

const BOOT_MD_PATH =
  '/repo/.agent/.actors/actor.via.hash=abc/brain/.claude/boot.md';

/**
 * .what = the rendered == delivered clamp, both branches
 * .why = the guard's whole job is to turn a SILENT wrong corpus into a loud refusal, so
 *        the branch that matters is the unequal one — a suite that only proved the equal
 *        branch would pass with the guard deleted
 */
describe('assertBootMdDelivered', () => {
  given('[case1] the bytes read back match the bytes rendered', () => {
    when('[t0] asserted', () => {
      then('it returns, and raises no error', () => {
        expect(
          assertBootMdDelivered({
            bootMdPath: BOOT_MD_PATH,
            rendered: '<brief.say>a</brief.say>\n',
            delivered: '<brief.say>a</brief.say>\n',
          }),
        ).toBeUndefined();
      });
    });
  });

  given(
    '[case2] the read-back is TRUNCATED — the silent-and-wrong case',
    () => {
      const rendered = '<brief.say>the whole corpus</brief.say>\n';
      const delivered = '<brief.say>the whole';

      when('[t0] asserted', () => {
        then('a MalfunctionError is raised', () => {
          const error = getError(() =>
            assertBootMdDelivered({
              bootMdPath: BOOT_MD_PATH,
              rendered,
              delivered,
            }),
          );

          expect(error).toBeInstanceOf(MalfunctionError);
        });

        then(
          'it names the path and BOTH char counts, so the gap is legible',
          () => {
            const error = getError(() =>
              assertBootMdDelivered({
                bootMdPath: BOOT_MD_PATH,
                rendered,
                delivered,
              }),
            );
            const detail = JSON.stringify(error);

            expect(detail).toContain(BOOT_MD_PATH);
            expect(detail).toContain(String(rendered.length));
            expect(detail).toContain(String(delivered.length));
          },
        );

        then('the hint names the filesystem causes a human can act on', () => {
          const error = getError(() =>
            assertBootMdDelivered({
              bootMdPath: BOOT_MD_PATH,
              rendered,
              delivered,
            }),
          );
          const detail = JSON.stringify(error);

          expect(detail).toContain('full disk');
          expect(detail).toContain('read-only mount');
        });
      });
    },
  );

  given('[case3] the read-back is the SAME LENGTH but different bytes', () => {
    when('[t0] asserted', () => {
      /**
       * .note = a length check alone would pass this. the guard compares content, so a
       *   corpus swapped for another of equal size is caught too
       */
      then('a MalfunctionError is raised', () => {
        const error = getError(() =>
          assertBootMdDelivered({
            bootMdPath: BOOT_MD_PATH,
            rendered: 'aaaa',
            delivered: 'bbbb',
          }),
        );

        expect(error).toBeInstanceOf(MalfunctionError);
      });
    });
  });

  given('[case4] the read-back is EMPTY — the file was discarded', () => {
    when('[t0] asserted', () => {
      then('a MalfunctionError is raised', () => {
        const error = getError(() =>
          assertBootMdDelivered({
            bootMdPath: BOOT_MD_PATH,
            rendered: 'a corpus',
            delivered: '',
          }),
        );

        expect(error).toBeInstanceOf(MalfunctionError);
      });
    });
  });
});
