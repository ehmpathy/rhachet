import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asCliErrorFrame } from './asCliErrorFrame';

/**
 * .what = the frame line that carries `<glyph> <Class>: <sentence>`
 * .why  = a frame opens with a blank spacer row, so the glyph line is the SECOND. that
 *   index is the datum a reader would otherwise simulate, and it is stated here once
 *   (`rule.forbid.inline-decode-friction`)
 */
const asGlyphLineFromFrame = (input: { error: Error }): string =>
  asCliErrorFrame({ error: input.error })[1] ?? '';

/**
 * .what = the glyph off a `<glyph> <Class>: <sentence>` line
 * .why  = the glyph is that line's first word. a SEPARATE step from the line lookup above,
 *   because the two decode different facts — WHICH row carries the glyph, and WHICH word
 *   on it is the glyph — and a single function that did both left the second one sliced
 *   inline under a docblock that claimed neither was (raised by the r003
 *   `mech-decode-friction` lane at i065)
 */
const asGlyphFromGlyphLine = (input: { line: string }): string =>
  input.line.split(' ')[0] ?? '';

/**
 * .what = the glyph an error renders WITH, read off its composed frame
 */
const asGlyphFromFrame = (input: { error: Error }): string =>
  asGlyphFromGlyphLine({ line: asGlyphLineFromFrame({ error: input.error }) });

