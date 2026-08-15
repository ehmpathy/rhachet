import type { CliOutputMode } from './asCliOutputMode';

/**
 * .what = render a domain result as either the human tree or machine json
 * .why =
 *   - the ONE seam every talk verb composes so `--output tree` and
 *     `--output json` present the SAME domain data two ways — the two views
 *     can never disagree about what exists (usecase.11)
 *   - json is a plain `JSON.stringify` of the same `data` the tree renders,
 *     so a machine reads fields, never box-glyph characters
 *
 * .note = pure: takes the pre-built human `tree` string + the `data` object,
 *   picks one by mode, returns the string. the caller owns the channel
 *   (console.log to stdout). the mode is already validated by asCliOutputMode,
 *   so no unknown-mode branch is reachable here.
 */
export const renderCliOutput = (input: {
  mode: CliOutputMode;
  tree: string;
  data: unknown;
}): string =>
  input.mode === 'json' ? JSON.stringify(input.data, null, 2) : input.tree;
