/**
 * .what = security posture of a credential
 * .why = enables grade enforcement and degradation prevention
 *
 * protection:
 * - 'encrypted': stored in encrypted vault (os.secure, 1password, os.daemon)
 * - 'plaintext': stored in plaintext (os.direct)
 *
 * duration:
 * - 'permanent': lives indefinitely (api keys, private keys)
 * - 'ephemeral': lives for bounded time (sso sessions, app tokens)
 * - 'transient': lives only in memory, never persisted (daemon cache)
 */
export interface KeyrackKeyGrade {
  protection: 'encrypted' | 'plaintext';
  duration: 'permanent' | 'ephemeral' | 'transient';
}
