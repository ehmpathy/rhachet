/**
 * .what = parse the actor HASH back out of an on-disk dir-name token —
 *   `actor.via.hash=<hash>` → `<hash>`, or null when the name is not that token
 * .why =
 *   - asActorOndiskDirName owns the CONSTRUCT direction (hash → token); this is
 *     its paired INVERSE (token → hash), so the `actor.via.hash=` format is
 *     single-owned in BOTH directions. before this, three readers hand-rolled the
 *     parse (a `startsWith` + `slice`, a regex) — a format change would have had to
 *     hunt every one; now it touches this one owner and its construct twin
 *   - returns null (not a throw) when the name does not fit the token, so an
 *     enumerate can use it as BOTH the filter predicate (=== null → skip) and the
 *     extractor (the parsed hash) in one pass — no separate prefix literal
 *
 * .note = segment-anchored (`^` or `/`), so it reads a BARE dir-name token AND a
 *   token embedded as a path segment (a `.slugs/` symlink target), never a name
 *   that merely holds the token mid-word
 */
const ACTOR_DIR_NAME_RE = /(?:^|\/)actor\.via\.hash=(?<hash>[^/]+)/;

export const asActorOndiskHashFromDirName = (input: {
  dirName: string;
}): string | null =>
  input.dirName.match(ACTOR_DIR_NAME_RE)?.groups?.hash ?? null;
