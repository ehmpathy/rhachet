/**
 * .what = the canonical standard ssh key filenames, in priority order
 * .why = the ONE source of truth for the default-key names — getAllSshKeyCandidatePaths
 *        consumes this, and init, unlock's Variant A, and discoverIdentities all consume
 *        that, so the owner→standard precedence can never drift between them
 *
 * .note = ed25519 first (modern, fast, secure)
 * .note = rsa second (legacy but common)
 * .note = ecdsa third (less common)
 */
export const SSH_KEY_CANDIDATES = ['id_ed25519', 'id_rsa', 'id_ecdsa'] as const;

/**
 * .what = the ssh key type, one of the standard candidate suffixes
 * .why = names the algorithm behind a default-key filename (id_ed25519 → ed25519)
 */
export type SshKeyType = 'ed25519' | 'rsa' | 'ecdsa';
