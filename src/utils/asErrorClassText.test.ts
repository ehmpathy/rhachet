import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asErrorClassText } from './asErrorClassText';

describe('asErrorClassText', () => {
  given('[case1] an unclassified Error', () => {
    when('[t0] it is rendered for a report row', () => {
      then('the bare class leads, so the row stays greppable', () => {
        expect(
          asErrorClassText({ error: new Error('no adapter found') }),
        ).toEqual('Error: no adapter found');
      });

      then('a subclass names ITSELF, never the base class', () => {
        expect(
          asErrorClassText({ error: new TypeError('x is not a fn') }),
        ).toEqual('TypeError: x is not a fn');
      });
    });
  });

  given('[case2] a ConstraintError — a caller-fixable fault', () => {
    when('[t0] it is rendered for a report row', () => {
      // 🚨 the point of the whole transformer: a HelpfulError bakes `<glyph> <ClassName>: `
      //   into `.message` itself, so a prepended token would render a SECOND one. the class
      //   is present EXACTLY once, and it is the class the thrower chose — never a relabel
      then('its own baked prefix is used, exactly once', () => {
        const text = asErrorClassText({
          error: new ConstraintError('no adapter found'),
        });
        expect(text).toContain('ConstraintError');
        expect(text).toContain('no adapter found');
        expect(text.match(/ConstraintError/g)).toHaveLength(1);
      });

      then(
        'the caller-fix verdict is NOT overwritten with a malfunction one',
        () => {
          const text = asErrorClassText({
            error: new ConstraintError('no adapter found'),
          });
          expect(text).not.toContain('MalfunctionError');
        },
      );
    });
  });

  given('[case3] a MalfunctionError that holds metadata', () => {
    when('[t0] it is rendered for a one-row report', () => {
      // ⚠️ `HelpfulError` appends its serialized metadata to `.message`. that is right for a
      //   stderr frame with room to spare and wrong for a tree row, where the blob buries the
      //   sentence — so the row redacts it and the frame keeps it
      then(
        'the metadata blob is redacted off, and the sentence survives',
        () => {
          const text = asErrorClassText({
            error: new MalfunctionError('hook sync failed', {
              brain: 'claude',
              hint: 'reinstall the adapter',
            }),
          });
          expect(text).toContain('MalfunctionError');
          expect(text).toContain('hook sync failed');
          expect(text).not.toContain('reinstall the adapter');
        },
      );
    });
  });

  given('[case4] a thrown value that is not an Error at all', () => {
    when('[t0] a string is thrown', () => {
      then('it renders totally rather than faults', () => {
        expect(asErrorClassText({ error: 'boom' })).toEqual('boom');
      });
    });

    when('[t1] an object whose own toString throws is thrown', () => {
      // 🚨 a render that faults inside a catch block does not degrade the report, it destroys
      //   it — `asThrownValueText` is total for exactly this, and the delegation is what makes
      //   this transformer safe at every catch site that calls it
      then('the render is total, never a second throw', () => {
        const hostile = {
          toString: () => {
            throw new Error('toString faulted');
          },
        };
        expect(() => asErrorClassText({ error: hostile })).not.toThrow();
        expect(asErrorClassText({ error: hostile })).toEqual('[object Object]');
      });
    });

    when('[t2] null is thrown', () => {
      then('it renders as the honest word, never [object Null]', () => {
        expect(asErrorClassText({ error: null })).toEqual('null');
      });
    });
  });
});
