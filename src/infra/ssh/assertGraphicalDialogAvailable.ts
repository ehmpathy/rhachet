import { ConstraintError } from 'helpful-errors';

import { readFileSync } from 'node:fs';
import { asHeadlessSessionMessage } from './asHeadlessSessionMessage';
import { isGraphicalSessionPresent } from './isGraphicalSessionPresent';
import { isSshKeyPassphrased } from './isSshKeyPassphrased';

/**
 * .what = fail fast on a headless box when a passphrased key would need the gnome
 *         dialog but no display (and no supplied dialog) can render it
 * .why  = the vision calls for the SAME headless fail-fast on BOTH unlock paths —
 *         the ed25519 sign-as-kdf path (withKeyrackWrapKeyViaAgent) and the
 *         rsa/ecdsa age-cli-strip path (ageRecipientCrypto). each had hand-inlined
 *         this guard and the two DRIFTED: the rsa/ecdsa copy hardcoded owner=null,
 *         so its headless message could never name the correct `--owner` retry flag.
 *         one shared guard makes that drift impossible — both paths get identical
 *         logic AND thread the real owner into the message
 *
 * .note = the passphrase check reads the key LAZILY — only when no dialog is
 *         supplied and no display is present — so the common (has-display) path pays
 *         no read. a supplied dialog (injected candidates or KEYRACK_ASKPASS) runs
 *         without a display, so it short-circuits before the read
 * .note = a passphrase-LESS key loads with no dialog at all, so headless is fine for
 *         it — only a passphrased key with no dialog and no display truly cannot prompt
 */
export const assertGraphicalDialogAvailable = (input: {
  owner: string | null;
  keyPath: string;
  dialogSupplied: boolean;
}): void => {
  // a supplied dialog runs headless (no display needed) → no guard
  if (input.dialogSupplied) return;

  // a display can render the dialog → no guard
  if (isGraphicalSessionPresent()) return;

  // headless: only a PASSPHRASED key cannot prompt (a passphrase-less key loads with
  // no dialog). read lazily, only now that we know a dialog would otherwise be needed
  const keyPassphrased = isSshKeyPassphrased({
    keyContent: readFileSync(input.keyPath, 'utf8'),
  });
  if (keyPassphrased)
    throw new ConstraintError(
      asHeadlessSessionMessage({ owner: input.owner }),
      {
        keyPath: input.keyPath,
      },
    );
};
