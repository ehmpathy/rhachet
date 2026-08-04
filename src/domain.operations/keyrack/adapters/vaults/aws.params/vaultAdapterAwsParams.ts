import { ConstraintError, MalfunctionError } from 'helpful-errors';

import type { KeyrackHostVaultAdapter } from '@src/domain.objects/keyrack';
import { KeyrackKeyGrant } from '@src/domain.objects/keyrack';
import { getOneKeyrackMechAdapter } from '@src/domain.operations/keyrack/adapters/mechanisms/getOneKeyrackMechAdapter';
import { asKeyrackSlugParts } from '@src/domain.operations/keyrack/asKeyrackSlugParts';
import { inferKeyGrade } from '@src/domain.operations/keyrack/grades/inferKeyGrade';

import { asKeyrackAwsParamName } from './asKeyrackAwsParamName';
import { asKeyrackAwsParamRegion } from './asKeyrackAwsParamRegion';
import { delKeyrackAwsParam } from './delKeyrackAwsParam';
import { getOneAwsProfileRegion } from './getOneAwsProfileRegion';
import { getOneKeyrackAwsParamIdentity } from './getOneKeyrackAwsParamIdentity';
import { getOneKeyrackAwsParamMechForSet } from './getOneKeyrackAwsParamMechForSet';
import { getOneKeyrackAwsParamReadyContext } from './getOneKeyrackAwsParamReadyContext';
import { getOneKeyrackAwsParamSecureValue } from './getOneKeyrackAwsParamSecureValue';
import {
  isKeyrackAwsParamMech,
  KEYRACK_AWS_PARAM_MECHS,
} from './isKeyrackAwsParamMech';
import { isKeyrackAwsParamMeta } from './isKeyrackAwsParamMeta';
import { isKeyrackAwsParamName } from './isKeyrackAwsParamName';
import { setKeyrackAwsParamGithubApp } from './setKeyrackAwsParamGithubApp';
import { setKeyrackAwsParamReplica } from './setKeyrackAwsParamReplica';

/**
 * .what = keyrack vault adapter for AWS SSM Parameter Store SecureString
 * .why = a cloud box bootstraps from its ambient IAM identity — no secret placed on it
 *
 * .note = unlock runs pre-SSM prechecks; the SSM read is in get (invoked by unlockKeyrackKeys)
 * .note = the value never rests in keyrack; unlock pulls it into the daemon, get reads the daemon
 */
export const vaultAdapterAwsParams: KeyrackHostVaultAdapter<
  'readwrite',
  'aws.params'
