/**
 * .what = the one line enroll prints when the shared claude login is absent
 * .why = an absent login is no failure — the clone can log in on its own, and its
 *        `/login` lands in the shared store every clone reads — but it is never
 *        silent: the line names the login path and both fixes (D13)
 * .note = both fixes run on the subscription. the api key is never the suggested fix:
 *         claude code ranks it above the oauth token, so it would bill the api
 */
export const asBrainAuthAbsentLine = (input: {
  brainAuthPath: string;
}): string =>
  `ℹ no claude login at ${input.brainAuthPath} — run /login inside the clone, or set CLAUDE_CODE_OAUTH_TOKEN (from \`claude setup-token\`)`;
