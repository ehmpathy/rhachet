/**
 * .what = the notice enroll prints when ANTHROPIC_API_KEY sits in the env a clone spawns with
 * .why = claude code ranks the api key above `/login` and CLAUDE_CODE_OAUTH_TOKEN, so the
 *        clone bills the anthropic api per call. the clone still starts — a human may mean to
 *        pay per call — but the choice is seen at the moment it is made, with the fix named
 * .note = null when the key is absent or empty; claude code ignores an empty key
 */
export const asBrainAuthApiBilledLine = (input: {
  env: NodeJS.ProcessEnv;
}): string | null => {
  // say naught when the key is absent or empty
  if (!input.env.ANTHROPIC_API_KEY) return null;

  // name the cause and the fix
  return [
    '⚠️ this clone bills the anthropic api, since ANTHROPIC_API_KEY is set',
    '   ├─ claude code ranks the api key above your /login and CLAUDE_CODE_OAUTH_TOKEN',
    '   └─ to use your subscription, unset ANTHROPIC_API_KEY, then enroll again',
  ].join('\n');
};
