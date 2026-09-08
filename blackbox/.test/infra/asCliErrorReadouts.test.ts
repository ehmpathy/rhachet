import { given, then, when } from 'test-fns';

import {
  asCliErrorFrameFromOutput,
  asCliErrorJsonFromOutput,
} from './asCliErrorReadouts';

/**
 * .what = the payload EXACTLY as `withCliOutputErrors` emits it —
 *   `console.error(JSON.stringify(shape, null, 2))`
 * .why = 🚨 a fixture that invents its own shape clamps naught. an earlier `[case2]` used
 *   COMPACT single-line json, which the producer never emits — and that is precisely why
 *   it agreed with an extractor that anchored on a bare `{`. the fixture is built by the
 *   same call the producer makes, so it cannot drift from it
 */
const asEmittedPayload = (shape: {
  class: string;
  message: string;
  hint: string | null;
}): string => JSON.stringify(shape, null, 2);

/**
 * .what = the human frame EXACTLY as `asCliErrorFrame` composes it —
 *   `['', '<glyph> <Class>: <message>', '', JSON.stringify(metadata, null, 2), '']`
 *
 * 🚨 .why = the same lesson `asEmittedPayload` above records, applied to the OTHER readout,
 *   where it had gone unapplied. `[case1]` used to hand the extractor a `└─` fix line — a
 *   shape `asCliErrorFrame` has not rendered since it moved to a json metadata block. so the
 *   fixture and the extractor agreed with each other and with no producer on earth, and the
 *   clamp stayed green while four acceptance snapshots silently narrowed to one line.
 *
 * ⚠️ **a fixture that invents its own shape clamps naught** — and the tell is that it agrees
 *   with the extractor. two artifacts written by the same hand cannot cross-check each other;
 *   only the PRODUCER's shape can, which is why this mirrors it line for line.
 */
const asEmittedFrame = (input: {
  glyph: string;
  class: string;
  message: string;
  metadata: Record<string, unknown>;
}): string =>
  [
    '',
    `${input.glyph} ${input.class}: ${input.message}`,
    '',
    JSON.stringify(input.metadata, null, 2),
    '',
  ].join('\n');

/**
 * .what = every line of a block whose TAIL is whitespace
 * .why = the assertion below wants "no line drifts a snapshot on its tail", and a
 *   `split(...).filter(/\s$/)` at the call site states that as a pipeline a reader must
 *   simulate. named, the `then` reads as the property it asserts
 *   (`rule.require.named-transformers`).
 * .note = it yields the OFFENDERS rather than a boolean, so a failure names WHICH lines
 *   broke the property instead of only that one did
 */
const asLinesWithTailSpace = (input: { text: string }): string[] =>
  input.text.split('\n').filter((line) => /\s$/.test(line));

/**
 * .what = unit clamp for the two error readouts the pty acceptance cases take
 * .why = they were extracted from ten inline sites, so a defect in either would now
 *   move ten assertions at once. the extraction is only safe while these hold
 */
