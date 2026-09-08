import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asCliErrorFrame } from './asCliErrorFrame';
import { asCliErrorJson } from './asCliErrorJson';

/**
 * .what = the BOUNDARY invariant behind the unredacted-metadata guarantee — every field a
 *   thrower attaches reaches BOTH rendered channels, whatever its name
 *
 * .why = the guarantee is stated in two docblocks (`asCliErrorFrame`'s *"the metadata is
 *   UNREDACTED — always"* and `asCliErrorJson`'s *"the error's FULL metadata payload,
 *   verbatim and unredacted"*) and, until this file, enforced by no invariant. what held it
 *   was a set of per-frame acceptance snapshots — the pty-absent frame, the unreadable-probe
 *   notice, the deaf-say hint, the pty-device-refused frame, the bind-fault frame. each pins
 *   the render of ONE error.
 *
 * 🚨 .why that is not enough = the property was proven POINTWISE, never universally. a sixth
 *   error class that attaches a field the render happened to drop would be caught only once
 *   someone wrote an acceptance case for it — the exact *"payload ≠ screen"* defect class,
 *   one level up.
 *
 * 🔴 .why it is not hypothetical = `asCliErrorJson`'s own docblock records the regression:
 *   *"the earlier shape carried the five curated fields ALONE, so every other field a thrower
 *   attached was discarded at the last layer, after every upstream author did the work right."*
 *   the render HAS narrowed silently before, and it shipped.
 *
 * ⚠️ .the sentinel field name carries the whole load. it must be one the curated members
 *   (`hint`, `reachState`, `reachCause`) do NOT name — otherwise the row passes through the
 *   very curation it exists to bypass.
 */

/**
 * .what = a metadata key no curated shape names, and no domain error attaches
 * .why = the clamp asks whether an UNKNOWN field survives. a known one cannot answer that —
 *   it would ride a curated slot and read green while the general property was broken.
 */
const SENTINEL_KEY = 'aFieldNoCuratedShapeNames';
const SENTINEL_VALUE = 'sentinel-value-reaches-the-render';

describe('metadataReachability', () => {
  given('[case1] each error class, with a field no curated shape names', () => {
    const errors = [
      {
        class: 'ConstraintError',
        error: new ConstraintError('a caller-fault sentence', {
          hint: 'do the repair',
          [SENTINEL_KEY]: SENTINEL_VALUE,
        }),
      },
      {
        class: 'MalfunctionError',
        error: new MalfunctionError('a server-fault sentence', {
          hint: 'do the repair',
          [SENTINEL_KEY]: SENTINEL_VALUE,
        }),
      },
    ];

    when('[t0] rendered to the HUMAN channel', () => {
      then('every one carries the sentinel key and its value', () => {
        for (const subject of errors) {
          const rendered = asCliErrorFrame({ error: subject.error }).join('\n');
          expect(rendered).toContain(SENTINEL_KEY);
          expect(rendered).toContain(SENTINEL_VALUE);
        }
      });

      /**
       * .why here = `hint` is hoisted to the front by `asMetadataHintFirst`, and a hoist is a
       *   re-insertion. a reorder that DROPPED its tail would still render the fix sentence,
       *   so the row above must be paired with one that proves the tail survived the hoist.
       */
      then('the hint hoist does not drop the fields behind it', () => {
        for (const subject of errors) {
          const rendered = asCliErrorFrame({ error: subject.error }).join('\n');
          expect(rendered.indexOf('do the repair')).toBeLessThan(
            rendered.indexOf(SENTINEL_KEY),
          );
        }
      });
    });

    when('[t1] rendered to the MACHINE channel', () => {
      then('every one carries the sentinel key and its value', () => {
        for (const subject of errors) {
          const shape = asCliErrorJson({ error: subject.error });
          expect(shape.metadata[SENTINEL_KEY]).toEqual(SENTINEL_VALUE);
        }
      });

      then('the class is the one the thrower chose', () => {
        for (const subject of errors)
          expect(asCliErrorJson({ error: subject.error }).class).toEqual(
            subject.class,
          );
      });
    });
  });

  given('[case2] an error whose metadata holds a nested PLAIN Error', () => {
    /**
     * .why this case = `JSON.stringify` renders an `Error` as `{}` — `name`, `message`, and
     *   `stack` are all non-enumerable. so a thrower that attaches `cause: error` (the
     *   semantically right name, and 19 sites do it) would have its whole diagnosis erased
     *   at the last layer. `asMetadataLegible` projects it to `{class, message}`; this pins
     *   that the projection HAPPENS rather than the value emitted as an empty object.
     *
     * 🚨 .why a PLAIN `Error`, and not a `helpful-errors` one = measured 2026-09-05, by
     *   mutation. this case first used a nested `ConstraintError` and the HUMAN-channel row
     *   stayed GREEN with `asMetadataLegible` bypassed — because a helpful-errors class
     *   carries its own `toJSON`, so it never renders as `{}` and needs no projection. the
     *   row read as a clamp and guarded naught.
     *
     * ⇒ the real hazard is the error class that has NO `toJSON`: a node syscall error off
     *   `net.Server`/`fs`, which is exactly what the `cause:` sites carry. so the nested
     *   value must be a plain `Error` — the one shape the projection actually rescues.
     */
    const error = new MalfunctionError('the outer sentence', {
      cause: new Error('the inner sentence'),
    });

    when('[t0] rendered to the MACHINE channel', () => {
      then('the nested error is projected, never an empty object', () => {
        const shape = asCliErrorJson({ error });
        expect(shape.metadata.cause).toEqual({
          class: 'Error',
          message: 'the inner sentence',
        });
      });
    });

    when('[t1] rendered to the HUMAN channel', () => {
      then('the nested sentence reaches the frame', () => {
        const rendered = asCliErrorFrame({ error }).join('\n');
        expect(rendered).toContain('the inner sentence');
        expect(rendered).not.toContain('"cause": {}');
      });
    });
  });
});
