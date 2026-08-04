import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';

import type { KeyrackGrantMechanism } from './KeyrackGrantMechanism';
import type { KeyrackHostManifest } from './KeyrackHostManifest';
import type { KeyrackHostVault } from './KeyrackHostVault';
import type { KeyrackKeyGrant } from './KeyrackKeyGrant';
import type { KeyrackKeyHostMetaOf } from './KeyrackKeyHostMeta';

/**
 * .what = get method signature for readable vaults
 * .why = extracted for reuse in generic and type guards
 *
 * .note = returns full KeyrackKeyGrant with inferred mech, grade, env, org
 * .note = vault is responsible for mech inference from JSON blobs
 */
type KeyrackHostVaultGetMethod<TVault extends KeyrackHostVault> = (input: {
  slug: string;
  mech?: KeyrackGrantMechanism | null;
  exid?: string | null;
  meta?: KeyrackKeyHostMetaOf<TVault> | null;
  owner?: string | null;
  identity?: string | null;
  // .what = the host manifest, threaded by the batch driver so a vault can decide any manifest-
  //         derived identity at its own boundary
  // .why = the --org hardcut: aws.params derives WHICH AWS identity reads a key (the grove's IMDS
  //        role for @all, the org's declared AWS_PROFILE for a specific org) from this manifest. a
  //        GENERAL keyrack object is threaded here, never an aws.params-specific type — so the
  //        generic contract stays vault-agnostic and every other vault simply ignores it
  //        (see .agent/repo=.this/role=keyrack/briefs/define.keyrack-org-scope.grove-vs-tree.md)
  hostManifest?: KeyrackHostManifest | null;
}) => Promise<KeyrackKeyGrant | null>;

/**
 * .what = vault adapter for keyrack storage backends
 * .why = adapter pattern enables support for multiple storage backends
 *
 * .note = TVault generic determines vault-specific meta type
 * .note = TMode generic:
 *         - 'readwrite' = can read and write (get is a method)
 *         - 'onlywrite' = write-only vault (get is null)
 *         - union = unknown (for generic contexts)
 *
 * .note = vaults encapsulate secret operations:
 *         - set calls mech.acquireForSet internally; secret never exposed to caller
 *         - get calls mech.deliverForGet internally; transforms source → usable secret
 */
export interface KeyrackHostVaultAdapter<
  TMode extends 'readwrite' | 'onlywrite' = 'readwrite' | 'onlywrite',
  TVault extends KeyrackHostVault = KeyrackHostVault,
