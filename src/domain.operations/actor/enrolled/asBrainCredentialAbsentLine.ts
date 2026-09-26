/**
 * .what = the one line enroll prints when the human holds no claude credential to link
 * .why = an absent credential is no failure — the clone can log in on its own — but it is
 *        never silent: the line names the brain dir and both fixes (D13)
 */
export const asBrainCredentialAbsentLine = (input: {
  brainDir: string;
}): string =>
  `ℹ no claude credential to link into ${input.brainDir} — run /login inside the clone, or set ANTHROPIC_API_KEY`;
