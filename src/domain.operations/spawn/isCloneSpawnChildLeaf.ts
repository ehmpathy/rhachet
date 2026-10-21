/**
 * .what = whether the clone or repl brain THIS spawn is about to mint is a LEAF
 * .why = the spawn that mints a reviewer marks it, so a reviewer never spawns its own
 *   clones (ehmpathy/rhachet#577). two spawns mint a reviewer:
 *   - a print-mode enroll (`rhx enroll claude -p '<prompt>'`) — one prompt in, one
 *     answer out, then exit. this is the shape a route guard's level-3 peer takes
 *   - a repl brain (`rhx review`, `rhachet ask`, `rhachet act`) — a brain called to
 *     answer, never a clone that drives work
 *
 * .note = a session enroll (`--watch`, `--async`, no `-p`) is a WORK clone. it may
 *   enroll one more clone, at any depth — that is how a driver stands up its reviewers
 * .note = the roleset is never the mark: an everyday `claude` carries the ambient roles,
 *   `reviewer` among them, and must stay a work clone
 */
export const isCloneSpawnChildLeaf = (
  input: { door: 'repl' } | { door: 'enroll'; isPrintMode: boolean },
): boolean => {
  if (input.door === 'repl') return true;
  return input.isPrintMode;
};
