import type { RoleDelta } from '@src/domain.objects/RoleDelta';
import { BrainDirOutsideRepoError } from '@src/domain.operations/actor/enrolled/BrainDirOutsideRepoError';
import { getOneBrainDirLandsAtOutsideRepoOrNull } from '@src/domain.operations/actor/enrolled/getOneBrainDirLandsAtOutsideRepoOrNull';
import { getRepoAmbientRoleFociPath } from '@src/domain.operations/actor/enrolled/getRepoAmbientRoleFociPath';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { statSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { asRepoAmbientRoleFociNext } from './asRepoAmbientRoleFociNext';
import { getRepoAmbientRoleFoci } from './getRepoAmbientRoleFoci';
import { isRoleFociRecordWriteNeeded } from './isRoleFociRecordWriteNeeded';

/**
 * .what = the foci record's next content, and whether the file must be written to hold it
 * .why = the guard and the guarded write ask the same question, so one reader answers both
 */
const getOneRoleFociPlan = (input: {
  repoPath: string;
  path: string;
  deltas: RoleDelta[];
}): {
  foci: Record<string, string[]>;
  fociPrior: Record<string, string[]>;
  isWriteNeeded: boolean;
} => {
  const fociPrior = getRepoAmbientRoleFoci({ repoPath: input.repoPath });
  const foci = asRepoAmbientRoleFociNext({ fociPrior, deltas: input.deltas });
  const isFileExtant = !!statSync(input.path, { throwIfNoEntry: false });
  return {
    foci,
    fociPrior,
    isWriteNeeded: isRoleFociRecordWriteNeeded({
      fociPrior,
      foci,
      isFileExtant,
    }),
  };
};

/**
 * .what = apply an `rhx init --roles` delta to the ambient role foci record
 * .why = the repo actor's render reads the focus from this record, and a link alone cannot
 *        carry one (a link is a whole role dir)
 *
 * .note = idempotent: the file is written only when its content changes, and never created
 *         to hold an empty record
 * .note = the read and the write hold the file's mutex, so a peer init cannot drop a focus
 * .note = the repo actor dir is checked before the mutex: the mutex store lives in the actors
 *         root, so a dir that lands outside the repo would take the lock outside it too. there,
 *         a delta that changes no record returns as is, and one that would write refuses as a
 *         BrainDirOutsideRepoError, which init reads as a skip
 */
export const setRepoAmbientRoleFoci = async (input: {
  repoPath: string;
  deltas: RoleDelta[];
}): Promise<{
  foci: Record<string, string[]>;
  fociPrior: Record<string, string[]>;
}> => {
  const path = getRepoAmbientRoleFociPath({ repoPath: input.repoPath });

  // never lock nor write where the repo actor dir lands outside the repo
  const landsAt = getOneBrainDirLandsAtOutsideRepoOrNull({
    repoPath: input.repoPath,
    brainDir: dirname(path),
  });
  if (landsAt) {
    const plan = getOneRoleFociPlan({ ...input, path });
    if (!plan.isWriteNeeded)
      return { foci: plan.foci, fociPrior: plan.fociPrior };
    throw new BrainDirOutsideRepoError('refused a write outside the repo', {
      path: relative(input.repoPath, dirname(path)),
      landsAt,
      effect: 'the role focus this run named was not recorded',
      hint: 'point that dir, or the link above it, back inside the repo, then rerun `rhx init --roles`',
    });
  }

  // read and write under the file's mutex; write only on change
  return withRepoMutex({ repoPath: input.repoPath, path }, async () => {
    const plan = getOneRoleFociPlan({ ...input, path });
    if (plan.isWriteNeeded)
      setFileAtomic({
        path,
        content: `${JSON.stringify(plan.foci, null, 2)}\n`,
      });
    return { foci: plan.foci, fociPrior: plan.fociPrior };
  });
};
