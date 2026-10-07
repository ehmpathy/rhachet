import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asSubjectFlagValues } from './asSubjectFlagValues';
import { getAllSubjectSlugs } from './getAllSubjectSlugs';

describe('getAllSubjectSlugs', () => {
  given('[case1] a --subject list', () => {
    when('[t0] the flag is absent', () => {
      // absent and empty mean DIFFERENT things to the boot plan: absent boots every
      // subject, empty boots none. so `undefined` may never collapse to `[]`
      then('it yields undefined, never an empty list', () => {
        expect(getAllSubjectSlugs({ raw: undefined })).toEqual(undefined);
      });
    });

    when('[t1] the flag names several subjects, loosely spaced', () => {
      then('each slug is trimmed', () => {
        expect(getAllSubjectSlugs({ raw: ['alpha, beta ,gamma'] })).toEqual([
          'alpha',
          'beta',
          'gamma',
        ]);
      });
    });

    when('[t2] the flag is an empty string', () => {
      then('it is refused as a blank slug', async () => {
        const error = await getError(() => getAllSubjectSlugs({ raw: [''] }));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('--subject names a blank slug');
      });
    });

    when('[t3] the flag holds a stray comma', () => {
      then('it is refused as a blank slug', async () => {
        const error = await getError(() =>
          getAllSubjectSlugs({ raw: ['alpha,,beta'] }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
      });
    });
  });

  given('[case2] the flag is repeated', () => {
    // commander keeps only the LAST value of a repeated flag, so a parse with no collector
    // would boot `lite` alone and drop `deep` in silence. the collector keeps both
    const raw = ['deep', 'lite'].reduce<string[] | undefined>(
      (prior, value) => asSubjectFlagValues(value, prior),
      undefined,
    );

    when('[t0] each occurrence names one subject', () => {
      then('every occurrence is kept, in order', () => {
        expect(getAllSubjectSlugs({ raw })).toEqual(['deep', 'lite']);
      });
    });

    when(
      '[t1] the repeated form and the comma form name the same subjects',
      () => {
        then('they yield the same slugs', () => {
          expect(getAllSubjectSlugs({ raw })).toEqual(
            getAllSubjectSlugs({ raw: ['deep,lite'] }),
          );
        });
      },
    );

    when('[t2] one occurrence holds a blank slug', () => {
      then('the whole flag is refused, never the blank dropped', async () => {
        const error = await getError(() =>
          getAllSubjectSlugs({ raw: ['deep', ''] }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
      });
    });
  });
});
