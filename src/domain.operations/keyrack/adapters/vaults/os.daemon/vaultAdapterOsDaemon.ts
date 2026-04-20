import { asIsoTimeStamp, type IsoTimeStamp } from 'iso-time';

import type { KeyrackHostVaultAdapter } from '@src/domain.objects/keyrack';
import { KeyrackKeyGrant } from '@src/domain.objects/keyrack';
import { asKeyrackSlugParts } from '@src/domain.operations/keyrack/asKeyrackSlugParts';
import {
  daemonAccessGet,
  daemonAccessRelock,
  daemonAccessUnlock,
  findsertKeyrackDaemon,
  isDaemonReachable,
} from '@src/domain.operations/keyrack/daemon/sdk';
import { inferKeyGrade } from '@src/domain.operations/keyrack/grades/inferKeyGrade';
import { promptHiddenInput } from '@src/infra/promptHiddenInput';

/**
 * .what = vault adapter for os.daemon storage
 * .why = stores credentials in memory via unix domain socket daemon
 *
 * .note = os.daemon is session-time only; keys die on logout or crash
 * .note = uses daemon SDK for all operations
 */
export const vaultAdapterOsDaemon: KeyrackHostVaultAdapter<'readwrite'> = {
  mechs: {
    supported: ['EPHEMERAL_VIA_SESSION'],
  },

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
   *
   * .note = returns full KeyrackKeyGrant from daemon cache
   */
  get: async (input) => {
    const result = await daemonAccessGet({ slugs: [input.slug] });

    // daemon not reachable — return null
    if (!result) return null;

    // key not found in daemon — return null
    const keyEntry = result.keys.find((k) => k.slug === input.slug);
    if (!keyEntry) return null;

    // return full KeyrackKeyGrant from daemon cache
    // .note = daemon stores expiresAt as number (timestamp), convert to IsoTimeStamp
    const expiresAt: IsoTimeStamp | undefined = keyEntry.expiresAt
      ? asIsoTimeStamp(new Date(keyEntry.expiresAt))
      : undefined;
    return new KeyrackKeyGrant({
      slug: keyEntry.slug,
      key: keyEntry.key,
      source: keyEntry.source,
      env: keyEntry.env,
      org: keyEntry.org,
      expiresAt,
    });
  },

  /**
   * .what = store a credential in the daemon
   * .why = enables set flow for credential storage
   *
   * .note = vault prompts for its own secret via stdin
   */
  set: async (input) => {
    // os.daemon only supports EPHEMERAL_VIA_SESSION (keys die on logout/crash)
    const mech = input.mech ?? 'EPHEMERAL_VIA_SESSION';

    // vault always prompts for its own secret via stdin
    const secret = await promptHiddenInput({
      prompt: `enter secret for ${input.slug}: `,
    });

    // infer grade for os.daemon (always encrypted + transient)
    const grade = inferKeyGrade({
      vault: 'os.daemon',
      mech: 'EPHEMERAL_VIA_SESSION',
    });

    // calculate expiration (default 9 hours if not provided)
    const defaultTtlMs = 9 * 60 * 60 * 1000; // 9 hours
    const expiresAt = input.expiresAt
      ? asIsoTimeStamp(new Date(input.expiresAt))
      : asIsoTimeStamp(new Date(Date.now() + defaultTtlMs));

    // ensure daemon is alive (auto-start if absent)
    await findsertKeyrackDaemon();

    // extract org and env from slug (format: org.env.keyName)
    const { org, env } = asKeyrackSlugParts({ slug: input.slug });

    await daemonAccessUnlock({
      keys: [
        {
          slug: input.slug,
          key: { secret, grade },
          source: { vault: 'os.daemon', mech: 'EPHEMERAL_VIA_SESSION' },
          env,
          org,
          expiresAt,
        },
      ],
    });

    return { mech };
  },

  /**
   * .what = remove a credential from the daemon
   * .why = enables del flow for credential removal
   */
  del: async (input: { slug: string }) => {
    await daemonAccessRelock({ slugs: [input.slug] });
  },
};
