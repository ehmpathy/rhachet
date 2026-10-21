import { ConstraintError } from 'helpful-errors';

/**
 * .what = cast a `--brain <ref>` flag value to the `{ repo, slug }` ref of an available brain
 * .why = a brain's slug may or may not open with its repo: `openai/codex` (repo `openai`) does,
 *   `claude/code/haiku` (repo `anthropic`) does not. so one parse cannot serve both
 *
 * .note = two forms, tried in order, the first that names an available brain wins:
 *   1. repo = the text before the first slash, slug = the whole value (`openai/codex`) —
 *      the extant grammar, so every caller that types it today keeps its path
 *   2. repo = the text before the first slash, slug = the rest (`anthropic/claude/code/haiku`)
 *   where neither names an available brain, form 1 is returned, so the lookup downstream
 *   fails as it always did
 */
export const asBrainRefFromFlag = (input: {
  flag: string;
  brains: { repo: string; slug: string }[];
}): { repo: string; slug: string } => {
  // reject a value with no repo segment
  const firstSlashIndex = input.flag.indexOf('/');
  if (firstSlashIndex === -1)
    throw new ConstraintError(
      `invalid brain format "${input.flag}". expected: repo/slug`,
    );

  // the two forms of the flag
  const repo = input.flag.slice(0, firstSlashIndex);
  const refWhole = { repo, slug: input.flag };
  const refRest = { repo, slug: input.flag.slice(firstSlashIndex + 1) };

  // the first form that names an available brain wins
  const isAvailable = (ref: { repo: string; slug: string }) =>
    input.brains.some((b) => b.repo === ref.repo && b.slug === ref.slug);
  if (isAvailable(refWhole)) return refWhole;
  if (isAvailable(refRest)) return refRest;
  return refWhole;
};
