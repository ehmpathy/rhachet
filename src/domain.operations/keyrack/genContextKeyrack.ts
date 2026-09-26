import { ConstraintError } from 'helpful-errors';
import { createCache } from 'simple-in-memory-cache';
import { withSimpleCacheAsync } from 'with-simple-cache';

import type {
  KeyrackHostManifest,
  KeyrackHostVault,
  KeyrackHostVaultAdapter,
  KeyrackRepoManifest,
} from '@src/domain.objects/keyrack';
import { discoverIdentities } from '@src/domain.operations/keyrack/discoverIdentities';
import { getOneIdentityThatDecrypts } from '@src/domain.operations/keyrack/getOneIdentityThatDecrypts';
import { getKeyrackHostManifestPath } from '@src/infra/getKeyrackHostManifestPath';
import { asAgeIdentityResult } from '@src/infra/ssh/asAgeIdentityResult';
import { SSH_KEY_PATH_MARKER } from '@src/infra/ssh/asSshKeyPathMarker';
import type { KeyrackUnlockAttribution } from '@src/infra/ssh/asUnlockPromptMessage';
import { isAgeCiphertextSshSealed } from '@src/infra/ssh/isAgeCiphertextSshSealed';

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { vaultAdapter1Password } from './adapters/vaults/1password/vaultAdapter1Password';
import { vaultAdapterAwsConfig } from './adapters/vaults/aws.config/vaultAdapterAwsConfig';
import { vaultAdapterGithubSecrets } from './adapters/vaults/github.secrets/vaultAdapterGithubSecrets';
import { vaultAdapterOsDaemon } from './adapters/vaults/os.daemon/vaultAdapterOsDaemon';
import { vaultAdapterOsDirect } from './adapters/vaults/os.direct/vaultAdapterOsDirect';
import { vaultAdapterOsEnvvar } from './adapters/vaults/os.envvar/vaultAdapterOsEnvvar';
import { vaultAdapterOsSecure } from './adapters/vaults/os.secure/vaultAdapterOsSecure';
import { genManifestIdentityViaVariantA } from './identity/genManifestIdentityViaVariantA';
import { getOneEd25519SshKeyCandidate } from './identity/getOneEd25519SshKeyCandidate';

/**
 * .what = unified context for keyrack operations
 * .why = merges DAO and domain contexts; provides lazy-cached identity discovery
 *
 * .note = identity.getOne discovers on first call via trial decrypt, then cached
 * .note = identity.getAll.discovered is lazy cached; getAll.prescribed is from cli
 * .note = hostManifest is set by daoKeyrackHostManifest.get() after decryption
 */
export interface ContextKeyrack {
  owner: string | null;
  identity: {
    /**
     * .what = get identity for a purpose (e.g., manifest decryption)
     * .why = lazy discovery + trial decrypt on first call, then cached
     */
    getOne: (input: { for: 'manifest' }) => Promise<string | null>;
    getAll: {
      /**
       * .what = identities discovered from ssh-agent, ~/.ssh/$owner, etc.
       * .why = lazy discovery avoids filesystem/agent access until needed
       */
      discovered: () => Promise<string[]>;
      /**
       * .what = identities from cli --prikey flags
       * .why = explicit identities take precedence over discovered
       */
      prescribed: string[];
    };
  };
  hostManifest?: KeyrackHostManifest;
  repoManifest?: KeyrackRepoManifest | null;
  gitroot?: string | null;
  /**
   * .what = the CLI-computed prompt attribution (org/tree/env/reach/code), or null
   * .why = the dao's legacy-manifest strip path (decryptWithAgeCLI) reads this off
   *        context to attribute its gnome dialog + print the visual-match code, the
   *        SAME attribution the Variant A sign path renders
   *        (rule.forbid.contextless-unlock-prompt)
   */
  promptAttribution?: KeyrackUnlockAttribution | null;
  vaultAdapters: Record<KeyrackHostVault, KeyrackHostVaultAdapter>;
}

