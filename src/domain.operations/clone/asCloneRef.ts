import { ConstraintError } from 'helpful-errors';

/**
 * .what = a parsed reference to ONE clone — by its serial (primary) or slug (unique)
 * .why = a clone answers to two bodies under the `@:` grain-marker; a uuid-shaped
 *   body is the serial, any other is the slug, so the ref carries which it is
 */
export type CloneRef =
  | { by: 'serial'; serial: string }
  | { by: 'slug'; slug: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * .what = parse a clone address (`@:<slug|serial>` or `clone://<slug|serial>`)
 *   into a typed CloneRef
 * .why =
 *   - the talk verbs (`say`/`get`) take a clone address; this is the ONE parse
 *     that turns the surface glyph into a typed ref, so the grain rules live in
 *     one place
 *   - a uuid-shaped body is the serial (the primary ref), any other body is the
 *     slug (the `--as` unique ref) — the `@:` marker never needs a second glyph
 *     to tell the two apart (see define.address-sigils.md)
 *
 * .note = fails loud with a did-you-mean fix, never a silent misparse:
 *   - a bare `@<actor>` (or `actor://`) is the WRONG grain → name the `@:` form
 *   - a dropped sigil (`driver`) → name the `@:` form
 *   - an empty body (`@:`) is malformed → say so
 */
export const asCloneRef = (input: { raw: string }): CloneRef => {
  const { raw } = input;

  // an actor address is the wrong grain — point at the clone form
  if (
    raw.startsWith('actor://') ||
    (raw.startsWith('@') && !raw.startsWith('@:'))
  ) {
    const suggestion = `@:${raw.replace(/^(actor:\/\/|@)/, '')}`;
    return ConstraintError.throw(
      `'${raw}' is an ACTOR address; a clone is addressed with '@:'. did you mean '${suggestion}'?`,
      // .note = `hint` names the fix as a machine-readable field, so a `--output
      //   json` consumer reads the same "did you mean" cue a human sees in the
      //   message (asCliErrorJson projects metadata.hint) — never a null hint
      { raw, hint: `use '${suggestion}'` },
    );
  }

  // extract the body from either the `@:` sigil or the `clone://` uri
  const body = raw.startsWith('@:')
    ? raw.slice(2)
    : raw.startsWith('clone://')
      ? raw.slice('clone://'.length)
      : null;

  // no recognized clone sigil at all — a dropped `@:`
  if (body === null)
    return ConstraintError.throw(
      `'${raw}' is not a clone address; clone addresses start with '@:'. did you mean '@:${raw}'?`,
      { raw, hint: `use '@:${raw}'` },
    );

  // an empty body is malformed
  if (body.length === 0)
    return ConstraintError.throw(
      `'${raw}' names no clone — the address body after '@:' is empty.`,
      { raw, hint: `name a clone after '@:', e.g. '@:driver' or '@:<serial>'` },
    );

  // a uuid-shaped body is the serial (primary); any other body is the slug (unique)
  return UUID_RE.test(body)
    ? { by: 'serial', serial: body }
    : { by: 'slug', slug: body };
};
