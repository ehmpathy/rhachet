import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import type { KeyrackHostManifest } from '@src/domain.objects/keyrack';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { reKeyOsSecureCredentialsToRecipients } from '@src/domain.operations/keyrack/reKeyOsSecureCredentialsToRecipients';
import { withKeyrackHostFilesSnapshot } from '@src/domain.operations/keyrack/withKeyrackHostFilesSnapshot';

/**
 * .what = persist a host-manifest recipient change as one atomic, no-desync operation:
 *         snapshot the manifest + every os.secure blob, re-key each blob to the new
 *         recipient set, then re-seal the manifest LAST as the completion marker
 * .why = the os.secure invariant (rule.require.os-secure-seals-to-host-manifest) means
 *        os.secure blobs seal to the SAME recipients as the manifest, so any recipient
 *        change MUST re-key every blob in the same operation — else a recipient could
 *        open the manifest but not the credentials beside it (an incomplete grant). this
 *        exact snapshot → rekey → persist sequence was copy-pasted at three call sites
 *        (migrate, recipient set, recipient del); it is the one shared choke point so the
 *        invariant is honored uniformly and a fourth caller cannot hand-roll a divergent copy
 *
 * .note = the re-key runs FIRST and the manifest re-seal LAST, so a mid-flow failure
 *         restores the snapshot (or a re-run recovers): the manifest write is the marker
 *         that the whole set is on the new recipients
 * .note = the new recipient set is read from `manifestAfter.recipients` — the blobs seal to
 *         EXACTLY the recipients the persisted manifest declares, by construction
 */
export const setKeyrackManifestRecipientsSealed = async (
  input: {
    owner: string | null;
    /**
     * .what = the CURRENT manifest, still sealed to the old recipients
     * .why = it is the snapshot source AND the decrypt context for the current os.secure
     *        blobs (they are sealed to its recipients / identity), read before the change
     */
    manifestBefore: KeyrackHostManifest;
    /**
     * .what = the NEW manifest to persist, sealed to the new recipient set
     * .why = its `.recipients` is the seal target every os.secure blob is re-keyed to, and
     *        the manifest itself is written last as the completion marker
     */
    manifestAfter: KeyrackHostManifest;
  },
  context: ContextKeyrack,
): Promise<void> => {
  const { owner, manifestBefore, manifestAfter } = input;

  await withKeyrackHostFilesSnapshot(
    { owner, manifest: manifestBefore },
    async () => {
      await reKeyOsSecureCredentialsToRecipients(
        {
          owner,
          manifest: manifestBefore,
          recipients: manifestAfter.recipients,
        },
        context,
      );
      await daoKeyrackHostManifest.set({ upsert: manifestAfter });
    },
  );
};
