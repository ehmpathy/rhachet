/**
 * .what = a brain cli version triple, part by part
 */
export type BrainCliVersion = { major: number; minor: number; patch: number };

/**
 * .what = the first `x.y.z` in a brain cli's `--version` output, or null
 * .why = the version floor needs a triple; a pre-release (`-beta`) or build (`+abc`)
 *        suffix is null, since a pre-release sorts below its bare triple and would
 *        slip past a floor it does not meet
 */
export const asBrainCliVersion = (input: {
  output: string;
}): BrainCliVersion | null => {
  const match = /(\d+)\.(\d+)\.(\d+)([-+])?/.exec(input.output);
  if (!match || match[4]) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
};
