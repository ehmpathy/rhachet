import {
  BadRequestError,
  ConstraintError,
  MalfunctionError,
} from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asCliErrorClassified } from './asCliErrorClassified';
import { asCliErrorGlyph } from './asCliErrorGlyph';
import { asCliErrorJson } from './asCliErrorJson';
import { getExitCodeFromError } from './getExitCodeFromError';

describe('asCliErrorClassified', () => {
  given(
    '[case1] a CLASSIFIED error, thrown by a site that named its owner',
    () => {
      when('[t0] the caller-fault leaf is passed through', () => {
        then('the SAME instance is returned — never a re-wrap', () => {
          /**
           * 🚨 the identity check is the sharp one. a re-wrap would bury a
           *   `ConstraintError` (exit 2, the caller amends) inside a
           *   `MalfunctionError` (exit 1, ours) and invert the one signal the class
           *   exists to send — and a deep-equality assert would pass on that.
           */
          const thrown = new ConstraintError('a caller typed a bad flag', {
            hint: 'pass --env test',
          });
          expect(asCliErrorClassified({ error: thrown })).toBe(thrown);
        });

        then('its exit code and glyph survive untouched', () => {
          const classified = asCliErrorClassified({
            error: new ConstraintError('a caller typed a bad flag'),
          });
          expect(getExitCodeFromError({ error: classified })).toEqual(2);
          expect(asCliErrorGlyph({ error: classified })).toEqual('✋');
        });
      });

      when('[t1] the server-fault leaf is passed through', () => {
        then('the SAME instance is returned, exit 1 and all', () => {
          const thrown = new MalfunctionError('a socket bind faulted');
          const classified = asCliErrorClassified({ error: thrown });
          expect(classified).toBe(thrown);
          expect(getExitCodeFromError({ error: classified })).toEqual(1);
        });
      });

      when('[t2] a DEPRECATED parent class is passed through', () => {
        then(
          'it is passed through too — the renderer never overrules a thrower',
          () => {
            /**
             * 🚨 .why this row asserts the DEFECT rather than a cure = a `BadRequestError`
             *   carries no `.code`, so a caller fault exits 1 (the malfunction code). that
             *   is real and it is wrong — and to special-case it HERE is the exact move
             *   `rule.forbid.helpful-error-parents` names as *"the trap"*:
             *   *"if a type guard or renderer rejects your error, the ERROR is wrong — not
             *   the guard."*
             *
             * ⚠️ so this row exists to make the renderer's neutrality a GUARANTEE. it goes
             *   red the day someone repairs the exit code at this layer instead of at the
             *   throw sites that still owe the owner question — a repair that would hide
             *   the very symptom the migration runs on.
             */
            const thrown = new BadRequestError(
              'a parent class, no owner named',
            );
            expect(asCliErrorClassified({ error: thrown })).toBe(thrown);
          },
        );
      });
    },
  );

  given(
    '[case2] an UNCLASSIFIED error — a bare Error our contract never named',
    () => {
      /**
       * 🚨 this is the case the whole transformer exists for. before it, such a throw
       *   escaped the cli entirely and reached the human as node's uncaught-exception
       *   dump: a raw stack, no glyph, no class verdict, no hint, and an exit code node
       *   chose rather than one we judged.
       */
      const thrown = new Error('⛈️ duplicate role.slug "echoer"');

      when('[t0] it is classified', () => {
        then('the verdict is MALFUNCTION — ours to repair, exit 1', () => {
          /**
           * ⚠️ .why malfunction rather than constraint = an unclassified throw means OUR
           *   error contract has a gap at its throw site. no input a human types should
           *   be able to produce one, so `yours to amend` would be a false accusation.
           */
          const classified = asCliErrorClassified({ error: thrown });
          expect(classified).toBeInstanceOf(MalfunctionError);
          expect(getExitCodeFromError({ error: classified })).toEqual(1);
          expect(asCliErrorGlyph({ error: classified })).toEqual('💥');
        });

        then(
          'the SYMPTOM leads the message, never a note about the gap',
          () => {
            /**
             * ⚠️ the frame's anatomy is what / why / fix. the symptom is the WHAT and it
             *   leads; a message that opened with our own record-keep would put the gap
             *   ahead of what actually broke.
             *
             * 🚨 read through `asCliErrorJson`, never off `.message` — a `HelpfulError`
             *   DECORATES its own `.message` with a glyph, a class prefix, and a
             *   serialized-metadata tail. so `.message` is the lib's internal render and
             *   this is the sentence a human and a machine actually receive. a `toContain`
             *   on the raw `.message` would pass under either shape and clamp no contract.
             */
            expect(
              asCliErrorJson({ error: asCliErrorClassified({ error: thrown }) })
                .message,
            ).toEqual('⛈️ duplicate role.slug "echoer"');
          },
        );

        then('the ORIGINAL error is carried as `cause`, class and all', () => {
          /**
           * 🚨 the original CLASS is the diagnosis — a `TypeError` and an
           *   `ERR_DLOPEN_FAILED` want different repairs. the top-line class is now the
           *   verdict (`MalfunctionError`), so the class actually raised has to survive
           *   somewhere, and `cause` is the settled name for it here.
           */
          const metadata = asCliErrorClassified({ error: thrown }).metadata as {
            cause: unknown;
          };
          expect(metadata.cause).toBe(thrown);
        });

        then(
          'the STACK survives in full — an unclassified error has no other diagnosis',
          () => {
            /**
             * 🚨 `asCliErrorJson` projects a nested `Error` down to `{ class, message }`
             *   and drops its stack as bulk — correct for an error that carries a hint and
             *   named metadata, and wrong here, because an unclassified one has neither.
             *   so the stack is attached as its OWN string field, which that projection
             *   leaves alone.
             *
             * ⚠️ asserted as a WHOLE-string equality, so a later "let us just truncate it"
             *   goes red. a cut takes frames off one end, and the frame that names the
             *   cause sits at whichever end the defect chose.
             */
            const metadata = asCliErrorClassified({ error: thrown })
              .metadata as {
              stack: unknown;
            };
            expect(metadata.stack).toEqual(thrown.stack);
          },
        );

        then(
          'the HINT names the THROW SITE as the repair, not this layer',
          () => {
            /**
             * ⚠️ the fix for an unclassified error is never "re-run it". it is to raise a
             *   classified error where it was raised, so no layer has to guess
             *   (`rule.require.errors-name-the-fix`).
             */
            const metadata = asCliErrorClassified({ error: thrown })
              .metadata as {
              hint: string;
            };
            expect(metadata.hint).toContain('THROW SITE');
            expect(metadata.hint).toContain('ConstraintError');
            expect(metadata.hint).toContain('MalfunctionError');
          },
        );
      });

      when('[t1] the unclassified error is an Error SUBCLASS', () => {
        then(
          'the subclass name survives on `cause`, so the diagnosis is not flattened',
          () => {
            const typeError = new TypeError('x is not a function');
            const metadata = asCliErrorClassified({ error: typeError })
              .metadata as { cause: Error };
            expect(metadata.cause.constructor.name).toEqual('TypeError');
          },
        );
      });
    },
  );

  given(
    '[case3] a NON-error value thrown — a string, a symbol, an object',
    () => {
      /**
       * ⚠️ rarer and MORE opaque than a bare `Error`: it carries no message and no stack,
       *   so the type and a total render of the value are the only facts there are. and
       *   this runs on the LAST-resort path, so a render that throws here would replace
       *   the human's real verdict with a render fault and leave them with no output.
       */
      when('[t0] a string is thrown', () => {
        then('it is classified, with the value and its type reported', () => {
          const classified = asCliErrorClassified({ error: 'a bare string' });
          expect(classified).toBeInstanceOf(MalfunctionError);
          // the UNDECORATED sentence, per `[case2] [t0]`'s note
          expect(asCliErrorJson({ error: classified }).message).toEqual(
            'a non-error value was thrown',
          );
          expect(classified.metadata).toMatchObject({
            thrownType: 'string',
            thrownValue: 'a bare string',
          });
        });
      });

      when('[t1] a SYMBOL is thrown', () => {
        then('it renders its descriptive text', () => {
          /**
           * ⚠️ this row once claimed to be *"the sharpest in this case"*, on the premise
           *   that `String(aSymbol)` raises a `TypeError`. it does NOT — `String(value)`
           *   carries an explicit carve-out for symbols. what raises is IMPLICIT
           *   conversion, a template literal or `+ ''`, and this path uses neither.
           *
           *   the row is kept because a symbol IS a real thrown value and its metadata
           *   shape is worth a clamp. it is no longer the fault row: `[t2]` is, and the
           *   premise itself is measured in `asThrownValueText.test.ts`.
           */
          const classified = asCliErrorClassified({ error: Symbol('nope') });
          expect(classified.metadata).toMatchObject({
            thrownType: 'symbol',
            thrownValue: 'Symbol(nope)',
          });
        });
      });

      when('[t2] an object whose own `toString` THROWS is thrown', () => {
        then(
          'it renders rather than throws — the value never gets a vote',
          () => {
            /**
             * 🚨 the second total-render row, and it covers the case a `String()` call and a
             *   `JSON.stringify` would BOTH fault on. `Object.prototype.toString.call`
             *   invokes no user code, which is why no catch is owed.
             */
            const hostile = {
              toString: () => {
                throw new Error('i refuse to render');
              },
            };
            const classified = asCliErrorClassified({ error: hostile });
            expect(classified.metadata).toMatchObject({
              thrownType: 'object',
              thrownValue: '[object Object]',
            });
          },
        );
      });

      when('[t3] a null is thrown', () => {
        then('it is classified rather than mistaken for an object', () => {
          /**
           * ⚠️ `typeof null === 'object'`, so a guard that forgot the null check would
           *   send this down the object branch. the report stays honest either way, but
           *   the rendered value would read `[object Null]` rather than `null`.
           */
          expect(asCliErrorClassified({ error: null }).metadata).toMatchObject({
            thrownType: 'object',
            thrownValue: 'null',
          });
        });
      });
    },
  );

  given('[case4] every variant a caller could be handed', () => {
    /**
     * 🚨 the rows above read fields and message fragments, so they are blind to the shape
     *   of the CLASSIFIED error as a whole — a dropped or added metadata field, a hint
     *   whose format moved, a `cause` that stopped to serialize. this pins the complete
     *   rendered result for each variant
     *   (`rule.require.contract-snapshot-exhaustiveness`).
     *
     * ⚠️ `stack` is MASKED rather than carved out. it is host- and run-dependent, so a raw
     *   snapshot of it would redden on every machine — but to drop the field entirely
     *   would hide whether it survives the wrap at all, which is a real guarantee here
     *   (the rule's own note on masked non-determinism).
     */
    const asMaskedJson = (thrown: unknown): unknown => {
      const shape = JSON.parse(
        JSON.stringify(
          asCliErrorJson({ error: asCliErrorClassified({ error: thrown }) }),
        ),
      ) as { metadata?: Record<string, unknown> };
      if (shape.metadata && 'stack' in shape.metadata)
        shape.metadata.stack =
          typeof shape.metadata.stack === 'string' ? '<stack>' : '<absent>';
      return shape;
    };

    when('[t0] each variant is classified and rendered', () => {
      then('the complete shape of each is pinned', () => {
        expect({
          'classified — ConstraintError': asMaskedJson(
            new ConstraintError('yours to amend', { hint: 'pass --as' }),
          ),
          'classified — MalfunctionError': asMaskedJson(
            new MalfunctionError('ours to repair'),
          ),
          // ⚠️ passes through UNWRAPPED, by design — it is a `HelpfulError`, and to
          //   re-wrap would bury a leaf's exit code inside a `MalfunctionError`'s. the
          //   repair for a parent is at its THROW SITE, never here
          //   (`rule.forbid.helpful-error-parents`). the row pins that decision so a
          //   later reader does not mistake the hintless render for a gap
          'parent class, passed through by design — BadRequestError':
            asMaskedJson(new BadRequestError('a parent class')),
          'a bare Error': asMaskedJson(new Error('bare')),
          'a thrown string': asMaskedJson('just a string'),
          'a thrown null': asMaskedJson(null),
        }).toMatchSnapshot();
      });
    });
  });
});
