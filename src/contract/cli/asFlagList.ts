/**
 * .what = a roster of cli flags, joined with `/` for one error line
 * .why = names the join so a refusal reads `--role/--repo/…` without a reader decode of it
 */
export const asFlagList = (input: {
  flags: readonly { flag: string }[];
}): string => input.flags.map(({ flag }) => flag).join('/');
