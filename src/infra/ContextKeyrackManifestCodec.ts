import type { KeyrackHostManifest } from '@src/domain.objects/keyrack';
import type { KeyrackUnlockAttribution } from '@src/infra/ssh/asUnlockPromptMessage';

/**
 * .what = the narrow slice of ContextKeyrack the manifest codec (decrypt + path)
 *         needs: identity resolution to decrypt, and the hostManifest slot it
 *         populates after a successful read
 * .why = daoKeyrackHostManifest sits in access/, the lowest layer
 *        (rule.require.directional-deps): it must never import the full
 *        ContextKeyrack type from domain.operations/keyrack (an upward import).
 *        structural typing lets the dao depend on this narrow infra-owned shape
 *        instead -- the real ContextKeyrack (a superset, declared to extend this)
 *        satisfies it at every call site with no cast
 *
 * .note = only the two members the dao actually touches: identity resolution (to
 *         decrypt) and the hostManifest slot (set after decrypt). NOT a wholesale
 *         relocation of ContextKeyrack -- that type stays in domain.operations/keyrack,
 *         used pervasively for vaultAdapters, repoManifest, gitroot, and more, none
 *         of which the dao needs
 */
export interface ContextKeyrackManifestCodec {
  identity: {
    getOne: (input: { for: 'manifest' }) => Promise<string | null>;
    getAll: {
      discovered: () => Promise<string[]>;
      prescribed: string[];
    };
  };
  hostManifest?: KeyrackHostManifest;
  /**
   * .what = the CLI-computed prompt attribution (org/tree/env/reach/code), or null
   * .why = the legacy-manifest strip path (decryptWithAgeCLI) pops the SAME gnome
   *        dialog as the sign path, so it must show WHO/WHAT + the visual-match code
   *        (rule.forbid.contextless-unlock-prompt); the dao reads it off context and
   *        threads it into the decrypt. null when a non-cli caller cannot compute it
   */
  promptAttribution?: KeyrackUnlockAttribution | null;
}
