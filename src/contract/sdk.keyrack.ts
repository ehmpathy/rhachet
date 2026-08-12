/**
 * .what = lightweight keyrack-focused entry point for rhachet
 * .why = enables consumers to import keyrack functionality
 *        for credential management without the full SDK
 *
 * usage:
 *   import { keyrack, KeyrackKeyGrant } from 'rhachet/keyrack';
 *
 *   const grants = await keyrack.get({ for: { repo: true } });
 *   const grant = await keyrack.get({ for: { key: 'XAI_API_KEY' } });
 *   await keyrack.set({ slug: 'XAI_API_KEY', mech: 'PERMANENT_VIA_REPLICA', vault: 'os.direct' });
 */

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';
import type { KeyrackGrantMechanism } from '@src/domain.objects/keyrack/KeyrackGrantMechanism';
import type { KeyrackHostVault } from '@src/domain.objects/keyrack/KeyrackHostVault';
import {
  formatKeyrackGetAllOutput,
  formatKeyrackGetOneOutput,
} from '@src/domain.operations/keyrack/cli/formatKeyrackGetOneOutput';
import { genContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { getKeyrackKeyGrants } from '@src/domain.operations/keyrack/getKeyrackKeyGrants/getKeyrackKeyGrants';
import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';
import { setKeyrackKeyHost } from '@src/domain.operations/keyrack/setKeyrackKeyHost';
import { sourceAllKeysIntoEnv } from '@src/domain.operations/keyrack/sourceAllKeysIntoEnv';

// domain objects
export type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';
// literals (types)
export type { KeyrackGrantMechanism } from '@src/domain.objects/keyrack/KeyrackGrantMechanism';
// adapters (types)
export type { KeyrackGrantMechanismAdapter } from '@src/domain.objects/keyrack/KeyrackGrantMechanismAdapter';
export type { KeyrackGrantStatus } from '@src/domain.objects/keyrack/KeyrackGrantStatus';
export { KeyrackHostManifest } from '@src/domain.objects/keyrack/KeyrackHostManifest';
export type { KeyrackHostVault } from '@src/domain.objects/keyrack/KeyrackHostVault';
export type { KeyrackHostVaultAdapter } from '@src/domain.objects/keyrack/KeyrackHostVaultAdapter';
export { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
export { KeyrackKeyHost } from '@src/domain.objects/keyrack/KeyrackKeyHost';
// the reach axis — the exid a key is cut for
export { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
export { KeyrackKeySpec } from '@src/domain.objects/keyrack/KeyrackKeySpec';
export { KeyrackRepoManifest } from '@src/domain.objects/keyrack/KeyrackRepoManifest';
// format operations (for SDK error messages and CLI output)
export type { KeyrackKeyBranchEntry } from '@src/domain.operations/keyrack/cli/emitKeyrackKeyBranch';
export { formatKeyrackKeyBranch } from '@src/domain.operations/keyrack/cli/emitKeyrackKeyBranch';
export {
  formatKeyrackGetAllOutput,
  formatKeyrackGetOneOutput,
} from '@src/domain.operations/keyrack/cli/formatKeyrackGetOneOutput';
// context types
export type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
// low-level operations (for advanced usage)
export { genContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
export type { ContextKeyrackGrantGet } from '@src/domain.operations/keyrack/genContextKeyrackGrantGet';
export { genContextKeyrackGrantGet } from '@src/domain.operations/keyrack/genContextKeyrackGrantGet';
export { getKeyrackKeyGrant } from '@src/domain.operations/keyrack/getKeyrackKeyGrant';
export { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';
export { asKeyrackKeyReachExid } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachExid';
export { setKeyrackKeyHost } from '@src/domain.operations/keyrack/setKeyrackKeyHost';
/**
 * .what = keyrack sdk namespace
 * .why = provides simple api for credential management
 */
export const keyrack = {
  /**
   * .what = get credentials from keyrack; optionally auto-unlock locked keys first
   * .why = grants keys from unlocked sources via configured mechanism, and — when
   *        `with: { unlock: true }` — unlocks any locked key (narrowly, by name) then re-gets
   *
   * .note = returns emit.stdout for ready-to-use CLI output
   * .note = unlock is an explicit opt-in; absent `with`, behavior is the pure get (no unlock)
   */
  get: async <T extends { repo: true } | { key: string }>(input: {
    for: T;
    with?: { unlock?: boolean };
    env?: string;
    org?: string;
    owner?: string | null;

    /**
     * .what = the reach to fetch, as the plaintext label the key was cut for
     * .why = reach is an identity axis, so a slug alone no longer names one key. absent
     *        this, an sdk consumer — the caller `get` exists for — could not reach a key
     *        cut for a reach at all
     *
     * .note = a plain `string`, not a KeyrackKeyReach, so an sdk caller imports no domain
     *         object to name a reach — the same shape the cli flag takes
     * .note = requires the `key` selector. a repo sweep has no one reach to name, so
     *         the pair is refused by `getKeyrackKeyGrants` rather than silently narrowed (q2)
     */
    reach?: string;

    allow?: { dangerous?: boolean };
  }): Promise<
    T extends { repo: true }
      ? { attempts: KeyrackGrantAttempt[]; emit: { stdout: string } }
      : { attempt: KeyrackGrantAttempt; emit: { stdout: string } }
  > => {
    const withUnlock = { unlock: input.with?.unlock ?? false };

    // parse at the sdk boundary, so a malformed exid fails before any lookup — the same
    // parser the cli flag and the repo manifest use, so one grammar serves all three
    const reach = input.reach
      ? asKeyrackKeyReach({ exid: input.reach })
      : undefined;

    if ('repo' in input.for) {
      // .note = `reaches: true` — this returns a STRUCTURED `attempts` array, one entry per
      //         key, so it can carry every reach a key declares. the flat surfaces
      //         (`keyrack.source`, the brain secrets map) opt out: they collapse to a bare
      //         key name, which holds ONE value, so they emit the reachless one in silence.
      //         `keyrack list` is the one home for what a rack holds, consulted on purpose
      const attempts = await getKeyrackKeyGrants({
        for: { repo: true },
        with: { ...withUnlock, reaches: true },
        owner: input.owner ?? null,
        env: input.env ?? null,
        reach,
        allow: input.allow,
      });
      const stdout = formatKeyrackGetAllOutput({ attempts });
      return { attempts, emit: { stdout } } as T extends { repo: true }
        ? { attempts: KeyrackGrantAttempt[]; emit: { stdout: string } }
        : { attempt: KeyrackGrantAttempt; emit: { stdout: string } };
    }

    const attempts = await getKeyrackKeyGrants({
      for: { keys: [input.for.key] },
      with: withUnlock,
      owner: input.owner ?? null,
      env: input.env ?? null,
      org: input.org,
      reach,
      allow: input.allow,
    });
    const attempt = attempts[0]!;
    const stdout = formatKeyrackGetOneOutput({ attempt });
    return { attempt, emit: { stdout } } as T extends { repo: true }
      ? { attempts: KeyrackGrantAttempt[]; emit: { stdout: string } }
      : { attempt: KeyrackGrantAttempt; emit: { stdout: string } };
  },

  /**
   * .what = set credential storage on host
   * .why = configure how a key is stored and managed
   */
  set: async (input: {
    slug: string;
    mech: KeyrackGrantMechanism;
    vault: KeyrackHostVault;
    exid?: string;
    owner?: string | null;
    prikey?: string | null;

    /**
     * .what = the reach this key was cut for, as a plaintext label
     * .why = a key is set PER reach, so without this an sdk caller could only ever
     *        cut the reachless key — and `keyrack.get({ reach })` would find no peer
     */
    reach?: string;
  }) => {
    const owner = input.owner ?? null;
    const context = genContextKeyrack({
      owner,
      prikeys: input.prikey ? [input.prikey] : undefined,
    });
    await daoKeyrackHostManifest.get({ owner }, context);
    const keyHost = await setKeyrackKeyHost(
      {
        slug: input.slug,
        mech: input.mech,
        vault: input.vault,
        exid: input.exid,
        ...(input.reach
          ? { reach: asKeyrackKeyReach({ exid: input.reach }) }
          : {}),
      },
      context,
    );
    return keyHost;
  },

  /**
   * .what = source keyrack keys into process.env (sync)
   * .why = enables test setup files to fetch credentials without manual `source` commands
   *
   * .note = sync because jest setup files run synchronously
   * .note = keyrack already prefers passthrough (checks env vars first)
   */
  source: sourceAllKeysIntoEnv,
};