/**
 * .what = generate context for keyrack operations
 * .why = creates unified context with lazy identity discovery and vault adapters
 *
 * .note = factory is sync; identity discovery happens lazily on first getOne call
 * .note = hostManifest is populated by daoKeyrackHostManifest.get()
 */
export const genContextKeyrack = (input: {
  owner: string | null;
  /**
   * .what = supplemental prikeys to consider for manifest decryption
   * .why = extends default discovery (ssh-agent, ~/.ssh/id_ed25519, etc)
   */
  prikeys?: string[];
  repoManifest?: KeyrackRepoManifest | null;
  gitroot?: string | null;
  /**
   * .what = override the gnome askpass dialog candidate paths
   * .why = the Variant A unlock prompts a passphrased key via the dialog; tests
   *        inject a scripted stand-in, and a custom install path can be pointed at
   */
  askpassCandidates?: string[];
  /**
   * .what = the CLI-computed prompt attribution (org/tree/env/reach/code), or null
   * .why = when present, the Variant A native prompt renders the attributed dialog
   *        that also shows the visual-match code (rule.forbid.contextless-unlock-prompt);
   *        when null it falls to the plain off-tty dialog (a non-cli caller cannot
   *        compute it)
   */
  promptAttribution?: KeyrackUnlockAttribution | null;
}): ContextKeyrack => {
  const { owner, prikeys } = input;

  // getAll.discovered: lazy cached identity discovery
  // .note = withSimpleCacheAsync (not the sync withSimpleCache) so a REJECTED
  //         promise is never cached — the sync variant caches the promise object
  //         before it settles, which would poison every later call in this
  //         context after one transient failure. async awaits first, so a throw
  //         is retryable and its built-in dedup still prevents a double prompt
  const discovered = withSimpleCacheAsync(
    async () => discoverIdentities({ owner: input.owner }),
    { cache: createCache() },
  );

  // getAll.prescribed: prikey paths from cli --prikey flags
  const prescribed = prikeys ?? [];

  // getOne: lazy cached, calls getAll internally when pool is built
  // .note = withSimpleCacheAsync (see `discovered` above): a cancelled dialog or
  //         agent blip must stay retryable within the process, not poison getOne
  const getOne = withSimpleCacheAsync(
    async (_args: { for: 'manifest' }) => {
      // no manifest → none to decrypt (and never a needless prompt)
      if (!existsSync(getKeyrackHostManifestPath({ owner }))) return null;

      // convert prescribed paths to identities (passphrase-less keys convert here);
      // an actionable hint (e.g. "passphrase-protected, install age") rides along
      // so it can surface if no identity decrypts, per errors-name-the-fix
      const prescribedResult = getAllPrescribedIdentities({ prescribed });

      // try the prompt-free identities first — prescribed passwordless keys + the
      // discovered pool. a Variant A manifest can carry a backup recipient (added
      // via `recipient set` for multi-machine access), and that backup decrypts
      // with NO passphrase prompt. so try it before Variant A: a second machine
      // unlocks without the native dialog, and Variant A's prompt never fires when
      // a pool identity already suffices. this recomposes Variant A as one lazily-
      // tried candidate rather than an eager gate that blocks + throws before the
      // pool is ever reached (r011 i042 — the `recipient set` twin of the i041
      // orphan defect)
      const poolPromptFree = [
        ...prescribedResult.identities,
        ...(await discovered()),
      ];
      const identityFromPool = await trialDecryptManifest({
        owner,
        pool: poolPromptFree,
      });
      if (identityFromPool) return identityFromPool;

      // a v0 legacy manifest sealed to a raw ssh-ed25519 recipient (a passphrased
      // ed25519 init made BEFORE derive-not-store) cannot be opened by the prompt-free
      // pool (it needs the key passphrase) NOR by Variant A's K (K is a DIFFERENT
      // recipient than the ssh seal). the ONE key that opens it is the ed25519 ssh key
      // itself, via `age -d -i` after a gnome-dialog passphrase strip — the SAME age-cli
      // marker path rsa uses. this is the seamless-backcompat path: return the marker so
      // the manifest decrypts here, then unlock's migrate step re-seals it forward to K.
      // gate STRICTLY on the ssh-sealed sniff so a normal K-sealed manifest never takes
      // this path (never a wasted strip dialog on the common case)
      const legacyMarker = getOneLegacySshSealedMarker({ owner, prescribed });
      if (legacyMarker) return legacyMarker;

      // no prompt-free identity decrypted → NOW re-derive the manifest identity K via
      // the ephemeral agent + native prompt (the passphrased-ed25519 derive-not-store
      // path). returns null when NO usable ed25519 key is present (no key, or only a
      // wrong-type rsa/ecdsa key) — a fall-through, since derive-not-store has no
      // stored signal to gate on; the caller then surfaces its own no-identity error.
      // a wrong ed25519 key derives a DIFFERENT K that the trial-decrypt below rejects
      // as a normal miss (no bespoke wrap-key-mismatch throw under derive-not-store)
      const variantAIdentity = await genManifestIdentityViaVariantA({
        owner,
        prescribed,
        askpassCandidates: input.askpassCandidates,
        attribution: input.promptAttribution,
      });
      if (variantAIdentity) {
        const identityFromVariantA = await trialDecryptManifest({
          owner,
          pool: [variantAIdentity],
        });
        if (identityFromVariantA) return identityFromVariantA;
      }

      // no identity decrypted, but an explicit --prikey named an actionable fix (a
      // passphrase-protected key needs `age` installed): surface that specific
      // message rather than degrade to a generic "no identity" downstream. an
      // explicit key the human named deserves its named fix, never a swallowed one
      // (errors-name-the-fix)
      if (prescribedResult.hint)
        throw new ConstraintError(prescribedResult.hint, { owner, prescribed });

      // no identity decrypted — return null, NEVER a variantAIdentity that failed the
      // trial-decrypt above. under derive-not-store a WRONG ed25519 key derives a
      // DIFFERENT K that the manifest rejects, so it reaches here non-null-but-useless;
      // to hand it back would make the DAO try (and fail) to decrypt with it and throw
      // the opaque "failed to decrypt host manifest", instead of the DAO's null-path
      // "no identity could decrypt manifest … use --prikey" that names the fix
      // (errors-name-the-fix — the wrong-key case is caller-fixable)
      return null;
    },
    { cache: createCache() },
  );

  return {
    owner: input.owner,
    identity: {
      getOne,
      getAll: { discovered, prescribed },
    },
    repoManifest: input.repoManifest,
    gitroot: input.gitroot,
    promptAttribution: input.promptAttribution,
    vaultAdapters: {
      'os.envvar': vaultAdapterOsEnvvar,
      'os.direct': vaultAdapterOsDirect,
      'os.secure': vaultAdapterOsSecure,
      'os.daemon': vaultAdapterOsDaemon,
      '1password': vaultAdapter1Password,
      'aws.config': vaultAdapterAwsConfig,
      'github.secrets': vaultAdapterGithubSecrets,
    },
  };
};

