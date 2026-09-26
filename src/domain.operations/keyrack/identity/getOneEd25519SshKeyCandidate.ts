import { getAllSshKeyCandidatePaths } from '@src/infra/ssh/getAllSshKeyCandidatePaths';
import { getOneSshPubkey } from '@src/infra/ssh/getOneSshPubkey';

import { existsSync } from 'node:fs';
import { isEd25519Pubkey } from './isEd25519Pubkey';

/**
 * .what = pick the ed25519 ssh key (prikey + pubkey path) to sign/seal Variant A
 *         with, searched across ALL candidates in the shared precedence, or null
 *         when none fits (none present, or only a wrong-type rsa/ecdsa key)
 * .why = the derive-not-store wrap key needs a deterministic ed25519 signature, so
 *        the Variant A sign AND the legacy-manifest migration must both pick THE
 *        SAME ed25519 key — searched with the SAME filter across the SAME candidate
 *        precedence (owner → prescribed → standard). one shared picker is the only
 *        way to guarantee that: a hand-rolled "first present candidate of any type"
 *        loop grabs the owner key even when it is rsa/ecdsa, fails the ed25519 check
 *        on THAT one candidate, and stops — never reaching the ed25519 key further
 *        down the list. under migration that surfaced as a silent, permanent
 *        `migrated: false` (rule.require.solve-at-cause; the same drift class
 *        getAllSshKeyCandidatePaths exists to prevent, one layer up)
 *
 * .note = the search skips a candidate that lacks EITHER the prikey (needed to sign)
 *         or the pubkey (needed for isEd25519Pubkey), so only a real key with both is
 *         returned. it keeps searching past a wrong-type key rather than stop on it —
 *         that multi-candidate search is exactly what the weaker hand-rolled loops
 *         lacked
 * .note = isEd25519Pubkey is a pure check, so only a genuine read fault can throw —
 *         let it surface loud rather than skip silently (rule.forbid.failhide)
 */
export const getOneEd25519SshKeyCandidate = (input: {
  owner: string | null;
  prescribed?: string[];
}): { keyPath: string; pubkeyPath: string } | null => {
  // the first ed25519 candidate wins, in the shared precedence order (owner →
  // prescribed → standard) that getAllSshKeyCandidatePaths defines — the SAME
  // precedence init seals with, so unlock/migrate re-derive K with the key that sealed it
  for (const keyPath of getAllSshKeyCandidatePaths({
    owner: input.owner,
    prescribed: input.prescribed,
  })) {
    // the sign needs the prikey; isEd25519Pubkey needs the pubkey — skip a candidate
    // that lacks either, so only a real key with both is signed with
    const pubkeyPath = `${keyPath}.pub`;
    if (!existsSync(keyPath) || !existsSync(pubkeyPath)) continue;

    // keep searching past a wrong-type (rsa/ecdsa) key, so the ed25519 key further
    // down the precedence is still found — the exact multi-candidate search the
    // hand-rolled migration/init loops lacked
    const pubkey = getOneSshPubkey({ keyPath });
    if (isEd25519Pubkey({ pubkey })) return { keyPath, pubkeyPath };
  }

  // no ed25519 key fit — a null fall-through (the caller surfaces the no-identity fix)
  return null;
};
