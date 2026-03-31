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

import { getGitRepoRoot } from 'rhachet-artifact-git';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import type { KeyrackGrantMechanism } from '@src/domain.objects/keyrack/KeyrackGrantMechanism';
import type { KeyrackHostVault } from '@src/domain.objects/keyrack/KeyrackHostVault';
import { genContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { genContextKeyrackGrantGet } from '@src/domain.operations/keyrack/genContextKeyrackGrantGet';
import { getAllKeyrackGrantsByRepo } from '@src/domain.operations/keyrack/getAllKeyrackGrantsByRepo';
import { getOneKeyrackGrantByKey } from '@src/domain.operations/keyrack/getOneKeyrackGrantByKey';
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
export { setKeyrackKeyHost } from '@src/domain.operations/keyrack/setKeyrackKeyHost';
/**
 * .what = keyrack sdk namespace
 * .why = provides simple api for credential management
 */
export const keyrack = {
  /**
   * .what = get credentials from keyrack
   * .why = grants keys from vault via configured mechanism
   */
  get: async (input: {
    for: { repo: true } | { key: string };
    env?: string;
    owner?: string | null;
    allow?: { dangerous?: boolean };
  }) => {
    const gitroot = await getGitRepoRoot({ from: process.cwd() });
    const context = await genContextKeyrackGrantGet({
      gitroot,
      owner: input.owner ?? null,
    });

    if ('repo' in input.for) {
      return getAllKeyrackGrantsByRepo(
        { env: input.env ?? null, allow: input.allow },
        context,
      );
    }

    return getOneKeyrackGrantByKey(
      {
        key: input.for.key,
        env: input.env ?? null,
        allow: input.allow,
      },
      context,
    );
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
  }) => {
    const owner = input.owner ?? null;
    const context = genContextKeyrack({
      owner,
      prikeys: input.prikey ? [input.prikey] : undefined,
    });
    await daoKeyrackHostManifest.get({ owner }, context);
    return setKeyrackKeyHost(
      {
        slug: input.slug,
        mech: input.mech,
        vault: input.vault,
        exid: input.exid,
      },
      context,
    );
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
