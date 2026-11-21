import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { daoKeyrackInventory } from '@src/access/daos/daoKeyrackInventory';
import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import {
  type KeyrackGrantMechanism,
  type KeyrackHostVault,
  KeyrackKeyHost,
  type KeyrackKeyReach,
} from '@src/domain.objects/keyrack';
import { isEphemeralVault } from '@src/domain.operations/keyrack/isEphemeralVault';
import { isKeyrackKeyHostAttrsEqual } from '@src/domain.operations/keyrack/isKeyrackKeyHostAttrsEqual';
import { asKeyrackKeyReachField } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachField';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';

import { asKeyrackKeyEnv } from './asKeyrackKeyEnv';
import { asKeyrackKeyName } from './asKeyrackKeyName';
import { daemonAccessRelock } from './daemon/sdk';
import type { ContextKeyrack } from './genContextKeyrack';
import { setKeyrackHostManifestHosts } from './setKeyrackHostManifestHosts';

/**
 * .what = configure storage for a credential key on this host
 * .why = enables per-host credential storage configuration
 *
 * .note = uses findsert semantics — if host found with same attrs, return found
 * .note = sudo credentials (env=sudo) stored only in host manifest
 * .note = regular credentials stored in host manifest AND keyrack.yml
 * .note = a reach makes this a DIFFERENT key, not a variant of one. it never overwrites the
 *         reachless host, and never writes itself into keyrack.yml — a repo manifest's
 *         `reaches:` line is hand-authored by a human, and no keyrack command mutates it
 */
