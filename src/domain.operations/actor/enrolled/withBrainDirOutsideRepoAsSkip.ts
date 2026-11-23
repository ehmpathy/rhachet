import { BrainDirOutsideRepoError } from './BrainDirOutsideRepoError';

/**
 * .what = run a brain dir write; a refusal because the dir lands outside the repo settles as a
 *   skip, carried beside the stand-in result the caller names
 * .why = a skip is no error (the wish: exit 0, a visible warn), yet it must never look like
 *   "the write ran and changed naught" — so the skip rides out next to the result, never
 *   folded into it
 * .note = `skips` is a list (empty or one), so a caller joins it with other phases' skips by a
 *   plain spread
 * .note = only `BrainDirOutsideRepoError` is a skip; every other fault propagates
 */
export const withBrainDirOutsideRepoAsSkip = async <T>(input: {
  logic: () => Promise<T>;
  skipped: T;
}): Promise<{ result: T; skips: BrainDirOutsideRepoError[] }> => {
  try {
    return { result: await input.logic(), skips: [] };
  } catch (error) {
    if (!(error instanceof BrainDirOutsideRepoError)) throw error;
    return { result: input.skipped, skips: [error] };
  }
};
