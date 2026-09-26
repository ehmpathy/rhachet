import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  asUnlockPromptMessage,
  type KeyrackUnlockScope,
} from './asUnlockPromptMessage';
import { genAskpassShim } from './genAskpassShim';
import { getOneAskpassDialog } from './getOneAskpassDialog';

/**
 * .what = pick the askpass dialog to hand an ssh tool, wrapped in the attributed
 *         shim when a scope is present, then run a callback with that dialog path
 * .why  = both prompt sites (the sign path via ssh-add, the strip path via
 *         ssh-keygen -p) must show WHO/WHAT the human authorizes plus the
 *         visual-match code — never a bare `Enter passphrase for …:`
 *         (rule.forbid.contextless-unlock-prompt). one seam keeps that wrap in a
 *         single place, so neither prompt site can drift back to the raw dialog
 *
 * .note = a null scope → the raw dialog, unwrapped. a headless or test path that
 *         cannot compute a scope still gets the mandated off-tty dialog (vision q2);
 *         attribution layers on top when the scope is known, never gates the prompt
 * .note = the KEYRACK_ASKPASS override still names the REAL dialog (via
 *         getOneAskpassDialog); the shim WRAPS it, so a custom dialog is honored AND
 *         attributed (rule.forbid.contextless-unlock-prompt `.how`)
 * .note = the shim + its prompt file live in a private 0700 dir reaped in a guarded
 *         finally. no SECRET ever lands there — the passphrase flows dialog → ssh
 *         tool, never through the shim — so a plain sync mkdtemp + guarded rm is
 *         enough (unlike the decrypted-key dir, no secret is stranded on abrupt stop)
 */
export const withAttributedAskpassDialog = async <T>(
  input: {
    scope: KeyrackUnlockScope | null;
    candidates?: string[];
  },
  use: (dialog: string) => Promise<T>,
): Promise<T> => {
  // the real dialog (KEYRACK_ASKPASS override, or auto-detected gnome dialog)
  const realDialog = getOneAskpassDialog({ candidates: input.candidates });

  // no scope → hand back the raw dialog; attribution is additive, never a gate
  if (!input.scope) return use(realDialog);

  // a private 0700 dir for this one invocation's shim + prompt file
  const dir = mkdtempSync(join(tmpdir(), 'keyrack-askpass-'));
  try {
    const message = asUnlockPromptMessage({ scope: input.scope });
    const shim = genAskpassShim({ dialog: realDialog, message, intoDir: dir });
    return await use(shim);
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore cleanup faults — the callback's own result/error is what matters
      // (rule.forbid.failhide); rmSync(force) already ignores an absent dir
    }
  }
};