describe('asCliErrorReadouts', () => {
  given(
    '[case1] a pty stream that holds fixture noise around one error frame',
    () => {
      const output = [
        'some brain-boot noise',
        asEmittedFrame({
          glyph: '✋',
          class: 'ConstraintError',
          message: 'the reach socket is unavailable',
          metadata: {
            hint: 'pass --no-socket to enroll without one',
            platform: 'linux',
          },
        }),
        'more fixture chatter',
      ].join('\n');

      when('[t0] the frame is read', () => {
        const frame = asCliErrorFrameFromOutput({ output });

        then('the noise is dropped', () => {
          expect(frame).not.toContain('brain-boot noise');
          expect(frame).not.toContain('fixture chatter');
        });

        then('the WHOLE frame survives — glyph line AND metadata block', () => {
          // 🚨 THE ROW THAT WOULD HAVE CAUGHT IT. the prior form asserted a glyph line plus
          //   a `└─` line, so it agreed with a filter that kept exactly those and dropped a
          //   json block entirely. asserted here as the full composed string, so a narrow
          //   read cannot pass
          expect(frame).toEqual(
            [
              '✋ ConstraintError: the reach socket is unavailable',
              '',
              '{',
              '  "hint": "pass --no-socket to enroll without one",',
              '  "platform": "linux"',
              '}',
            ].join('\n'),
          );
        });

        then('the FIX reaches the read, never only the sentence', () => {
          // the property the whole extractor exists for. a frame that carries the class and
          // the message yet drops the hint reads as complete and names no move
          expect(frame).toContain('pass --no-socket to enroll without one');
        });

        then(
          'right-hand whitespace is trimmed, so a snapshot cannot drift on it',
          () => {
            // asserted as the PROPERTY over EVERY line, never a positional slice of the
            // first. whitespace at the end of a metadata line drifts a snapshot exactly as
            // it does on the glyph line, so a first-line read would clamp half the surface
            expect(asLinesWithTailSpace({ text: frame })).toEqual([]);
          },
        );
      });

      when('[t1] a 💥 frame is read', () => {
        then('the malfunction glyph is kept too, never only ✋', () => {
          const frame = asCliErrorFrameFromOutput({
            output: [
              'noise',
              asEmittedFrame({
                glyph: '💥',
                class: 'MalfunctionError',
                message: 'the install is damaged',
                metadata: { hint: 'reinstall rhachet' },
              }),
            ].join('\n'),
          });
          expect(frame).toContain('💥 MalfunctionError:');
          expect(frame).toContain('reinstall rhachet');
          expect(frame).not.toContain('noise');
        });
      });

      when('[t2] the error carries NO metadata at all', () => {
        then('the glyph line alone is a valid frame, never a throw', () => {
          // `asCliErrorFrame` omits the block entirely when metadata is empty, so this is a
          // real render rather than a degenerate one — the span must end cleanly, not hunt
          // for a `{` that was never emitted
          expect(
            asCliErrorFrameFromOutput({
              output: [
                'noise',
                '',
                '✋ ConstraintError: a plain refusal',
                '',
              ].join('\n'),
            }),
          ).toEqual('✋ ConstraintError: a plain refusal');
        });
      });

      when('[t3] the stream holds a ✋ that is NOT a frame', () => {
        then('rhachet chrome is not mistaken for the error frame', () => {
          // 🚨 the discriminator. rhachet prints `└─ ✋ blocked by constraints` as ordinary
          //   chrome, and the prior token filter kept it. the shape anchor — `^<glyph>
          //   <Class>: ` — is what parts a frame from a glyph that merely appears
          const frame = asCliErrorFrameFromOutput({
            output: [
              '🪨 run solid skill repo=x/role=y/skill=z',
              '   └─ ✋ blocked by constraints',
              '',
              '✋ ConstraintError: the real one',
              '',
              '{',
              '  "hint": "re-enroll interactively"',
              '}',
            ].join('\n'),
          });
          expect(frame).not.toContain('blocked by constraints');
          expect(frame).toContain('the real one');
        });
      });

      when('[t4] the stream holds no frame at all', () => {
        then('it throws rather than hands back an empty string', () => {
          // 🚨 an empty frame snapshots as `""` and passes forever — the failhide shape this
          //   whole repair exists to retire (`rule.forbid.failhide`). its peer
          //   `asCliErrorJsonFromOutput` already throws for the same reason
          expect(() =>
            asCliErrorFrameFromOutput({ output: 'no frame here at all' }),
          ).toThrow('no rhachet error frame');
        });
      });
    },
  );

  given(
    '[case2] a --output json stream that holds one payload, as the producer renders it',
    () => {
      const output = [
        'boot noise that mentions no payload',
        asEmittedPayload({
          class: 'ConstraintError',
          message: 'the pty device could not be allocated',
          hint: 'pass --no-socket',
        }),
      ].join('\n');

      when('[t0] the payload is read', () => {
        const parsed = asCliErrorJsonFromOutput({ output });

        then('the class a consumer branches on is recovered', () => {
          expect(parsed.class).toEqual('ConstraintError');
        });

        then('the hint survives', () => {
          expect(parsed.hint).toEqual('pass --no-socket');
        });
      });
    },
  );

  given(
    '[case3] a stream with NO payload — the failure a caller asserts AGAINST',
    () => {
      when('[t0] the payload is read', () => {
        then(
          'it throws rather than hands back a null, so no row can pass empty',
          () => {
            // 🚨 this is the property the extraction had to preserve. each inline site
            //   guarded with `expect(payload).toBeDefined()`; a transformer that returned
            //   null would have silently dropped that guard at all six sites at once
            expect(() =>
              asCliErrorJsonFromOutput({ output: 'no json here at all' }),
            ).toThrow('no CliErrorJson payload');
          },
        );

        then(
          'the throw carries the output, so the failure names its own cause',
          () => {
            expect(() =>
              asCliErrorJsonFromOutput({ output: 'no json here at all' }),
            ).toThrow('no json here at all');
          },
        );
      });
    },
  );

  // 🚨 THE CLAMP for the blocker r007 raised at i051, against code this round added.
  //   the prior extractor matched `/\{[\s\S]*"class"[\s\S]*?\}/`, so it anchored at the
  //   FIRST `{` anywhere in the stream.
  //
  //   dogfooded by a revert of the implementation: [t0]–[t3] go RED on that form and
  //   green on the line-shape anchor. ⚠️ [t4] passes under BOTH, and that is recorded
  //   rather than glossed — it clamps \r tolerance, which neither form breaks, so it is
  //   coverage of a different property and NOT evidence for this repair
  given('[case4] noise that holds braces AHEAD of the real payload', () => {
    const payload = asEmittedPayload({
      class: 'MalfunctionError',
      message: 'the addon could not be loaded',
      hint: 'reinstall rhachet',
    });

    when('[t0] a brain-boot json object precedes the payload', () => {
      // the exact hazard: a well-formed foreign object earlier in the same stream
      const output = [
        '{"session":"boot","ok":true}',
        'more chatter',
        payload,
      ].join('\n');

      then('the RHACHET payload is recovered, never the boot object', () => {
        const parsed = asCliErrorJsonFromOutput({ output });
        expect(parsed.class).toEqual('MalfunctionError');
        expect(parsed.hint).toEqual('reinstall rhachet');
      });
    });

    when('[t1] the noise itself mentions the word class', () => {
      // both tokens sit in the noise, but never ADJACENT — which is the discriminator
      const output = [
        '{ some log line that says "class" in prose }',
        payload,
      ].join('\n');

      then('the decoy is not mistaken for the payload', () => {
        expect(asCliErrorJsonFromOutput({ output }).class).toEqual(
          'MalfunctionError',
        );
      });
    });

    when('[t2] the SAME payload arrives behind two different noises', () => {
      then(
        'the read is identical — the property the prior form could not hold',
        () => {
          const readA = asCliErrorJsonFromOutput({
            output: ['{"a":1}', payload].join('\n'),
          });
          const readB = asCliErrorJsonFromOutput({
            output: ['no braces here', payload].join('\n'),
          });
          expect(readA).toEqual(readB);
        },
      );
    });

    when('[t3] a hint holds a close brace mid-line', () => {
      then('the payload still terminates on its OWN-LINE brace', () => {
        const output = [
          'noise',
          asEmittedPayload({
            class: 'ConstraintError',
            message: 'bad glob',
            hint: 'try `src/**/*.{ts,js}` instead',
          }),
        ].join('\n');
        expect(asCliErrorJsonFromOutput({ output }).hint).toEqual(
          'try `src/**/*.{ts,js}` instead',
        );
      });
    });

    when('[t4] the stream carries \\r line endings, as a pty does', () => {
      then('the payload is still located', () => {
        const output = ['noise\r', payload.split('\n').join('\r\n')].join(
          '\r\n',
        );
        expect(asCliErrorJsonFromOutput({ output }).class).toEqual(
          'MalfunctionError',
        );
      });
    });
  });
});