/**
 * .what = convert prescribed ssh key paths into age identities, and carry the first
 *         actionable conversion hint (e.g. "passphrase-protected, install age")
 * .why = keeps the getOne closure a narrative — the map/filter decode lives behind
 *        one named call (rule.require.named-transformers). unlike the DISCOVERY
 *        pool (a silent skip is right there), a PRESCRIBED key the human named
 *        deserves its specific fix surfaced, so the hint rides back for getOne to
 *        raise only when no identity decrypts (errors-name-the-fix)
 *
 * .note = each key converts via asAgeIdentityResult, the transformer that allowlists
 *         ONLY the expected "not in-process-convertible" BadRequestError (recovered
 *         via the Variant A agent path or the age-CLI fallback) and rethrows genuine
 *         faults — so a null identity is a fall-through, never a swallowed fault
 *         (rule.forbid.failhide). the hint is the one expected miss with a fix
 */
const getAllPrescribedIdentities = (input: {
  prescribed: string[];
}): { identities: string[]; hint: string | null } => {
  const results = input.prescribed.map((keyPath) =>
    asAgeIdentityResult({ keyPath }),
  );
  return {
    identities: results
      .map((result) => result.identity)
      .filter((id): id is string => id !== null),
    // the first actionable hint among the prescribed keys, or null if none carry one
    hint:
      results
        .map((result) => ('hint' in result ? result.hint : null))
        .find((h) => h !== null) ?? null,
  };
};

