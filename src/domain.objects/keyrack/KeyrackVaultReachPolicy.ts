import type { KeyrackHostVault } from './KeyrackHostVault';

/**
 * .what = how a vault treats a reach — the three-way split on the STORAGE axis
 * .why = a reach is a reach a credential opens, and a vault relates to that question
 *        differently than a mech does. a mech decides what a credential OPENS; a vault
 *        decides whether two reaches can be told apart once FILED. before this type the
 *        split lived only in each adapter's own comments, which is how `aws.config` shipped
 *        with no reach guard on its read side at all (r011 @ i053)
 *
 * .note = the three kinds, and why three is the whole set:
 *
 *         ADDRESSED     — the reach is part of the storage ADDRESS, so two reaches of one
 *                         slug cannot collide by construction. this is the strongest posture:
 *                         it needs no guard, because the wrong entry is unreachable rather
 *                         than merely refused
 *         UNADDRESSABLE — the vault's address carries NO reach axis (a flat namespace: an
 *                         env var name, a github secret name). it cannot tell one reach
 *                         from another, so it MUST throw on a reach-ask rather than answer
 *                         with the reachless value. guarded by `assertKeyrackReachAddressable`
 *         VIA_MECH      — the vault holds no reach posture of its OWN. its address could carry
 *                         a reach, but its mech mints against a different axis entirely,
 *                         so the refusal belongs to the mech. guarded by
 *                         `assertKeyrackReachAbsent`, which reads `KEYRACK_MECH_REACH_POLICY`
 *
 * .note = ⚠️ `UNADDRESSABLE` and `VIA_MECH` both REFUSE, and the distinction is not academic —
 *         it decides what the human is told. an `UNADDRESSABLE` refusal says "this vault's
 *         address has no reach"; a `VIA_MECH` refusal says "this mech mints against its
 *         own reach". to hand a human the first sentence about `aws.config` would be a
 *         correct refusal with a FALSE explanation, since its host entry IS addressed by
 *         composite address like any other (`rule.require.errors-name-the-fix`)
 */
export type KeyrackVaultReachPolicy =
  | 'ADDRESSED'
  | 'UNADDRESSABLE'
  | 'VIA_MECH';

/**
 * .what = the reach policy each host vault honors
 * .why = the STRUCTURAL backstop for the reach contract on the storage axis, and the twin of
 *        `KEYRACK_MECH_REACH_POLICY`. typed as a `Record<KeyrackHostVault, …>`, a new member
 *        of the vault union fails to compile until it declares its posture here — so the
 *        question "can this vault tell one reach from another?" cannot be skipped
 *
 * .note = this table exists because its absence had a cost. `KeyrackHostVaultAdapter.get`'s
 *         doc comment already stated the invariant — *"a vault that cannot tell one reach
 *         from another MUST throw on a reach-ask rather than answer with the reachless
 *         value"* — and `aws.config` was exempt from it on both read paths for the whole
 *         feature. a rule stated in a doc comment is not a guard; only a table a test walks is
 * .note = this states what each vault DOES, not what it should do. the conformance test beside
 *         it asserts the two agree, so a drift between the table and an adapter is caught
 *         rather than believed
 */
export const KEYRACK_VAULT_REACH_POLICY: Record<
  KeyrackHostVault,
  KeyrackVaultReachPolicy
> = {
  // an env var name drops org, env, AND reach — the flattest namespace keyrack reads (q9)
  'os.envvar': 'UNADDRESSABLE',

  // a github actions secret name is likewise flat, on both the write and the del side
  'github.secrets': 'UNADDRESSABLE',

  // the sso profile is its own reach concept, so the refusal belongs to the mech (e13)
  'aws.config': 'VIA_MECH',

  // the v1 SSM path template — /keyrack/infra/vault/aws.params/v1/{owner}/{org}/{env}/{key} —
  // carries no reach segment, so two reaches of one slug would land on ONE param: a read would
  // answer a reach-ask with the reachless value (e18), a write would overwrite it with no signal
  //
  // ⚠️ NOT `VIA_MECH`, and the distinction carries real weight. `VIA_MECH` defers to
  //    `assertKeyrackReachAbsent`, which reads `KEYRACK_MECH_REACH_POLICY` — and BOTH mechs
  //    aws.params supports (`PERMANENT_VIA_REPLICA` declared, `EPHEMERAL_VIA_GITHUB_APP`
  //    derived) HONOR a reach. so the mech guard would wave the reach through and the collision
  //    above would land. the refusal has to be the vault's own
  //
  // .note = this states what the vault DOES today, not a permanent verdict. the `/v1/` marker in
  //         the path is a version segment `asKeyrackAwsParamName` keeps precisely so a template
  //         change is additive — a `/v2/` template with a reach segment would make this
  //         `ADDRESSED`, and v1 params stay readable meanwhile
  'aws.params': 'UNADDRESSABLE',

  // bakes the reach into the storage address via `asKeyrackKeySlugAtReach`
  'os.direct': 'ADDRESSED',
  'os.secure': 'ADDRESSED',

  // the daemon store is keyed by (slug, reach) — the partition the whole feature rests on
  'os.daemon': 'ADDRESSED',

  // a second reach lands at its own exid, held under its own address in the host manifest
  '1password': 'ADDRESSED',
};