> = {
  // both mechs listed → inferKeyrackMechForSet prompts when --mech is omitted. reads the ONE
  // source array (spread to a mutable array per the contract's KeyrackGrantMechanism[] field)
  mechs: {
    supported: [...KEYRACK_AWS_PARAM_MECHS],
  },

  /**
   * .what = pre-SSM readiness prechecks (gates 0 + 1 + 3); NO aws call
   * .why = the adapter contract is unlock() then unlockKeyrackKeys calls get(); the SSM read
   *        lives in get. unlock fails fast on a malformed exid / absent peer / absent region
   */
  unlock: async (input) => {
    // the exid-present + name-legal + peer + region prechecks all live in the shared seam
    await getOneKeyrackAwsParamReadyContext({
      exid: input.exid,
      meta: input.meta ?? null,
    });
  },

  /**
   * .what = the ambient IAM identity IS the unlock — there is no cached session
   * .why = return false so unlock (cheap prechecks + a fetch into the daemon) runs each time;
   *        the daemon TTL serves get, exactly as every other vault
   */
  isUnlocked: async () => false,

  /**
   * .what = retrieve a credential from SSM (invoked BY unlockKeyrackKeys on keyrack unlock)
   * .why = the grant returned here is pushed into the daemon; the top-level keyrack get reads
   *        the daemon, never this
   */
  get: async (input) => {
    // read + decrypt the SecureString through the org-scope identity, then run the value gates
    // (5 absent, 6 not-SecureString, 6b empty) — the ONE seam a set roundtrip-verify also calls, so
    // get and the set-verify walk the identical path
    // decide the --org identity from the host manifest the batch driver threads (@all → imds, a
    // specific org → its declared profile, no declared profile → fail loud). the generic get
    // contract carries the general hostManifest, never an aws.params-specific field, so the vault
    // resolves its own identity here at its own boundary
    const identity = getOneKeyrackAwsParamIdentity({
      slug: input.slug,
      hostManifest: input.hostManifest ?? null,
    });
    const { value } = await getOneKeyrackAwsParamSecureValue({
      slug: input.slug,
      exid: input.exid,
      meta: input.meta ?? null,
      identity,
    });

    // mech from the STORED manifest entry; NEVER defaulted (a default could emit the app blob
    // instead of a minted token). an absent mech = a corrupt entry → fail loud
    const mech =
      input.mech ??
      MalfunctionError.throw(
        'aws.params grant has no mech — the manifest entry is incomplete',
        { input },
      );

    // guard the stored mech against the supported set (stale/hand-edited/corrupt possible)
    if (!isKeyrackAwsParamMech.assess(mech))
      MalfunctionError.throw('aws.params grant has an unsupported mech', {
        exid: input.exid,
        mech,
      });

    // replica: the decrypted value IS the secret; github-app: mint a ~1h token
    const { secret, expiresAt } = await getOneKeyrackMechAdapter(
      mech,
    ).deliverForGet({
      source: value,
    });
    const grade = inferKeyGrade({ vault: 'aws.params', mech });
    const { env, org } = asKeyrackSlugParts({ slug: input.slug });

    return new KeyrackKeyGrant({
      slug: input.slug,
      key: { secret, grade },
      source: { vault: 'aws.params', mech },
      env,
      org,
      expiresAt,
    });
  },

  /**
   * .what = register the host-manifest entry + autocompute the path; persist for the owned mech
   * .why = set is the config entry point; for a reference it points at an out-of-band param, for
   *        github-app it persists the blob into SSM (mirrors os.secure / 1password)
   */
  set: async (input, context) => {
    // owner is mandatory (a segment of the path); read context.owner, never invent one
    const owner =
      context?.owner ??
      ConstraintError.throw('aws.params requires an owner in the param name', {
        input,
        hint: 'pass --owner so the set-flow supplies context.owner',
      });

    // explicit --exid wins for either mech; validate a human-typed exid, else autocompute
    const { org, env, keyName } = asKeyrackSlugParts({ slug: input.slug });
    const exid = input.exid
      ? isKeyrackAwsParamName.assure(input.exid)
      : asKeyrackAwsParamName({ owner, org, env, key: keyName });

    // region (q5): not ambient; sourced from env (a grove/CI carries AWS_REGION), else the aws
    // profile's configured region (a normal laptop), recorded in meta. fail loud if none anywhere
    const region = asKeyrackAwsParamRegion({
      fromEnv: process.env.AWS_REGION ?? null,
      fromEnvDefault: process.env.AWS_DEFAULT_REGION ?? null,
      fromProfile: getOneAwsProfileRegion(),
    });

    // settle the mech: explicit --mech, else prompt
    const mech = await getOneKeyrackAwsParamMechForSet({
      mech: input.mech,
      vault: vaultAdapterAwsParams,
    });

    // fail loud for a mech aws.params does not support. a --mech comes from the caller (a CLI
    // flag), so a bad value is caller-fixable → ConstraintError, not UnexpectedCodePathError
    // (which is reserved for the structurally-impossible). the stored-mech read in get()/del()
    // keeps MalfunctionError — that path is a corrupt-manifest invariant break, not caller input
    if (!isKeyrackAwsParamMech.assess(mech))
      ConstraintError.throw(`aws.params does not support mech: ${mech}`, {
        mech,
        supported: [...KEYRACK_AWS_PARAM_MECHS],
        hint: 'use PERMANENT_VIA_REPLICA or EPHEMERAL_VIA_GITHUB_APP',
      });

    // decide the --org identity ONCE for both write mechs — replica write, github-app write — so a
    // scoped-org set authenticates as that org's declared AWS_PROFILE (the hardcut), @all as the
    // grove's IMDS role, never the machine's ambient identity. setKeyrackKeyHost guarantees
    // context.hostManifest before set; a specific org with no declared profile fails loud HERE
    // (once), not deep in a write leaf
    const identity = getOneKeyrackAwsParamIdentity({
      slug: input.slug,
      hostManifest: context?.hostManifest ?? null,
    });

    // replica: keyrack writes a static secret it OWNS into SSM (a copy), then roundtrip-verifies —
    // the same owned-secret write as github-app, but a plain secret instead of an app blob. the get
    // path is identical (both passthrough the decrypted SSM value). the write + verify authenticate
    // as the decided --org identity, never the machine's ambient AWS_PROFILE
    if (mech === 'PERMANENT_VIA_REPLICA')
      return setKeyrackAwsParamReplica(
        {
          slug: input.slug,
          exid,
          region,
          identity,
        },
        context,
      );

    // github-app: persist the app blob into SSM + roundtrip verify. thread context so
    // context.mech can inject the credential source in a test (the owned-secret path). the write +
    // verify authenticate as the decided --org identity, never the ambient AWS_PROFILE
    return setKeyrackAwsParamGithubApp(
      {
        slug: input.slug,
        exid,
        region,
        identity,
      },
      context,
    );
  },

  /**
   * .what = destroy the SSM param keyrack wrote for this key
   * .why = keyrack destroys only what it created — both mechs (replica copy, github-app blob)
   *        write a value keyrack owns into SSM, so a del of the key destroys that value
   */
  del: async (input, context) => {
    // mech from the STORED manifest entry; NEVER defaulted. an absent mech = a corrupt entry →
    // fail loud, NEVER a silent no-op "removed": if the entry was actually owned (github-app), a
    // live SSM secret would SURVIVE while the operator believes the del touched no remote secret —
    // a false-safety hazard. mirrors get()'s guard, so a corrupt mech fails loud on BOTH paths
    const mech =
      input.mech ??
      MalfunctionError.throw(
        'aws.params del: grant has no mech — the manifest entry is incomplete',
        { input },
      );

    // guard the stored mech against the supported set (stale/hand-edited/corrupt possible)
    if (!isKeyrackAwsParamMech.assess(mech))
      MalfunctionError.throw('aws.params del: grant has an unsupported mech', {
        slug: input.slug,
        mech,
      });

    // owner is a segment of the computed param name; it must be known to target the param
    const owner =
      input.owner ??
      ConstraintError.throw(
        'aws.params del requires an owner to compute the param name',
        {
          slug: input.slug,
          hint: 'the manifest entry must carry the owner used at set',
        },
      );

    // region rides in the stored meta (set-time capture); it targets the regional param
    const region = isKeyrackAwsParamMeta.assure(input.meta).region;

    // decide the --org identity for the destroy — the SAME hardcut set + read use. @all → the
    // grove's IMDS role; a specific org → that org's declared AWS_PROFILE (from the manifest), so a
    // scoped-org del authenticates as the org, never the machine's ambient identity.
    // delKeyrackKeyHost guarantees context.hostManifest is present
    const identity = getOneKeyrackAwsParamIdentity({
      slug: input.slug,
      hostManifest: context?.hostManifest ?? null,
    });

    // destroy the SSM secret keyrack wrote, then report what was destroyed so the CLI can echo
    // it — a destructive remote mutation must be visible to the operator (status feedback)
    const { name } = await delKeyrackAwsParam({
      slug: input.slug,
      owner,
      region,
      identity,
    });
    return { destroyed: { exid: name } };
  },
};
