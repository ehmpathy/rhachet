import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';

import { asKeyrackKeyReach } from './asKeyrackKeyReach';

/**
 * .what = casts the raw `--reach` flag a cli command received into a parsed reach — or into
 *         `undefined` when the flag was not given at all
 * .why = five cli commands take `--reach` (`get`, `source`, `set`, `del`, `unlock`) and each
 *        hand-wrote the same three-line ternary. the EXPRESSION was identical at all five, so
 *        a change to the parse, its error, or its validation had five sites to keep in step
 *
 * .note = this is the flag-side twin of `asKeyrackKeyReachField`, and the pair covers the two
 *         ends of one rule: a reach is ABSENT rather than null. this one produces the absence
 *         from a flag that was not passed; that one carries the absence into an object shape
 *         by omission of the key (e16)
 *
 * .note = ⚠️ the five call sites keep their OWN doc-comments, and that is deliberate rather
 *         than an oversight. what each command MEANS by a reach genuinely differs — `set`
 *         DECLARES a reach, `unlock` SELECTS one, `del` addresses exactly one, `get`
 *         sits inches from `--org` (provenance) and must not be read as it, and `source`
 *         parses before its key check so a malformed exid reports as malformed. only the
 *         parse is shared; the five meanings are not, and to collapse them here would lose
 *         five facts to save one line
 *
 * .note = the parse happens at the CLI BOUNDARY, before any lookup, prompt, or socket — so a
 *         malformed exid fails against the flag a human just typed rather than deep in a
 *         vault call whose error names a different cause (rule.require.errors-name-the-fix)
 * .note = an exid is PLAINTEXT. keyrack parses no scheme and reads no sense into it; the one
 *         mech that must read an org out of an exid does so in its own `asGithubOrgFromReach`
 */
export const asKeyrackKeyReachFromFlag = (input: {
  flag?: string;
}): KeyrackKeyReach | undefined =>
  input.flag ? asKeyrackKeyReach({ exid: input.flag }) : undefined;
