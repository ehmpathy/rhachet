import type { KeyrackGrantMechanism } from './KeyrackGrantMechanism';

/**
 * .what = how a grant mechanism treats a reach — the three-way split the reach axis rests on
 * .why = a reach is a reach a credential opens, and a mech relates to that in exactly one
 *        of three ways. before this type the split lived only in a doc comment, so a new mech
 *        could be added and silently mishandle a reach with no compiler complaint
 *
 * .note = the three kinds, and why three is the whole set:
 *
 *         DERIVED  — the mech MINTS for the reach, so it must read the exid and needs a
 *                    convention it can parse. it is the reach that decides what the credential
 *                    opens
 *         DECLARED — a human supplies a secret and ASSERTS which reach it opens. the mech
 *                    carries the exid through untouched; the vault files the value under it.
 *                    the reach decides where the value is FILED, never what it opens
 *         REFUSED  — the mech mints against a DIFFERENT axis entirely, so a reach would move
 *                    where the value is filed yet leave what it opens untouched. that is a
 *                    name that lies, so it is rejected rather than honored
 *
 *         the set is closed because those are the only three relations possible: the reach
 *         decides what a credential opens, decides only where it is filed, or decides neither
 */
export type KeyrackMechReachPolicy = 'DERIVED' | 'DECLARED' | 'REFUSED';

/**
 * .what = the reach policy each grant mechanism honors
 * .why = this is the STRUCTURAL backstop for the reach contract. typed as a
 *        `Record<KeyrackGrantMechanism, …>`, a new member of the mech union fails to compile
 *        until it declares its policy here — so the question "how does this mech treat a
 *        reach?" cannot be skipped, and `assertKeyrackReachAbsent`'s guarantee no longer
 *        rests on whether an author read a doc comment
 *
 * .note = ⚠️ an adapter is NOT 1:1 with a mech, and the policy follows the MECH, not the
 *         adapter. `EPHEMERAL_VIA_GITHUB_OIDC` and `EPHEMERAL_VIA_AWS_SSO` share one adapter;
 *         `PERMANENT_VIA_REFERENCE` and `EPHEMERAL_VIA_SESSION` share the replica adapter. so
 *         a policy keyed by adapter would collapse distinct mechs onto one answer
 * .note = this states what each mech DOES, not what it should do. the conformance test beside
 *         it asserts the two agree, so a drift between the table and an adapter is caught
 *         rather than believed
 */
export const KEYRACK_MECH_REACH_POLICY: Record<
  KeyrackGrantMechanism,
  KeyrackMechReachPolicy
> = {
  // a human pastes a secret and says which reach it opens — the claude-account juggle
  PERMANENT_VIA_REPLICA: 'DECLARED',

  // a pointer to an external vault; the pointer itself is filed per reach
  PERMANENT_VIA_REFERENCE: 'DECLARED',

  // already in the daemon; the exid is the address it was filed under
  EPHEMERAL_VIA_SESSION: 'DECLARED',

  // mints an installation token FOR one org — the reach decides which installation
  EPHEMERAL_VIA_GITHUB_APP: 'DERIVED',

  // mints against an sso profile, which is its own reach concept
  EPHEMERAL_VIA_AWS_SSO: 'REFUSED',

  // mints against an actions oidc identity, likewise its own axis
  EPHEMERAL_VIA_GITHUB_OIDC: 'REFUSED',
};
