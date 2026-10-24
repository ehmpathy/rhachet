import type { RoleDelta } from '@src/domain.objects/RoleDelta';
import { getRepoAmbientRoleFociPath } from '@src/domain.operations/actor/enrolled/getRepoAmbientRoleFociPath';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { statSync } from 'node:fs';
import { asRepoAmbientRoleFociNext } from './asRepoAmbientRoleFociNext';
import { getRepoAmbientRoleFoci } from './getRepoAmbientRoleFoci';
import { isRoleFociRecordWriteNeeded } from './isRoleFociRecordWriteNeeded';

/**
 * .what = apply an `rhx init --roles` delta to the ambient role foci record
 * .why = the repo actor's render reads the focus from this record, and a link alone cannot
 *        carry one (a link is a whole role dir)
 *
 * .note = idempotent: the file is written only when its content changes, and never created
 *         to hold an empty record
 * .note = the read and the write hold the file's mutex, so a peer init cannot drop a focus
 */
export const setRepoAmbientRoleFoci = async (input: {
  repoPath: string;
  deltas: RoleDelta[];
}): Promise<{
  foci: Record<string, string[]>;
  fociPrior: Record<string, string[]>;
}> => {
  const path = getRepoAmbientRoleFociPath({ repoPath: input.repoPath });
  return withRepoMutex({ repoPath: input.repoPath, path }, async () => {
    const fociPrior = getRepoAmbientRoleFoci({ repoPath: input.repoPath });
    const foci = asRepoAmbientRoleFociNext({ fociPrior, deltas: input.deltas });

    // write only on change; an empty record needs no file
    const isFileExtant = !!statSync(path, { throwIfNoEntry: false });
    if (isRoleFociRecordWriteNeeded({ fociPrior, foci, isFileExtant }))
      setFileAtomic({ path, content: `${JSON.stringify(foci, null, 2)}\n` });
    return { foci, fociPrior };
  });
};
