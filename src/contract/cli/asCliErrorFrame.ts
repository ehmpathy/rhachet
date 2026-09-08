import { asCliErrorGlyph } from './asCliErrorGlyph';
import { asCliErrorJson } from './asCliErrorJson';

/**
 * .what = the LINES a human reads off a caught cli error — whose it is, what broke,
 *   and what to do next
 *
 * 🔴 .note = the prefix is UNABRIDGED and the metadata is UNREDACTED — always.
 *   the class name is the greppable caller-vs-server signal (a `✋` is not greppable), and
 *   metadata is where the fix lives (`path`, `from`, `envVar`), so a redact here would
 *   invert `rule.require.errors-name-the-fix`.
 *
 * .note = a metadata field that carries bulk is bounded AT ITS SOURCE, where the field is
 *   written. the render cannot tell a 20-line log from a 20-line trace that IS the fix.
 */

/**
 * .what = the metadata, with `hint` moved to the FRONT — every field kept, none dropped
 *
 * .why = `JSON.stringify` walks insertion order, so an error that writes `output` before
 *   `hint` renders the fix sentence underneath the bulk.
 */
const asMetadataHintFirst = (
  metadata: Record<string, unknown>,
): Record<string, unknown> =>
  // .note = the spread re-assigns `hint` to its own value and does NOT move it — a key
  //   keeps the position of its FIRST insertion. so this reorders without a filter, and
  //   every other key holds its original relative order
  'hint' in metadata ? { hint: metadata.hint, ...metadata } : metadata;

export const asCliErrorFrame = (input: { error: Error }): string[] => {
  const shape = asCliErrorJson({ error: input.error });
  const glyph = asCliErrorGlyph({ error: input.error });
  return [
    '',
    `${glyph} ${shape.class}: ${shape.message}`,
    ...(Object.keys(shape.metadata).length
      ? ['', JSON.stringify(asMetadataHintFirst(shape.metadata), null, 2)]
      : []),
    '',
  ];
};
