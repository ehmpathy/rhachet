/**
 * .what = marker prefix for an ssh-key-path identity
 * .why = distinguishes an ssh key path from an age identity string — a cross-layer
 *        protocol marker between infra/ssh (which mints it) and the keyrack age
 *        adapter (which reads it), so it lives in its own small home owned by
 *        neither concern
 *
 * .note = when an identity starts with this, decryptWithIdentity shells out to the
 *         age CLI with the key path that follows
 */
export const SSH_KEY_PATH_MARKER = 'SSH_KEY_PATH:';
