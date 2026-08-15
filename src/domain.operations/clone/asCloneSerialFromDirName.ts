/**
 * .what = parse the clone SERIAL back out of an on-disk dir-name token —
 *   `serial=<serial>` → `<serial>`, or null when the name is not that token
 * .why =
 *   - asCloneDirName owns the CONSTRUCT direction (serial → token); this is its
 *     paired INVERSE (token → serial), so the `serial=` format is single-owned in
 *     BOTH directions. before this, two readers hand-rolled the parse (a
 *     `startsWith`, a regex) — a format change would have had to hunt every one;
 *     now it touches this one owner and its construct twin
 *   - returns null (not a throw) when the name does not fit the token, so a clones
 *     enumerate can use it as the filter predicate (=== null → skip) in one pass —
 *     no separate `serial=` literal
 *
 * .note = segment-anchored (`^` or `/`), so it reads a BARE dir-name token AND a
 *   token embedded as a path segment (a `.slugs/` symlink target), never a name
 *   that merely holds the token mid-word
 */
const CLONE_DIR_NAME_RE = /(?:^|\/)serial=(?<serial>[^/]+)/;

export const asCloneSerialFromDirName = (input: {
  dirName: string;
}): string | null =>
  input.dirName.match(CLONE_DIR_NAME_RE)?.groups?.serial ?? null;
