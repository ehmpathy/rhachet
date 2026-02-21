import { UnexpectedCodePathError } from 'helpful-errors';
import { asIsoTimeStamp } from 'iso-time';

import type { KeyrackHostVaultAdapter } from '../../../../domain.objects/keyrack';
import {
  daemonAccessGet,
  daemonAccessRelock,
  daemonAccessUnlock,
  isDaemonReachable,
} from '../../daemon/sdk';
import { inferKeyGrade } from '../../grades/inferKeyGrade';

/**
 * .what = vault adapter for os.daemon storage
 * .why = stores credentials in memory via unix domain socket daemon
 *
 * .note = os.daemon is session-time only; keys die on logout or crash
 * .note = uses daemon SDK for all operations
 */
export const vaultAdapterOsDaemon: KeyrackHostVaultAdapter = {
  /**
   * .what = unlock the vault for the current session
   * .why = os.daemon doesn't need explicit unlock — daemon handles auth per-connection
   *
   * .note = no-op since daemon validates caller login session on each request
   */
  unlock: async () => {
    // no-op: daemon validates caller on each request
  },

  /**
   * .what = check if the vault is unlocked
   * .why = os.daemon is unlocked if daemon is reachable
   */
  isUnlocked: async () => {
    return isDaemonReachable({});
  },

  /**
   * .what = retrieve a credential from the daemon
   * .why = core operation for grant flow
   */
  get: async (input: { slug: string }) => {
    const result = await daemonAccessGet({ slugs: [input.slug] });

    // daemon not reachable — return null
    if (!result) return null;

    // key not found in daemon — return null
    const keyEntry = result.keys.find((k) => k.slug === input.slug);
    if (!keyEntry) return null;

    // return just the secret (adapter interface returns string)
    return keyEntry.key.secret;
  },

  /**
   * .what = store a credential in the daemon
   * .why = enables set flow for credential storage
   */
  set: async (input: {
    slug: string;
    secret: string | null;
    env: string;
    org: string;
    expiresAt?: string | null;
  }) => {
    // secret is required for os.daemon vault
    if (!input.secret)
      throw new UnexpectedCodePathError('secret required for os.daemon vault', {
        slug: input.slug,
      });

    // infer grade for os.daemon (always encrypted + transient)
    const grade = inferKeyGrade({
      vault: 'os.daemon',
      mech: 'PERMANENT_VIA_REPLICA',
    });

    // calculate expiration (default 9 hours if not provided)
    const defaultTtlMs = 9 * 60 * 60 * 1000; // 9 hours
    const expiresAt = input.expiresAt
      ? asIsoTimeStamp(new Date(input.expiresAt))
      : asIsoTimeStamp(new Date(Date.now() + defaultTtlMs));

    await daemonAccessUnlock({
      keys: [
        {
          slug: input.slug,
          key: { secret: input.secret, grade },
          source: { vault: 'os.daemon', mech: 'PERMANENT_VIA_REPLICA' },
          env: input.env,
          org: input.org,
          expiresAt,
        },
      ],
    });
  },

  /**
   * .what = remove a credential from the daemon
   * .why = enables del flow for credential removal
   */
  del: async (input: { slug: string }) => {
    await daemonAccessRelock({ slugs: [input.slug] });
  },
};
