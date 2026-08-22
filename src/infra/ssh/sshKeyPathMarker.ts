/**
 * .what = marker prefix that tags an identity as an ssh key path rather than an age identity
 * .why = a consumer that needs ONLY this bare string (e.g. ageRecipientCrypto's decrypt dispatch)
 *        must not be forced through sshPrikeyToAgeIdentity.ts, whose @noble/@scure crypto deps are
 *        pure-esm (`type: module`). sshPrikeyToAgeIdentity.ts now loads those deps lazily (via
 *        getOneLazyEsmModuleLoader), so they no longer sit in its eval graph — but keep the marker
 *        in its own zero-dependency file regardless, so a marker import pulls in neither the crypto
 *        loaders nor the ssh-parse code, and reads cleanly as the bare constant it is.
 *        see rule.forbid.eager-esm-imports-in-prod + ehmpathy/rhachet#468.
 * .note = when an identity string starts with this prefix, decryptWithIdentity shells out to the
 *         age cli (via ssh-agent) rather than the age-encryption npm library.
 */
export const SSH_KEY_PATH_MARKER = 'SSH_KEY_PATH:';
