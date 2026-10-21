/**
 * .what = whether the clone or repl brain THIS spawn is about to mint is a LEAF
 * .why = the spawn that mints a leaf marks it, so a leaf never spawns its own clones
 *   (ehmpathy/rhachet#577). two doors mint a leaf:
 *   - a print-mode enroll (`rhx enroll claude -p '<prompt>'`) — one prompt in, one
 *     answer out, then exit
 *   - a repl brain (`rhachet ask`, `rhachet act`, or any skill built on the sdk) — a
 *     brain called to answer, never a clone that drives work
 *
 * .note = the mark is the door's shape, never a purpose. rhachet cannot see why a clone
 *   was spawned, nor which supplier skill spawned it
 * .note = a session enroll (`--watch`, `--async`, no `-p`) is a WORK clone. it may
 *   enroll one more clone, at any depth
 * .note = the roleset is never the mark: an everyday `claude` carries the ambient roles,
 *   `reviewer` among them, and must stay a work clone
 */
export const isCloneSpawnChildLeaf = (
  input: { door: 'repl' } | { door: 'enroll'; isPrintMode: boolean },
): boolean => {
  if (input.door === 'repl') return true;
  return input.isPrintMode;
};
