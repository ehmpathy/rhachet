/**
 * .what = security posture of a credential
 * .why = enables grade enforcement and degradation prevention
 *
 * protection:
 * - 'reference': only a reference stored, no secret touches keyrack (aws.iam.sso)
 * - 'encrypted': stored in encrypted vault (os.secure, 1password, os.daemon)
 * - 'plaintext': stored in plaintext (os.direct)
 *
 * duration:
 * - 'permanent': lives indefinitely (api keys, private keys)
 * - 'ephemeral': lives for bounded time (sso sessions, app tokens)
 * - 'transient': lives only in memory, never persisted (daemon cache)
 *
 * .note = protection hierarchy: reference (0) > encrypted (1) > plaintext (2)
 * .note = lower rank = more secure; degradation to higher rank is blocked
 */
export interface KeyrackKeyGrade {
  protection: 'reference' | 'encrypted' | 'plaintext';
  duration: 'permanent' | 'ephemeral' | 'transient';
}
