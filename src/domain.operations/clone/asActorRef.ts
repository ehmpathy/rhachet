import { ConstraintError } from 'helpful-errors';

/**
 * .what = a parsed reference to an enrolled actor — by its exid, or a prefix of the exid
 *   or of its value (`@hash=9c1e`, `@9c1e`, `@repo=ambient`)
 * .why = an actor's address body IS its exid; a full exid is a mouthful, so a git-style
 *   unique PREFIX is the natural reach. this ref carries the literal to match against
 *   the on-disk actors
 * .note = `hashPrefix` is a legacy-compat name for an EXID prefix (`repo=ambient`, `hash=9c1e`,
 *   `9c1e`): it rides the json error metadata a machine already reads
 */
export type ActorRef = {
  /** an exid prefix; the name predates the exid and is kept for the json error contract */
  hashPrefix: string;
};

/**
 * .what = parse an actor address (`@<hash>` or `actor://<hash>`) into an ActorRef
 * .why =
 *   - `rhx clone list @<actor>` scopes to one actor; this is the ONE parse that
 *     turns the surface glyph into a hash-or-prefix literal
 *   - the body is a hash prefix, resolved git-style against the enrolled actors
 *     (a unique prefix wins; an ambiguous prefix fails loud elsewhere)
 *
 * .note = fails loud with a did-you-mean fix, never a silent misparse:
 *   - a `@:<clone>` (or `clone://`) is the WRONG grain → name the `@` actor form
 *   - a dropped sigil (`9c1e`) → name the `@` form
 *   - an empty body (`@`) is malformed → say so
 */
export const asActorRef = (input: { raw: string }): ActorRef => {
  const { raw } = input;

  // a clone address is the wrong grain — point at the actor form
  if (raw.startsWith('clone://') || raw.startsWith('@:')) {
    const suggestion = `@${raw.replace(/^(clone:\/\/|@:)/, '')}`;
    return ConstraintError.throw(
      `'${raw}' is a CLONE address; an actor is addressed with a bare '@'. did you mean '${suggestion}'?`,
      // .note = `hint` names the fix as a machine-readable field, so a `--output
      //   json` consumer reads the same "did you mean" cue a human sees in the
      //   message (asCliErrorJson projects metadata.hint) — never a null hint
      { raw, hint: `use '${suggestion}'` },
    );
  }

  // extract the body from either the `@` sigil or the `actor://` uri
  const body = raw.startsWith('@')
    ? raw.slice(1)
    : raw.startsWith('actor://')
      ? raw.slice('actor://'.length)
      : null;

  // no recognized actor sigil at all — a dropped `@`
  if (body === null)
    return ConstraintError.throw(
      `'${raw}' is not an actor address; actor addresses start with '@'. did you mean '@${raw}'?`,
      { raw, hint: `use '@${raw}'` },
    );

  // an empty body is malformed
  if (body.length === 0)
    return ConstraintError.throw(
      `'${raw}' names no actor — the address body after '@' is empty.`,
      {
        raw,
        hint: `name an actor after '@' by its exid or a prefix of it, e.g. '@repo=ambient' or '@hash=9c1e'`,
      },
    );

  return { hashPrefix: body };
};
