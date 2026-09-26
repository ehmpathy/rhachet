/**
 * .what = extract the key-type token (e.g. `ssh-ed25519`, `ssh-rsa`,
 *         `sk-ssh-ed25519@openssh.com`) from an openssh public key line
 * .why = the pubkey-side twin of asSshKeyTypeFromPrikey. one shared read of the
 *        `<type> <base64> <comment>` pubkey shape, so the ed25519 check and the
 *        FIDO check classify off ONE parse — not two independent inline splits
 *        that can drift (the drift class behind both the ed25519-search bug and
 *        the FIDO-at-init self-brick)
 *
 * .note = returns the RAW openssh token, symmetric with asSshKeyTypeFromPrikey —
 *         so downstream prefix checks (isEd25519Pubkey `=== 'ssh-ed25519'`,
 *         isFidoSshKeyType `startsWith('sk-')`) read the same token shape from
 *         either the prikey buffer or the pubkey line
 */
export const asSshKeyTypeFromPubkey = (input: { pubkey: string }): string =>
  input.pubkey.trimStart().split(/\s+/)[0] ?? '';
