import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';
import { setBrainDirSettingsLayout } from '@src/domain.operations/actor/enrolled/setBrainDirSettingsLayout';
import { getHomeDir } from '@src/infra/getHomeDir';
import { isCodeDefectError } from '@src/utils/isCodeDefectError';

import { mkdirSync } from 'node:fs';
import { setRepoActorDirFromLegacy } from './setRepoActorDirFromLegacy';
import { setRepoBrainDirSymlink } from './setRepoBrainDirSymlink';

/**
 * .what = put the repo actor's brain dir in the split layout: move a legacy repo actor dir,
 *         link `<repo>/.claude` to the brain dir, and findsert the settings layout
 * .why = a role init writes through `<repo>/.claude` (e.g. a permission hook that adds its
 *        allows to `settings.of.repo.json`). run before the role inits, so each init meets the
 *        layout it will live in, and the next layout findsert replaces naught it wrote
 *        (`inventory.of=requirements.case=8`)
 *
 * .note = it renders no boot: the boot is derived from the linked roles, so it renders after
 *   the inits, in `setRepoActorBrainDir`, which calls this same op again (a no-op by then)
 * .note = each step is idempotent, so a repo already in the layout sees no effect
 */
export const setRepoActorBrainDirLayout = async (input: {
  repoPath: string;
}): Promise<{
  repoActorBrainDir: string;
  symlink: Awaited<ReturnType<typeof setRepoBrainDirSymlink>>;
  settings: Awaited<ReturnType<typeof setBrainDirSettingsLayout>>;
}> => {
  // carry a legacy repo actor dir over to its current name, before any write
  setRepoActorDirFromLegacy({ repoPath: input.repoPath });

  // the parent tree exists before any write
  const repoActorBrainDir = getBrainOndiskDir({
    actorDir: getOneRepoActorOndiskDir({ repoPath: input.repoPath }),
  });
  mkdirSync(repoActorBrainDir, { recursive: true });

  // link <repo>/.claude to the brain dir; a real dir migrates into it
  const symlink = await setRepoBrainDirSymlink({
    repoPath: input.repoPath,
    repoActorBrainDir,
  });

  // findsert the settings layout: the grove arrows and settings.of.repo.json; a real file at
  //   an arrow name (a legacy dir, or a role init that wrote claude's name) is replaced
  const settings = await setBrainDirSettingsLayout({
    repoPath: input.repoPath,
    brainDir: repoActorBrainDir,
    home: getHomeDir(),
  });

  return { repoActorBrainDir, symlink, settings };
};

/**
 * .what = the layout step a command runs before its role inits; null when it faulted
 * .why = a fault here must not block the role links. the boot sync after the inits re-runs
 *   these same steps and reports the fault there, as a repo-scope failure with its exit code,
 *   so the fault is deferred to the step that owns its report, never hidden
 * .note = a code defect surfaces loud at once (`isCodeDefectError`)
 */
export const setRepoActorBrainDirLayoutBeforeInits = async (input: {
  repoPath: string;
}): Promise<Awaited<ReturnType<typeof setRepoActorBrainDirLayout>> | null> => {
  try {
    return await setRepoActorBrainDirLayout(input);
  } catch (error) {
    if (isCodeDefectError({ error })) throw error;
    return null;
  }
};
