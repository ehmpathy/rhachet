import { UnexpectedCodePathError } from 'helpful-errors';

import type {
  KeyrackGrantMechanism,
  KeyrackGrantMechanismAdapter,
} from '@src/domain.objects/keyrack';

import { mechAdapterAwsSso } from './aws.sso/mechAdapterAwsSso';
import { mechAdapterGithubApp } from './mechAdapterGithubApp';
import { mechAdapterReplica } from './mechAdapterReplica';

/**
 * .what = the one canonical mechanism → adapter map, plus its lookup
 * .why = the mech→adapter lookup was hand-copied per vault; a full (non-partial) Record
 *        gives one importable source AND compile-time exhaustiveness — a new
 *        KeyrackGrantMechanism forces a compile error here until it is wired
 *
 * .note = new names (PERMANENT_VIA_*, EPHEMERAL_VIA_*) map to the same adapters;
 *         the older aliases stay for backwards compat
 *
 * ⚠️ .adoption = NOT yet universally adopted. vaultAdapterAwsParams + genContextKeyrackGrantGet
 *    consume this today (genContextKeyrackGrantGet's full-Record duplicate was migrated onto this
 *    source). the 6 peer vaults (os.secure / os.envvar / os.direct / os.daemon / github.secrets /
 *    1password) STILL hand-roll their own PARTIAL mech→adapter maps and were NOT migrated. so in
 *    this mid-migration state there are still multiple sources of truth: this canonical one, plus
 *    the 6 ad-hoc partial copies. do NOT assume the peer vaults route through here. the full
 *    migration (repoint the 6 peer-vault sites onto this map, then delete the ad-hoc copies) is a
 *    deliberate cross-vault follow-up, scoped OUT of the aws.params route that introduced this
 *    module. until that lands, treat this as authoritative for aws.params + the get-context ONLY.
 */
export const KEYRACK_MECH_ADAPTERS: Record<
  KeyrackGrantMechanism,
  KeyrackGrantMechanismAdapter
> = {
  PERMANENT_VIA_REPLICA: mechAdapterReplica,
  PERMANENT_VIA_REFERENCE: mechAdapterReplica, // passthrough, exid fetched on unlock
  EPHEMERAL_VIA_SESSION: mechAdapterReplica, // os.daemon: passthrough, already in daemon
  EPHEMERAL_VIA_GITHUB_APP: mechAdapterGithubApp,
  EPHEMERAL_VIA_AWS_SSO: mechAdapterAwsSso,
  EPHEMERAL_VIA_GITHUB_OIDC: mechAdapterAwsSso, // todo: dedicated oidc adapter
};

/**
 * .what = look up the adapter that transforms a source into a usable secret for a mechanism
 * .why = one shared getter so a vault does not hand-roll its own partial copy of the map
 */
export const getOneKeyrackMechAdapter = (
  mech: KeyrackGrantMechanism,
): KeyrackGrantMechanismAdapter =>
  KEYRACK_MECH_ADAPTERS[mech] ??
  UnexpectedCodePathError.throw(`no adapter for mech: ${mech}`, { mech });
