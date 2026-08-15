/**
 * .what = is this `--as` slug safe to use as an on-disk name?
 * .why =
 *   - a clone's slug becomes a filesystem index entry (`.slugs/<slug>`), so a
 *     slug with a path separator or a `..` hop could escape the actor dir and
 *     write anywhere — a path-traversal hole. this is the guard that closes it
 *   - a slug is a HUMAN handle (`@:driver`), so we keep it to a small, legible
 *     charset: lowercase letters, digits, and a few separators
 *
 * .note = the empty string is NOT safe — a nameless clone passes `null`, never `''`
 */
export const isSafeCloneSlug = (input: { slug: string }): boolean => {
  const { slug } = input;

  // must be a non-empty, bounded, legible handle
  if (slug.length === 0 || slug.length > 64) return false;

  // no path separators or parent hops — the traversal guard
  if (slug.includes('/') || slug.includes('\\') || slug.includes('..'))
    return false;

  // a small, legible charset: lowercase alphanum plus - . _
  return /^[a-z0-9][a-z0-9._-]*$/.test(slug);
};