> {
  /**
   * .what = mechanisms supported by this vault
   * .why = enables mech inference and fail-fast for incompatible mechs
   */
  mechs: {
    supported: KeyrackGrantMechanism[];
  };

  /**
   * .what = unlock the vault for the current session
   * .why = enables subsequent get operations without re-authentication
   *
   * .note = identity is for os.secure vault (age encryption via ssh key)
   * .note = silent mode for aws.config vault (suppress cli output)
   * .note = meta is for aws.config vault (awsSsoUsername for session mismatch check)
   * .note = slug and owner are for error messages (enables actionable hints)
   */
  unlock: (input: {
    identity: string | null;
    silent?: boolean;
    exid?: string | null;
    meta?: KeyrackKeyHostMetaOf<TVault> | null;
    slug?: string | null;
    owner?: string | null;
  }) => Promise<void>;

  /**
   * .what = check if the vault is unlocked
   * .why = enables skip of unlock prompt if already unlocked
   *
   * .note = exid is optional; aws.config uses it to validate sso session for the profile
   * .note = identity is optional; os.secure uses it for session state check
   * .note = meta is optional; aws.config uses awsSsoUsername for session mismatch check
   */
  isUnlocked: (input?: {
    exid?: string | null;
    identity?: string | null;
    meta?: KeyrackKeyHostMetaOf<TVault> | null;
  }) => Promise<boolean>;

  /**
   * .what = retrieve a credential from the vault
   * .why = core operation for grant flow
   *
   * .note = TMode determines type:
   *         - 'readwrite': get is a method that retrieves secrets
   *         - 'onlywrite': get is null (write-only vault)
   *
   * .note = vault encapsulates mech transformation:
   *         1. retrieve source from storage
   *         2. call mech.deliverForGet({ source }) if mech supplied
   *         3. return translated secret (or source if no mech)
   */
  get: TMode extends 'readwrite' ? KeyrackHostVaultGetMethod<TVault> : null;

  /**
   * .what = store a credential in the vault
   * .why = enables set flow for credential storage
   *
   * .note = vault encapsulates secret acquisition:
   *         1. infers mech if not supplied (via inferKeyrackMechForSet)
   *         2. checks mech compat (fail-fast if not in mechs.supported)
   *         3. calls mech.acquireForSet({ keySlug }) to get source via guided setup
   *         4. stores source credential
   * .note = secret never leaves vault scope; caller never sees it
   * .note = mech is optional; if not supplied, vault infers or prompts
   * .note = exid is optional; only 1password requires it
   * .note = expiresAt is optional; enables ephemeral grant cache (os.direct only)
   * .note = returns { mech } so orchestrator can record what mech was used
   * .note = may also return { exid } when the adapter derives an exid (e.g., aws.config profile name)
   * .note = may also return { meta } for vault-specific metadata (e.g., awsSsoUsername for aws.config)
   * .note = context provides: owner, hostManifest.recipients, identity for verification
   */
  set: (
    input: {
      slug: string;
      mech?: KeyrackGrantMechanism | null;
      exid?: string | null;
      expiresAt?: string | null;
    },
    context?: ContextKeyrack,
  ) => Promise<{
    mech: KeyrackGrantMechanism;
    exid?: string;
    meta?: KeyrackKeyHostMetaOf<TVault>;
  }>;

  /**
   * .what = remove a credential from the vault
   * .why = enables del flow for credential removal
   *
   * .note = exid is optional; only 1password requires it
   * .note = owner is optional; enables per-owner vault isolation (os.direct, os.secure)
   * .note = mech is optional; aws.params destroys the SSM param it wrote for the key
   * .note = meta is optional; aws.params uses meta.region to target the regional SSM param it
   *         destroys (the vault destroys the param it manages, so a removed key strands no secret)
   * .note = returns { destroyed: { exid } } when the adapter destroyed a remote secret it wrote
   *         (aws.params), so the CLI can echo what changed. every other adapter returns
   *         an implicit void (no remote secret destroyed to report); the `| void` arm keeps them
   *         unedited
   */
  del: (
    input: {
      slug: string;
      exid?: string | null;
      owner?: string | null;
      // mech + meta are REQUIRED (null when unknown), not optional — an internal contract input
      // must be consciously supplied so a forgotten value cannot hide behind `undefined`
      // (rule.forbid.undefined-inputs). the caller (delKeyrackKeyHost) always has both from the
      // manifest entry; aws.params reads them to target the owned SSM param it destroys, every
      // other adapter ignores them
      mech: KeyrackGrantMechanism | null;
      meta: KeyrackKeyHostMetaOf<TVault> | null;
    },
    // context mirrors set: aws.params resolves the org-scope AWS_PROFILE from context.hostManifest
    // so a scoped-org del authenticates as the org's declared identity (the --org hardcut governs
    // the mutation exactly as the read); every other adapter ignores context
    context?: ContextKeyrack,
  ) => Promise<{ destroyed: { exid: string } } | null | void>;

  /**
   * .what = clear cached credentials for a key (optional)
   * .why = enables relock flow for vaults with external caches
   *
   * .note = optional; only vaults with external caches need this
   * .note = aws.config uses this to clear ~/.aws/sso/cache and ~/.aws/cli/cache
   */
  relock?: (input: { slug: string; exid?: string | null }) => Promise<void>;
}
