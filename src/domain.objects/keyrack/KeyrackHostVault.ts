/**
 * .what = where credentials are stored on the host machine
 * .why = determines unlock requirements and security level
 *
 * variants:
 * - 'os.envvar': read from process.env, always unlocked, read-only
 * - 'os.direct': plaintext file storage, no unlock required
 * - 'os.secure': encrypted file storage via age, passphrase unlock
 * - 'os.daemon': in-memory daemon via unix socket, session-time cache
 * - '1password': 1password cli integration, op signin unlock
 * - 'aws.config': aws sso profile storage, browser auth unlock
 * - 'github.secrets': github actions secrets via gh cli, write-only
 *
 * .note = os.envvar is always checked first in grant flow (ci passthrough)
 * .note = os.daemon is used as session cache after unlock (replaces os.direct cache)
 * .note = aws.config stores only profile names (references), not secrets
 * .note = github.secrets is write-only; secrets cannot be retrieved via api
 */
export type KeyrackHostVault =
  | 'os.envvar'
  | 'os.direct'
  | 'os.secure'
  | 'os.daemon'
  | '1password'
  | 'aws.config'
  | 'github.secrets';