describe('asCliErrorFrame', () => {
  // 🚨 THE CLAMP for a defect this file's own earlier clamp BLESSED. three shapes have
  //   shipped on this surface, one after the other:
  //
  //     1. a bare `.message` — printed the whole metadata blob, so a captured install log
  //        buried the one sentence that named the fix
  //     2. a redact — cured that, and dropped the class name AND every metadata field but
  //        `hint`, which deleted the fix on every OTHER error (the ones whose fix lives in
  //        `path` / `from` / `envVar`), and made `✋` the only party signal a human got
  //     3. this one — the prefix is UNABRIDGED and the metadata is UNREDACTED, and the ONE
  //        real problem shape 2 was after (bulk in a field) is bounded AT ITS SOURCE
  //
  //   ⚠️ shape 2's tests asserted `'✋ keyrack.yml not found'` and a `'   └─ '` hint row —
  //   so the clamp DESCRIBED the redaction and every resnap re-blessed it. the rows below
  //   assert the full contract instead, so neither 1 nor 2 can be written again
  given('[case1] an error whose fix lives ONLY in metadata.hint', () => {
    // the `invokeKeyrack` shape, verbatim: the sentence names WHAT, and the entire HOW
    // sits in `hint`. a dozen of these throw on a path that never wraps
    const error = new ConstraintError('keyrack.yml not found', {
      hint: 'run `rhx keyrack init` to create keyrack.yml',
    });

    when('[t0] the frame is composed', () => {
      then('the CLASS NAME is named, never abridged to its glyph', () => {
        // 🚨 the row shape 2 deleted. a human cannot grep `ConstraintError` out of a `✋`,
        //   and neither can a log query or a CI parser — so the glyph is not a substitute
        //   for the name, it is a companion to it
        expect(asCliErrorFrame({ error })).toContain(
          '✋ ConstraintError: keyrack.yml not found',
        );
      });

      then(
        'the fix survives — this is the row a blanket redact deleted',
        () => {
          expect(asCliErrorFrame({ error }).join('\n')).toContain(
            'run `rhx keyrack init` to create keyrack.yml',
          );
        },
      );

      then('the BYTES a human reads are pinned', () => {
        // ⚠️ the assertions above pin the two GUARANTEES (the unabridged prefix, and
        //   the fix that survives); this pins the render — indentation, blank lines,
        //   the gap between rows. a `toContain` is blind to every one of those
        //   (`rule.require.contract-snapshot-exhaustiveness`)
        expect(asCliErrorFrame({ error })).toMatchSnapshot();
      });
    });
  });

  given(
    '[case2] an error whose metadata carries several diagnostic fields',
    () => {
      // 🚨 the shape that proves metadata is UNREDACTED. the fix here is not in `hint` at
      //   all — it is in `from`, the file a human must actually edit. shape 2 lost every
      //   one of these three fields, and the render still LOOKED complete
      const error = new ConstraintError('keyrack.yml not found', {
        path: '.agent/does-not-exist/keyrack.yml',
        absolutePath: '/TMP_REPO/.agent/does-not-exist/keyrack.yml',
        from: '/TMP_REPO/.agent/keyrack.yml',
      });

      when('[t0] the frame is composed', () => {
        const rendered = asCliErrorFrame({ error }).join('\n');

        then(
          'every metadata field reaches the human, none curated away',
          () => {
            expect(rendered).toContain('.agent/does-not-exist/keyrack.yml');
            expect(rendered).toContain('/TMP_REPO/.agent/keyrack.yml');
          },
        );

        then('the field that names the FIX is among them', () => {
          // ⚠️ `from` is the file to edit. no curated allowlist named it, and no `hint` is
          //   present at all — so a render that keeps only known fields loses the fix here
          expect(rendered).toContain('"from"');
        });

        then('the BYTES a human reads are pinned', () => {
          // ⚠️ the metadata block's own serialization — key order, indentation, quotes —
          //   is invisible to the `toContain` rows above
          //   (`rule.require.contract-snapshot-exhaustiveness`)
          expect(asCliErrorFrame({ error })).toMatchSnapshot();
        });
      });
    },
  );

  given('[case3] an error with no metadata at all', () => {
    const error = new ConstraintError('a plain refusal');

    when('[t0] the frame is composed', () => {
      then('no empty metadata block is rendered', () => {
        // an empty `{}` after a clean sentence reads as a truncated payload
        expect(asCliErrorFrame({ error })).toEqual([
          '',
          '✋ ConstraintError: a plain refusal',
          '',
        ]);
      });

      then('the BYTES a human reads are pinned', () => {
        // ⚠️ the `toEqual` above already pins this variant exactly, so the snapshot adds
        //   no assertion strength — it earns its place by putting EVERY variant in one
        //   reviewable file, which is what the rule's "blind spots in review" names
        expect(asCliErrorFrame({ error })).toMatchSnapshot();
      });
    });
  });

  given('[case4] the two classes side by side', () => {
    const constraint = new ConstraintError('yours to amend');
    const malfunction = new MalfunctionError('ours to repair');

    when('[t0] both frames are composed', () => {
      then(
        'their glyphs DIFFER — the party is legible without the hint',
        () => {
          // 🚨 asserted as a RELATION rather than as two literals. a regression that
          //   hardcoded one glyph for both classes passed every `toContain('✋')` this
          //   repo had, and only a difference assertion catches it
          //
          // ⚠️ the glyph is read off the RENDERED frame, never from `asCliErrorGlyph`
          //   directly — that transformer has its own clamp, and a read of it here would
          //   assert only that it differs from itself, never that the frame CARRIES the
          //   difference through. the frame is the surface a human reads
          expect(asGlyphFromFrame({ error: constraint })).not.toEqual(
            asGlyphFromFrame({ error: malfunction }),
          );
        },
      );

      then('BOTH carry their class name, never the glyph alone', () => {
        expect(asCliErrorFrame({ error: constraint })).toContain(
          '✋ ConstraintError: yours to amend',
        );
        expect(asCliErrorFrame({ error: malfunction })).toContain(
          '💥 MalfunctionError: ours to repair',
        );
      });

      then('the BYTES of BOTH are pinned, side by side', () => {
        // ⚠️ snapped as a PAIR, so a reviewer reads the two parties in one diff — the
        //   difference is the contract here, and two separate snapshots would let a
        //   regression that flattened both to one glyph slip past a per-file read
        expect({
          constraint: asCliErrorFrame({ error: constraint }),
          malfunction: asCliErrorFrame({ error: malfunction }),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case5] an error that writes BULK before its hint', () => {
    // 🚨 the exact insertion order `asNpmInstallFailureError` writes: the log tail lands
    //   in `output`, and `hint` is written LAST. bounded to 20 lines at the source, so the
    //   volume defect is already cured — this case is about the ORDER that survived it
    const error = new ConstraintError(
      'pnpm install failed — permission denied',
      {
        kind: 'permission-denied',
        installExitCode: 243,
        packages: ['rhachet'],
        output: ['line-a', 'line-b', 'line-c'].join('\n'),
        hint: 'retry with elevated permissions, or point pnpm at a prefix you own',
      },
    );

    when('[t0] the frame is composed', () => {
      const rendered = asCliErrorFrame({ error }).join('\n');

      then('the HINT is rendered ABOVE the bulk it was written after', () => {
        // 🚨 the row that clamps the hoist. a field is buried by POSITION as surely as by
        //   volume — `rule.forbid.friction-hazards` names *"a captured install log buried
        //   the one sentence that named the fix"*, and 20 bounded lines above the hint is
        //   still that sentence read last
        //
        //   ⚠️ asserted as a RELATION between two indexes, never as a literal frame. a
        //   literal would also pass if the hoist were deleted and the SOURCE happened to
        //   write `hint` first — which would clamp the call site's habit rather than this
        //   transformer's guarantee
        expect(rendered.indexOf('"hint"')).toBeLessThan(
          rendered.indexOf('"output"'),
        );
      });

      then(
        'the hoist DROPS no field — it is not a redact in a new coat',
        () => {
          // the whole hazard of the reordering is that it looks like the redact this file's
          // docblock records as measured-and-reverted. so every key is asserted present,
          // which is what parts a hoist from a filter
          expect(rendered).toContain('"kind"');
          expect(rendered).toContain('"installExitCode"');
          expect(rendered).toContain('"packages"');
          expect(rendered).toContain('"output"');
          expect(rendered).toContain('line-c');
        },
      );

      then('the whole frame reads as a human reads it', () => {
        // ⚠️ the SNAPSHOT row, and it earns its place beside the assertions rather than in
        //   place of them: the assertions above pin the two GUARANTEES (order, and
        //   completeness), while this pins the bytes — spacing, indentation, the blank
        //   lines — that no assertion names and a reviewer can only judge by sight
        expect(asCliErrorFrame({ error })).toMatchSnapshot();
      });
    });
  });
});
