/**
 * .what = is this openssh key-type token a FIDO/hardware-token (`sk-`) key?
 * .why  = a FIDO key type (`sk-ssh-ed25519@openssh.com`,
 *         `sk-ecdsa-sha2-nistp256@openssh.com`) keeps its private half on the
 *         hardware token, so it can be NEITHER stripped by `ssh-keygen -p` (there is
 *         no on-disk secret to re-encrypt) NOR fed to `age -d -i`, NOR used for the
 *         deterministic sign-as-KDF derive (a FIDO signature carries a hardware
 *         nonce, so it is non-deterministic — vision q4 excludes it). a `sk-` prefix
 *         check lets the router send it to a clean fallback message rather than let
 *         it fall through into a path that would hang or fail with a raw error
 *
 * .note = openssh prefixes every hardware-token key type with `sk-` (security key);
 *         that single prefix covers both the ed25519 and ecdsa FIDO variants
 */
export const isFidoSshKeyType = (input: { keyType: string }): boolean =>
  input.keyType.startsWith('sk-');
