import { BadRequestError } from 'helpful-errors';

import { getAllSshKeyCandidatePaths } from '@src/infra/ssh/getAllSshKeyCandidatePaths';

import { existsSync } from 'node:fs';

/**
 * .what = derive the private + public key paths for `keyrack init` from the
 *         optional --pubkey input, or fall back to the default ssh key
 * .why = keeps initKeyrack a narrative — the 3-way branch (pubkey-value-reject /
 *        path-to-prikey / default-key-lookup) lives behind one named transformer
 *        instead of an inline IIFE (rule.forbid.decode-friction-in-orchestrators)
 *
 * .note = a --pubkey that looks like a key VALUE (ssh-…/age…) is rejected: init
 *         needs the PRIVATE key path (to read cipher/type), which a value cannot
 *         yield. a .pub path is mapped to its private-key sibling. absent
 *         --pubkey, the default ssh key is used, or a fail-fast names the fix
 * .note = the default-key lookup shares getAllSshKeyCandidatePaths with unlock's
 *         Variant A pick, so init seals the manifest with the SAME key unlock later
 *         re-derives K from — owner key first. without this the two diverged
 *         (init was owner-blind), which sealed-with-A/unlocked-with-B into an opaque
 *         "no identity could decrypt" (rule.require.solve-at-cause)
 */
export const asInitKeyPaths = (input: {
  pubkey?: string;
  owner: string | null;
}): { prikeyPath: string; pubkeyPath: string; mech: 'ssh' } => {
  if (input.pubkey) {
    // pubkey input can be: value, .pub file path, or private key path
    if (input.pubkey.startsWith('ssh-') || input.pubkey.startsWith('age')) {
      // looks like a pubkey value — cannot derive private key
      throw new BadRequestError(
        'pubkey value provided but private key path required for init; pass path instead',
        { pubkey: `${input.pubkey.slice(0, 30)}...` },
      );
    }
    // treat as path — map a .pub path to its private-key sibling
    const prikeyPath = input.pubkey.endsWith('.pub')
      ? input.pubkey.replace(/\.pub$/, '')
      : input.pubkey;
    return {
      prikeyPath,
      pubkeyPath: `${prikeyPath}.pub`,
      mech: 'ssh',
    };
  }

  // find the default key in the shared precedence (owner → standard) — the FIRST
  // candidate whose private AND public key both exist. same order unlock's Variant A
  // uses, so init seals with the key unlock re-derives K from
  const candidatePaths = getAllSshKeyCandidatePaths({ owner: input.owner });
  for (const prikeyPath of candidatePaths) {
    const pubkeyPath = `${prikeyPath}.pub`;
    if (existsSync(prikeyPath) && existsSync(pubkeyPath))
      return { prikeyPath, pubkeyPath, mech: 'ssh' };
  }

  throw new BadRequestError(
    'no ed25519 key found; create one with: ssh-keygen -t ed25519',
    { searched: candidatePaths.join(', ') },
  );
};
