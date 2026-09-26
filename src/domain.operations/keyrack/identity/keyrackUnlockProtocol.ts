/**
 * .what = the versioned protocol token that domain-separates every keyrack
 *         sign-as-KDF string — both the challenge the agent signs and the HKDF
 *         info label the wrap key is derived under
 * .why  = the version (`v1`) was embedded independently in two places (the
 *         challenge builder and the wrap-key HKDF info). a protocol bump to one
 *         without the other would silently derive a DIFFERENT wrap key and orphan
 *         every extant manifest. one shared token makes a bump atomic — change it
 *         here and both strings move together (rule.require.solve-at-cause)
 *
 * .note = the concrete string value is load-critical: it is baked into every
 *         sealed manifest via the derived K. do NOT change this token without a
 *         migration — a new token re-derives a new K that cannot open old manifests
 */
export const KEYRACK_UNLOCK_PROTOCOL = 'keyrack-unlock-v1';
