import { BadRequestError } from 'helpful-errors';

import { asAgeCliAbsentMessage } from './asAgeCliAbsentMessage';
import { asFidoUnsupportedKeyMessage } from './asFidoUnsupportedKeyMessage';
import { isAgeCliAbsentError } from './isAgeCliAbsentError';
import { isFidoUnsupportedError } from './isFidoUnsupportedError';
import { sshPrikeyToAgeIdentity } from './sshPrikeyToAgeIdentity';

/**
 * .what = convert an ssh key path to an age identity, or report WHY it could not —
 *         a bare skip (fall-through) vs an actionable hint the caller may surface
 * .why  = asAgeIdentityOrNull collapses every EXPECTED conversion miss to null,
 *         which is right for DISCOVERY (skip an irrelevant key, try the next). but
 *         an EXPLICIT --prikey the human named deserves its specific, actionable
 *         reason (e.g. "passphrase-protected, install age") surfaced rather than
 *         degraded to a generic "no identity could decrypt" (errors-name-the-fix).
 *         this richer twin keeps the fall-through, but hands the hint back so the
 *         caller can surface it when — and only when — no other identity decrypts
 *
 * .note = allowlists ONLY BadRequestError — the EXPECTED "cannot convert
 *         in-process" caller-condition; any other error is a genuine fault and
 *         surfaces loud (rule.forbid.failhide). TWO expected misses carry an
 *         actionable fix, so their message is handed back as `hint`: the
 *         passphrase-protected non-ed25519 key (install age) and the FIDO/hardware
 *         key (swap to an ed25519 or passphrase-less key). every other expected
 *         miss is a bare skip (no fix to offer)
 */
export const asAgeIdentityResult = (input: {
  keyPath: string;
}): { identity: string } | { identity: null; hint: string | null } => {
  try {
    return { identity: sshPrikeyToAgeIdentity({ keyPath: input.keyPath }) };
  } catch (error) {
    if (error instanceof BadRequestError)
      return {
        identity: null,
        // two expected misses name an actionable fix, so their message is handed
        // back for an explicit --prikey to surface: the passphrase-protected
        // non-ed25519 key (install age) and the FIDO/hardware key (swap the key
        // type). every other expected miss (a bare non-ed25519 skip, a malformed
        // file, the passphrased-ed25519 native-dialog signal) is a bare skip — no
        // fix to offer. both predicates match a SHARED marker, never a raw literal,
        // so a message reword cannot silently degrade the hint
        // (rule.require.solve-at-cause, rule.require.errors-name-the-fix)
        //
        // the hint is rebuilt from the SAME pure message builder the error used,
        // NEVER `error.message`: HelpfulError bakes `BadRequestError: ` + the
        // metadata JSON into `.message`, so reuse of it made the outer ConstraintError
        // re-wrap (genContextKeyrack) render a doubled class + doubled context. the
        // pure builder yields the clean body, so the re-wrap shows one class + one
        // context (rule.forbid.snapshot-visual-blemishes). the builder inputs
        // (keyType / cipher) ride in the error metadata, put there by the same throw
        hint: isFidoUnsupportedError(error)
          ? asFidoUnsupportedKeyMessage({
              keyType: String(error.metadata?.keyType ?? ''),
            })
          : isAgeCliAbsentError(error)
            ? asAgeCliAbsentMessage({
                cipher: String(error.metadata?.cipher ?? ''),
              })
            : null,
      };
    throw error;
  }
};
