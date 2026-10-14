/**
 * .what = parse the actor EXID back out of an on-disk dir-name token —
 *   `actor.via.<via>=<value>` → `<via>=<value>`, or null when the name is not that token
 * .why =
 *   - asActorOndiskDirName owns the CONSTRUCT direction (exid → token); this is its
 *     paired INVERSE (token → exid), so the `actor.via.` format is single-owned in BOTH
 *     directions
 *   - returns null (not a throw) when the name does not fit the token, so an
 *     enumerate can use it as BOTH the filter predicate (=== null → skip) and the
 *     extractor (the parsed exid) in one pass — no separate prefix literal
 *
 * .note = segment-anchored (`^` or `/`), so it reads a BARE dir-name token AND a
 *   token embedded as a path segment (a `.slugs/` symlink target), never a name
 *   that merely holds the token mid-word
 * .note = the `via` must be a namespace enroll mints (`repo`, `hash`), so a stray dir that
 *   merely starts with `actor.via.` is never read as an actor. a `slug=` dir reads as null
 *   (pinned in the test); the legacy `actor.via.slug=.default` is moved to
 *   `actor.via.repo=ambient` by `setRepoActorDirFromLegacy` before an enumeration
 */
const ACTOR_DIR_NAME_RE = /(?:^|\/)actor\.via\.(?<exid>(?:repo|hash)=[^/]+)/;

export const asActorOndiskExidFromDirName = (input: {
  dirName: string;
}): string | null =>
  input.dirName.match(ACTOR_DIR_NAME_RE)?.groups?.exid ?? null;
