/**
 * .what = the `set` command that logs one account in again, as a hint
 * .why = every refusal whose cure is a fresh login names the same command, so the copies never
 *   drift; `--account` makes the set refuse a login of the wrong account
 */
export const asBrainAuthSetHint = (input: { email: string }): string =>
  `rhx brains auth set --brain claude --account ${input.email}`;
