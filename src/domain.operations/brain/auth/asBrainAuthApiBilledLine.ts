import { BRAIN_AUTH_ENV_KEYS } from '@src/domain.operations/brain/auth/BRAIN_AUTH_ENV_KEYS';

/**
 * .what = the env keys through which claude code bills the api per call
 * .why = each one outranks `/login` and CLAUDE_CODE_OAUTH_TOKEN, so a clone spawned with any
 *        of them bills the api, not the subscription; derived from the one credential table
 */
const BRAIN_AUTH_API_BILLED_ENV_KEYS = BRAIN_AUTH_ENV_KEYS.filter(
  (one) => one.bills === 'api',
).map((one) => one.key);

/**
 * .what = the head of the api-billed notice, up to the key names
 * .why = a snapshot mask finds the notice by it, so a reword of the head moves the mask too
 */
export const BRAIN_AUTH_API_BILLED_NOTICE_HEAD =
  '🟡 this clone bills the anthropic api';

/**
 * .what = the notice enroll prints when an api-billed credential sits in the env a clone spawns with
 * .why = claude code ranks it above `/login` and CLAUDE_CODE_OAUTH_TOKEN, so the clone bills the
 *        anthropic api per call. the clone still starts — a human may mean to pay per call — but
 *        the choice is seen at the moment it is made, with the fix named
 * .note = it names every api-billed key that is set, so an unset of the named keys leaves the
 *        clone on the subscription, with no claim about which key claude code reads first
 * .note = null when each key is absent or empty; claude code ignores an empty value
 * .note = a seat with no login gets a fix that names a subscription credential too, since an
 *        unset alone would leave its clone with none
 */
export const asBrainAuthApiBilledLine = (input: {
  env: NodeJS.ProcessEnv;
  isBrainAuthAbsent: boolean;
}): string | null => {
  // say naught when no api-billed key is set
  const keys = BRAIN_AUTH_API_BILLED_ENV_KEYS.filter((one) => !!input.env[one]);
  if (keys.length === 0) return null;

  // name every key set, the cause, and the fix
  const keysWords = keys.join(' and ');
  const isWord = keys.length === 1 ? 'is' : 'are';

  // a seat with no login: the unset must come with a subscription credential
  if (input.isBrainAuthAbsent)
    return [
      `${BRAIN_AUTH_API_BILLED_NOTICE_HEAD}, since ${keysWords} ${isWord} set`,
      `   ├─ claude code ranks ${keysWords} above a /login and CLAUDE_CODE_OAUTH_TOKEN, and this seat has no /login`,
      `   └─ to use a subscription, unset ${keysWords}, then /login or set CLAUDE_CODE_OAUTH_TOKEN (from \`claude setup-token\`), then enroll again`,
    ].join('\n');

  // a seat with a login: an unset alone moves the clone onto it
  return [
    `${BRAIN_AUTH_API_BILLED_NOTICE_HEAD}, since ${keysWords} ${isWord} set`,
    `   ├─ claude code ranks ${keysWords} above your /login and CLAUDE_CODE_OAUTH_TOKEN`,
    `   └─ to use your subscription, unset ${keysWords}, then enroll again`,
  ].join('\n');
};
