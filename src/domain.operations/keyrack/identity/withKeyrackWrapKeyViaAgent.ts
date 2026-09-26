import { assertGraphicalDialogAvailable } from '@src/infra/ssh/assertGraphicalDialogAvailable';
import type { KeyrackUnlockAttribution } from '@src/infra/ssh/asUnlockPromptMessage';
import { genEphemeralSshAgent } from '@src/infra/ssh/genEphemeralSshAgent';
import { setSshKeyIntoAgent } from '@src/infra/ssh/setSshKeyIntoAgent';
import { withAttributedAskpassDialog } from '@src/infra/ssh/withAttributedAskpassDialog';

import { asKeyrackUnlockChallenge } from './asKeyrackUnlockChallenge';
import { getOneAgentSignature } from './getOneAgentSignature';
import { getOneWrapKey } from './getOneWrapKey';

/**
 * .what = provide the sign-as-KDF wrap key to a callback, within the lifetime of
 *         a single ephemeral agent that is always torn down after
 * .why  = both sides of Variant A need the wrap key — init to wrap K, unlock to
 *         unwrap K — and both need the exact same one-shot agent lifecycle (spawn
 *         → native prompt → sign → derive → teardown). a HOF holds that lifecycle
 *         in ONE place, so no caller can leak an agent or drift the flow
 *
 * .note = the `with*` wrapper guarantees teardown even if `use` throws — the ssh
 *         key never outlives this call, so zero reuse holds by construction
 * .note = the prompt happens once here (via `getOneAskpassDialog` +
 *         `setSshKeyIntoAgent`), so each Variant A op prompts once per invocation
 * .note = a PASSPHRASED key on a headless session (no DISPLAY/WAYLAND_DISPLAY) is
 *         caught up front with its OWN distinct message, since the dialog cannot
 *         render there and a later ssh-add failure could not be told apart from a
 *         wrong/cancelled passphrase (vision edgecase: headless → fail fast with
 *         guidance). a passphrase-LESS key is spared — it loads with no dialog, so
 *         it unlocks fine headlessly (e.g. a ci Variant A key). the guard is also
 *         bypassed when a dialog mechanism is EXPLICITLY supplied — an injected
 *         `askpassCandidates` (how domain tests drive a stand-in dialog headlessly)
 *         or a `KEYRACK_ASKPASS` override (the operator/blackbox seam) — since
 *         those name a dialog that works without a display
 */
export const withKeyrackWrapKeyViaAgent = async <T>(
  input: {
    owner: string | null;
    keyPath: string;
    pubkeyPath: string;
    askpassCandidates?: string[];
    /**
     * .what = the CLI-computed prompt attribution (org/tree/env/reach/code), or null
     * .why  = when present, the native prompt renders the attributed dialog that
     *         also shows the visual-match code (rule.forbid.contextless-unlock-prompt);
     *         when null it falls to the plain off-tty dialog (headless/test paths
     *         that cannot compute it)
     */
    attribution?: KeyrackUnlockAttribution | null;
  },
  use: (wrapKey: Uint8Array) => Promise<T>,
): Promise<T> => {
  // fail fast on a headless box with distinct guidance — via the ONE shared guard
  // both unlock paths call, so the ed25519 and rsa/ecdsa gates cannot drift. a
  // dialog mechanism is "supplied" when injected candidates or KEYRACK_ASKPASS name
  // a dialog that runs without a display; the guard also spares a passphrase-less key
  const dialogSupplied =
    (input.askpassCandidates?.length ?? 0) > 0 || !!process.env.KEYRACK_ASKPASS;
  assertGraphicalDialogAvailable({
    owner: input.owner,
    keyPath: input.keyPath,
    dialogSupplied,
  });

  const agent = genEphemeralSshAgent({ owner: input.owner ?? 'default' });

  try {
    // build the full prompt scope from the site's own owner + key plus the
    // CLI-computed attribution; null attribution → the plain off-tty dialog
    const scope = input.attribution
      ? {
          owner: input.owner ?? '(default)',
          key: input.keyPath,
          ...input.attribution,
        }
      : null;

    // prompt for the passphrase via the attributed gnome dialog, load into the
    // agent. the shim wraps the real dialog so the human sees WHO/WHAT + the code
    const signature = await withAttributedAskpassDialog(
      { scope, candidates: input.askpassCandidates },
      async (dialog) => {
        await setSshKeyIntoAgent({
          sock: agent.sock,
          keyPath: input.keyPath,
          dialog,
        });

        // sign the per-owner challenge inside the dialog scope, so the shim lives
        // until the sign completes (the passphrase prompt happens during ssh-add)
        return getOneAgentSignature({
          sock: agent.sock,
          pubkeyPath: input.pubkeyPath,
          challenge: asKeyrackUnlockChallenge({ owner: input.owner }),
        });
      },
    );

    // derive the wrap key from the signature, hand it to the caller
    const wrapKey = getOneWrapKey({ signature });
    return await use(wrapKey);
  } finally {
    agent.teardown();
  }
};
