import { ConstraintError, MalfunctionError } from 'helpful-errors';

import type {
  KeyrackGrantMechanism,
  KeyrackGrantMechanismAdapter,
  KeyrackHostVaultAdapter,
} from '@src/domain.objects/keyrack';
import { KeyrackKeyGrant } from '@src/domain.objects/keyrack';
import { mechAdapterGithubApp } from '@src/domain.operations/keyrack/adapters/mechanisms/mechAdapterGithubApp';
import { mechAdapterReplica } from '@src/domain.operations/keyrack/adapters/mechanisms/mechAdapterReplica';
import { asKeyrackKeyName } from '@src/domain.operations/keyrack/asKeyrackKeyName';
import { asKeyrackSlugParts } from '@src/domain.operations/keyrack/asKeyrackSlugParts';
import { inferKeyGrade } from '@src/domain.operations/keyrack/grades/inferKeyGrade';
import { inferKeyrackMechForGet } from '@src/domain.operations/keyrack/inferKeyrackMechForGet';
import { assertKeyrackReachAddressable } from '@src/domain.operations/keyrack/reach/assertKeyrackReachAddressable';

/**
 * .what = lookup mech adapter by mechanism name
 * .why = vault needs to call mech.deliverForGet for translation
 */
const getMechAdapter = (
  mech: KeyrackGrantMechanism,
): KeyrackGrantMechanismAdapter => {
  const adapters: Partial<
    Record<KeyrackGrantMechanism, KeyrackGrantMechanismAdapter>
  > = {
    PERMANENT_VIA_REPLICA: mechAdapterReplica,
    EPHEMERAL_VIA_GITHUB_APP: mechAdapterGithubApp,
  };

  const adapter = adapters[mech];
  if (!adapter) {
    throw new MalfunctionError(`no adapter for mech: ${mech}`, { mech });
  }
  return adapter;
};

/**
 * .what = vault adapter that reads from process.env
 * .why = passthrough for env vars (ci secrets, local exports)
 *
 * .note = read-only vault — set and del throw MalfunctionError
 * .note = always unlocked — no authentication required
 * .note = always checked first in grant flow (see getKeyrackKeyGrant)
 */
export const vaultAdapterOsEnvvar: KeyrackHostVaultAdapter<'readwrite'> = {
  mechs: {
    supported: ['PERMANENT_VIA_REPLICA', 'EPHEMERAL_VIA_GITHUB_APP'],
  },

  /**
   * .what = os.envvar vault is always unlocked
   * .why = env vars are already in memory, no auth needed
   */
  isUnlocked: async () => true,

  /**
   * .what = no-op unlock for os.envvar
   * .why = vault is always unlocked, unlock is a no-op
   */
  unlock: async () => {},

  /**
   * .what = read value from process.env via raw key name
   * .why = core operation for passthrough grant flow
   *
   * .note = exid is ignored for os.envvar
   * .note = extracts raw key name from slug (e.g., testorg.test.AWS_PROFILE -> AWS_PROFILE)
   * .note = infers mech from JSON blob if not supplied
   * .note = returns full KeyrackKeyGrant with grade, env, org
   * .note = a reach-ask THROWS here — see the guard below
   */
  get: async (input) => {
    // an env var namespace is flat by nature: the name drops the org, the env, and the
    // reach alike. one refusal serves every vault whose address has no reach axis
    assertKeyrackReachAddressable({
      reach: input.reach,
      vault: 'os.envvar',
      direction: 'read',
    });

    const keyName = asKeyrackKeyName({ slug: input.slug });
    const source = process.env[keyName] ?? null;
    if (source === null) return null;

    // detect mech from value (JSON blob or plain string)
    const inferredMech = inferKeyrackMechForGet({ value: source });

    // validate mech consistency when both sources specify
    if (
      input.mech &&
      inferredMech !== 'PERMANENT_VIA_REPLICA' &&
      input.mech !== inferredMech
    ) {
      throw new ConstraintError(
        'mech mismatch: host manifest and blob disagree',
        {
          hostManifestMech: input.mech,
          blobMech: inferredMech,
          slug: input.slug,
          hint: 'update host manifest or blob to match',
        },
      );
    }

    // determine mech: input.mech takes precedence, else use inferred
    const mech = input.mech ?? inferredMech;

    // transform source → usable secret via mech
    const mechAdapter = getMechAdapter(mech);
    const { secret, expiresAt } = await mechAdapter.deliverForGet({ source });

    // compute grade from vault + mech
    const grade = inferKeyGrade({ vault: 'os.envvar', mech });

    // extract env/org from slug
    const { env, org } = asKeyrackSlugParts({ slug: input.slug });

    return new KeyrackKeyGrant({
      slug: input.slug,
      key: { secret, grade },
      source: { vault: 'os.envvar', mech },
      env,
      org,
      expiresAt,
    });
  },

  /**
   * .what = set is forbidden for os.envvar
   * .why = read-only vault; env vars are set by caller (ci workflow, shell export)
   */
  set: async () => {
    throw new MalfunctionError(
      'os.envvar is read-only; env vars are set by the caller, not via keyrack',
    );
  },

  /**
   * .what = del is forbidden for os.envvar
   * .why = read-only vault; env vars are managed by the caller
   */
  del: async () => {
    throw new MalfunctionError(
      'os.envvar is read-only; env vars are managed by the caller, not via keyrack',
    );
  },
};