/**
 * .what = for a v0 legacy manifest sealed to a raw ssh-ed25519 recipient, return the
 *         age-cli marker for the ed25519 ssh key that opens it — or null when the
 *         manifest is not ssh-sealed, or no ed25519 key is present to open it
 * .why = the seamless-backcompat path (the ONLY legacy shape we migrate in place): a
 *        passphrased ed25519 init made BEFORE derive-not-store sealed the manifest to a
 *        raw ssh-ed25519 recipient. that seal opens ONLY via `age -d -i <key>` (age's
 *        own ssh-recipient KDF, which the in-process ed25519->X25519 convert cannot
 *        reproduce). the SSH_KEY_PATH_MARKER hands decryptWithIdentity that key path,
 *        which strips the passphrase via the gnome dialog (never the tty) and shells to
 *        `age -d -i`. the DAO's single decrypt does the one strip; unlock's migrate then
 *        re-seals forward to K — the accepted two-prompt first unlock (vision d6)
 *
 * .note = gated on isAgeCiphertextSshSealed so it fires ONLY for the raw-ssh shape; a
 *         normal K-sealed (X25519) manifest returns false here and never strips. the
 *         marker is returned UNVALIDATED (no trial-decrypt) to keep the first unlock at
 *         exactly one strip dialog: the DAO's own decrypt validates it, and a wrong key
 *         surfaces loud there (a genuine decrypt fault, never a swallowed miss)
 * .note = the ed25519 key is picked with the SAME shared precedence (owner → prescribed
 *         → standard) the Variant A sign + migrate re-seal use, so the key that opens the
 *         legacy seal is the same one migrate re-derives K from
 */
const getOneLegacySshSealedMarker = (input: {
  owner: string | null;
  prescribed: string[];
}): string | null => {
  const path = getKeyrackHostManifestPath({ owner: input.owner });
  if (!existsSync(path)) return null;

  // only the raw-ssh (v0) shape takes this path; a K-sealed manifest is false here
  const ciphertext = readFileSync(path, 'utf8');
  if (!isAgeCiphertextSshSealed({ ciphertext })) return null;

  // the ed25519 key that opens the seal, in the shared candidate precedence
  const candidate = getOneEd25519SshKeyCandidate({
    owner: input.owner,
    prescribed: input.prescribed,
  });
  if (!candidate) return null;

  // absolute path in the marker, so `age -d -i` reads the key regardless of cwd (the
  // same absolutize sshPrikeyToAgeIdentity applies to its rsa/ecdsa marker)
  return `${SSH_KEY_PATH_MARKER}${resolve(candidate.keyPath)}`;
};

/**
 * .what = try each identity to decrypt the host manifest
 * .why = returns the identity that works, or null if none work
 *
 * .note = returns null if manifest file does not exist
 * .note = returns null if no identity can decrypt
 */
const trialDecryptManifest = async (input: {
  owner: string | null;
  pool: string[];
}): Promise<string | null> => {
  const path = getKeyrackHostManifestPath({ owner: input.owner });

  // return null if file does not exist
  if (!existsSync(path)) return null;

  // return null if no identities to try
  if (input.pool.length === 0) return null;

  // read encrypted content
  const ciphertext = readFileSync(path, 'utf8');

  // try each identity via the ONE shared trial-decrypt loop (its allowlist swallows
  // only the expected wrong-identity miss and fails loud on any genuine fault); we
  // need only which identity worked, not the plaintext. owner MUST thread through: on
  // the rsa/ecdsa fallthrough it reaches decryptWithAgeCLI's headless guard, whose
  // fix-message names the correct `--owner` retry flag (rule.require.errors-name-the-fix)
  const found = await getOneIdentityThatDecrypts({
    ciphertext,
    pool: input.pool,
    owner: input.owner,
  });
  return found?.identity ?? null;
};
