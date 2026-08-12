import { asIsoTimeStamp, type IsoTimeStamp } from 'iso-time';

import type { KeyrackHostVaultAdapter } from '@src/domain.objects/keyrack';
import { KeyrackKeyGrant } from '@src/domain.objects/keyrack';
import { asKeyrackSlugParts } from '@src/domain.operations/keyrack/asKeyrackSlugParts';
import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';
import {
  daemonAccessGet,
  daemonAccessRelock,
  daemonAccessUnlock,
  findsertKeyrackDaemon,
  isDaemonReachable,
} from '@src/domain.operations/keyrack/daemon/sdk';
import { decideIsKeySlugEqual } from '@src/domain.operations/keyrack/decideIsKeySlugEqual';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { inferKeyGrade } from '@src/domain.operations/keyrack/grades/inferKeyGrade';
import { asKeyrackKeyReachField } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachField';
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
   * .note = uses input.owner for per-owner daemon isolation
   */
  get: async (input) => {
    // derive socket path from owner (enables per-owner daemon isolation)
    const socketPath = getKeyrackDaemonSocketPath({
      owner: input.owner ?? null,
    });
    // .note = the reach travels to the daemon, which addresses its store by (slug, reach).
    //         this is one of the three read paths into the daemon and the only one that
    //         passes no org/env filter at all — so it has to carry the reach itself, or a
    //         reach-ask on this path would read back the reachless grant (r3)
    const result = await daemonAccessGet({
      slugs: [input.slug],
      reach: input.reach,
      socketPath,
    });

    // daemon not reachable — return null
    if (!result) return null;

    // key not found in daemon — return null
    // .why `decideIsKeySlugEqual` rather than `===` = the daemon runs an env=all fallback
    //      INTERNALLY (`org.test.KEY` -> `org.all.KEY`) and hands the entry back under the slug it
    //      actually matched, not the one that was asked for. a strict `===` therefore throws away
    //      a lookup the daemon just succeeded at, and reports `not_found` for a key it still holds
    // .note = this is the SAME comparison `getKeyrackKeyGrant` makes on its own daemon read. two
    //         read paths, one daemon, one fallback — they must not disagree on whether it hit
    // .note = the reach axis is NOT widened by this. the reach was already carried into
    //         `daemonAccessGet` above, and the daemon addresses its store by (slug, reach), so
    //         every entry in `result.keys` is reach-matched before this comparison sees it. this
    //         only decides which of those the ASKED slug refers to
    const keyEntry = result.keys.find((k) =>
      decideIsKeySlugEqual({ desired: input.slug, proposed: k.slug }),
    );
    if (!keyEntry) return null;

    // return full KeyrackKeyGrant from daemon cache
    // .note = daemon stores expiresAt as number (timestamp), convert to IsoTimeStamp
    const expiresAt: IsoTimeStamp | undefined = keyEntry.expiresAt
      ? asIsoTimeStamp(new Date(keyEntry.expiresAt))
      : undefined;
    return new KeyrackKeyGrant({
      slug: keyEntry.slug,
      key: keyEntry.key,
      ...asKeyrackKeyReachField({ reach: keyEntry.reach }),
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
   * .note = uses context.owner for per-owner daemon isolation
   */
  set: async (input, context?: ContextKeyrack) => {
    // derive socket path from owner (enables per-owner daemon isolation)
    const owner = context?.owner ?? null;
    const socketPath = getKeyrackDaemonSocketPath({ owner });

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

    // ensure daemon is alive for this owner (auto-start if absent)
    await findsertKeyrackDaemon({ socketPath });

    // extract org and env from slug (format: org.env.keyName)
    const { org, env } = asKeyrackSlugParts({ slug: input.slug });

    // .note = this vault DECLARES a reach: the daemon store keys by (slug, reach) already,
    //         so it carries the exid through untouched and files the value under the
    //         address it was cut for. to drop it here would store the secret at the BARE
    //         address while `setKeyrackKeyHost` writes the manifest entry at the COMPOSITE
    //         one — and the two would never meet again. a reach-unlock would find a manifest
    //         entry aimed at storage that was never written, and a reachless unlock would
    //         find no manifest entry at all. the credential would be orphaned, with no error
    //         at any step, which is the quietest failure this design can produce
    await daemonAccessUnlock({
      keys: [
        {
          slug: input.slug,
          key: { secret, grade },
          ...asKeyrackKeyReachField({ reach: input.reach }),
          source: { vault: 'os.daemon', mech: 'EPHEMERAL_VIA_SESSION' },
          env,
          org,
          expiresAt,
        },
      ],
      socketPath,
    });

    return { mech };
  },

  /**
   * .what = remove a credential from the daemon
   * .why = enables del flow for credential removal
   *
   * .note = uses input.owner for per-owner daemon isolation
   * .note = `reach` NARROWS the purge to one reach, and it must be threaded for the
   *         same reason `set` threads it: a `del` names one address. absent it, the daemon
   *         sweeps EVERY reach of the slug (its documented relock semantics), so a
   *         caller who asked to remove one key would silently lose its peers. that sweep is
   *         correct for `relock`, where a human means the whole key (q1) — it is wrong here,
   *         where the caller named an address
   * .note = the input is INFERRED from `KeyrackHostVaultAdapter`, never re-declared inline.
   *         an inline type that omits `reach` is structurally ASSIGNABLE — the interface's
   *         field is optional, so a narrower implementation compiles with zero signal. that
   *         is exactly how this file dropped a reach and orphaned a credential (i006): it
   *         did not write a WRONG branch, it wrote none, and no compiler said so. the
   *         explicit inline type was the shape that hid it, so it is gone rather than merely
   *         corrected — one edit turns a correct explicit type into a wrong one, silently
   */
  del: async (input) => {
    // derive socket path from owner (enables per-owner daemon isolation)
    const socketPath = getKeyrackDaemonSocketPath({
      owner: input.owner ?? null,
    });
    await daemonAccessRelock({
      slugs: [input.slug],
      ...asKeyrackKeyReachField({ reach: input.reach }),
      socketPath,
    });
  },
};