export const setKeyrackKeyHost = async (
  input: {
    slug: string;
    mech?: KeyrackGrantMechanism | null;
    vault: KeyrackHostVault;
    exid?: string | null;
    env?: string;
    org?: string;

    /**
     * .what = the reach this key was cut for; absent means the reachless key
     * .why = OPTIONAL, not nullable — a deliberate exception to
     *        `rule.forbid.undefined-inputs`. this value lands in `KeyrackKeyHost`, which is
     *        serialized into the encrypted host manifest, where e16's rule holds: an absent
     *        reach must be DROPPED, never written as `null` — else every extant manifest
     *        gains a field and no longer round-trips byte-identically (e1)
     */
    reach?: KeyrackKeyReach;

    meta?: Record<string, unknown> | null;
    maxDuration?: string | null;
    at?: string | null;
  },
  context: ContextKeyrack & {
    /**
     * .what = the host-state boundaries this op writes through: manifest file, daemon socket,
     *         inventory, keyrack.yml
     * .why = injectable, so a unit test supplies in-memory fakes; absent in prod, where the real
     *        ones serve
     */
    boundaries?: {
      setKeyrackHostManifestHosts?: typeof setKeyrackHostManifestHosts;
      daemonAccessRelock?: typeof daemonAccessRelock;
      daoKeyrackInventory?: Pick<typeof daoKeyrackInventory, 'set'>;
      daoKeyrackRepoManifest?: {
        set: Pick<(typeof daoKeyrackRepoManifest)['set'], 'findsertKeyToEnv'>;
      };
    };
  },
): Promise<KeyrackKeyHost> => {
  // bind each host-state boundary: the injected fake, else the real one
  const boundaries = {
    setKeyrackHostManifestHosts:
      context.boundaries?.setKeyrackHostManifestHosts ??
      setKeyrackHostManifestHosts,
    daemonAccessRelock:
      context.boundaries?.daemonAccessRelock ?? daemonAccessRelock,
    daoKeyrackInventory:
      context.boundaries?.daoKeyrackInventory ?? daoKeyrackInventory,
    daoKeyrackRepoManifest:
      context.boundaries?.daoKeyrackRepoManifest ?? daoKeyrackRepoManifest,
  };

  // guard: host manifest required
  if (!context.hostManifest)
    throw new MalfunctionError(
      'hostManifest required for set; call daoKeyrackHostManifest.get() first',
      { slug: input.slug },
    );

  const now = new Date().toISOString();

  // expand org — accepts @this (expands from manifest), @all, or already-expanded org name
  const orgInput = input.org ?? '@this';
  const orgExpanded = (() => {
    if (orgInput === '@this') {
      if (!context.repoManifest?.org) {
        throw new ConstraintError(
          '@this requires repo manifest to expand org',
          {
            note: 'run from a repo with keyrack.yml or use @all for cross-org credentials',
          },
        );
      }
      return context.repoManifest.org;
    }
    // @all or already-expanded org name (e.g., 'testorg') — pass through
    return orgInput;
  })();

  // extract env from slug (format: org.env.keyName)
  const envFromSlug = asKeyrackKeyEnv({ slug: input.slug }) || 'all';

  // address this key by its full identity — a reach key sits BESIDE the reachless one
  const address = asKeyrackKeySlugAtReach({
    slug: input.slug,
    reach: input.reach,
  });

  // store secret in vault
  // .note = vault encapsulates mech calls: infers mech if absent, checks compat, calls mech.acquireForSet
  // .note = the secret comes only from the mech; a caller with the value in hand supplies it via
  //   `context.mech.question` (the replica mech asks it before stdin)
  const adapter = context.vaultAdapters[input.vault];
  const setResult = await adapter.set(
    {
      slug: input.slug,
      mech: input.mech ?? null,
      exid: input.exid ?? null,
      reach: input.reach,
    },
    context,
  );

  // use mech from vault.set result (may have been inferred)
  const mechForManifest = setResult.mech;

  // if adapter derived an exid (e.g., aws.config guided setup), use it for the manifest entry
  const exidForManifest = setResult.exid ?? input.exid ?? null;

  // if adapter derived meta (e.g., awsSsoUsername for aws.config), use it for the manifest entry
  const metaForManifest = setResult.meta ?? input.meta ?? null;

  // write-only vaults (get === null) are passthrough — skip manifest write
  // .why = write-only vaults cannot be used for subsequent keyrack get/unlock
  //        so its equivalent to them never been present on this host
  // .bonus = enables push to write-only vaults without risk of erasure of usable host keys
  if (adapter.get === null) {
    // return a transient KeyrackKeyHost (not persisted) for CLI output
    return new KeyrackKeyHost({
      slug: input.slug,
      mech: mechForManifest,
      vault: input.vault,
      exid: exidForManifest,
      env: input.env ?? 'all',
      org: orgExpanded,
      ...asKeyrackKeyReachField({ reach: input.reach }),
      meta: metaForManifest,
      maxDuration: input.maxDuration ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  // invalidate stale daemon cache for this key (if daemon is active)
  // this ensures `get` returns "locked" instead of stale value after `set`
  // .note = skip for os.daemon vault — daemon IS the source, set already stored there
  // .note = scoped to THIS key's reach — a set at one reach leaves the grants held for
  //         every other reach alone, because they were never made stale by it
  // .note = via `asKeyrackKeyReachField`, the one home of the omit-when-absent rule (e16), which
  //         `delKeyrackKeyHost`'s twin call shares
  if (input.vault !== 'os.daemon') {
    await boundaries.daemonAccessRelock({
      slugs: [input.slug],
      ...asKeyrackKeyReachField({ reach: input.reach }),
      owner: context.owner,
    });
  }

  // construct key host with derived mech and exid
  const keyHost = new KeyrackKeyHost({
    slug: input.slug,
    mech: mechForManifest,
    vault: input.vault,
    exid: exidForManifest,
    env: input.env ?? 'all',
    org: orgExpanded,
    // an absent reach leaves NO key on the object, so the manifest re-serializes byte
    // for byte as it does today (e1, e16)
    ...asKeyrackKeyReachField({ reach: input.reach }),
    meta: metaForManifest,
    maxDuration: input.maxDuration ?? null,
    createdAt: now,
    updatedAt: now,
  });

  // file the key host into the manifest, under the host mutex, over a fresh read
  // .note = findsert: a fresh host found with the same attrs is kept, and returned
  const isHostFoundSame = (hostFound: KeyrackKeyHost | undefined): boolean =>
    !!hostFound &&
    isKeyrackKeyHostAttrsEqual({
      hostFound: new KeyrackKeyHost(hostFound),
      attrs: {
        mech: mechForManifest,
        vault: input.vault,
        exid: exidForManifest,
        env: input.env ?? 'all',
        org: orgExpanded,
        meta: metaForManifest,
      },
    });
  const filed = await boundaries.setKeyrackHostManifestHosts(
    {
      mutate: ({ hosts }) =>
        isHostFoundSame(hosts[address])
          ? null
          : { ...hosts, [address]: keyHost },
    },
    context,
  );
  if (!filed.changed) return new KeyrackKeyHost(filed.manifest.hosts[address]!);

  // set inventory entry (after manifest persist)
  // .note = ephemeral vaults skip inventory (cleared on relock)
  // .note = stocked under the full address, so `inferKeyrackKeyStatusWhenNotGranted` can
  //         tell "this reach was never cut" from "this key is merely locked"
  if (!isEphemeralVault({ vault: input.vault })) {
    await boundaries.daoKeyrackInventory.set({
      slug: address,
      owner: context.owner,
    });
  }

  // for non-sudo, non-machine-wide, REACHLESS keys: also write to keyrack.yml (if gitroot
  // available). the three exclusions are one idea from three angles — a key that belongs to the
  // BOX rather than to this repo tree is never declared in that tree's manifest:
  //
  // .note = a machine-wide `@all` key belongs to the box's own namespace (the host manifest),
  //         NOT to any repo tree — exactly like a sudo key. this keeps the bootstrap-to-clone
  //         path pure: an `@all` key sets with NO repo manifest and never creates one, and even
  //         inside a repo tree it is not added to that tree's manifest
  // .note = a REACH key is never declared here either. a repo manifest states what the REPO
  //         needs (a floor every developer must fill), while a reach is what THIS HOST holds —
  //         and the two vary independently: one human bridges ahbode↔whodis, another
  //         ahbode↔ehmpathy. to findsert a key name on a reach set would declare a REACHLESS
  //         requirement the repo never asked for, since the yml entry carries no reach. the
  //         `reaches:` line is hand-authored and committed by a human; no keyrack command
  //         mutates it (q8)
  // .note = `delKeyrackKeyHost` guards the inverse with the same `!input.reach`, and the two
  //         must stay symmetric: a set that writes what a del refuses to strip would leave an
  //         orphan declaration behind on every reach del
  if (
    !input.reach &&
    envFromSlug !== 'sudo' &&
    orgExpanded !== '@all' &&
    context.gitroot
  ) {
    const keyName = asKeyrackKeyName({ slug: input.slug });
    await boundaries.daoKeyrackRepoManifest.set.findsertKeyToEnv({
      gitroot: context.gitroot,
      key: keyName,
      env: envFromSlug,
      at: input.at ?? undefined,
    });
  }

  return keyHost;
};
