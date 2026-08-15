import { ConstraintError } from 'helpful-errors';

/**
 * .what = the two render modes every talk verb (and enroll) honors
 * .why = one shared union so `tree` (human) and `json` (machine) never drift
 *   apart across the six invokers that carry `--output`
 */
export type CliOutputMode = 'tree' | 'json';

/**
 * .what = parse the raw `--output` flag into a validated CliOutputMode
 * .why =
 *   - `tree` is the default (bare invocation → the human view), so an absent
 *     flag resolves to `tree`
 *   - an unrecognized value fails loud and names the fix (a silent fallback to
 *     `tree` would hide a typo like `--output josn`), per rule.require.errors-
 *     name-the-fix
 */
export const asCliOutputMode = (input: {
  raw: string | undefined;
}): CliOutputMode => {
  const raw = input.raw ?? 'tree';
  if (raw === 'tree' || raw === 'json') return raw;
  throw new ConstraintError(`unknown --output mode "${raw}"`, {
    hint: 'use --output tree (default) or --output json',
  });
};
