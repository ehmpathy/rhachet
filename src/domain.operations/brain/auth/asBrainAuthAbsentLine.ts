/**
 * .what = the one line enroll prints when the shared claude login is absent
 * .why = an absent login is no failure — the clone can log in on its own, and its
 *        `/login` lands in the shared store every clone reads — but it is never
 *        silent: the line names the login path and both fixes (D13)
 */
export const asBrainAuthAbsentLine = (input: {
  brainAuthPath: string;
}): string =>
  `ℹ no claude login at ${input.brainAuthPath} — run /login inside the clone, or set ANTHROPIC_API_KEY`;
