/**
 * .what = the one notice row `rhx init` prints when the rhx that runs is not the one the repo pins
 * .why = a global or foreign rhx can run against a tree that pins another (vision case 7, F3); the
 *   row names both versions, so a fault that follows points at the skew rather than the symptom
 *
 * .note = a notice, never a refusal (F3): the run goes on
 * .note = null when the repo pins no rhachet, when both are one install (one realpath, e.g. the
 *   `link:.` self-link), or when the versions match
 */
export const asRhxSkewNoticeOrNull = (input: {
  active: { path: string; version: string };
  pinned: { path: string; version: string } | null;
}): string | null => {
  if (input.pinned === null) return null;
  if (input.pinned.path === input.active.path) return null;
  if (input.pinned.version === input.active.version) return null;
  return `🐚 rhx ${input.active.version} runs; this repo pins ${input.pinned.version}`;
};
