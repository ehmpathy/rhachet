import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';
import {
  type BrainDirSettingsLayout,
  setBrainDirSettingsLayout,
} from '@src/domain.operations/actor/enrolled/setBrainDirSettingsLayout';
import { asBrainDirLayoutReportLines } from '@src/domain.operations/boot/asBrainDirLayoutReportLines';
import type { BrainDirSyncSymlink } from '@src/domain.operations/boot/BrainDirLayoutOutcome';
import { getHomeDir } from '@src/infra/getHomeDir';
import { isCodeDefectError } from '@src/utils/isCodeDefectError';

import { mkdirSync } from 'node:fs';
import { relative } from 'node:path';
import { asSettingsReplacedOfLayout } from './asSettingsReplacedOfLayout';
import { setRepoActorClaudeMdExcludes } from './setRepoActorClaudeMdExcludes';
import { setRepoActorDirFromLegacy } from './setRepoActorDirFromLegacy';
import { setRepoBrainDirSymlink } from './setRepoBrainDirSymlink';

/**
 * .what = what the layout steps did to the repo actor's brain dir
 */
type RepoActorBrainDirLayout = {
  repoActorBrainDir: string;
  symlink: BrainDirSyncSymlink;
  settings: BrainDirSettingsLayout;
};

/**
 * .what = put the repo actor's brain dir in the split layout: move a legacy repo actor dir,
 *         link `<repo>/.claude` to the brain dir, findsert the settings layout, and findsert
 *         the repo actor's `claudeMdExcludes`
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
}): Promise<RepoActorBrainDirLayout & { excludesDropped: string[] }> => {
  const layout = await setRepoActorBrainDirArrows(input);
  const { excludesDropped } = await setRepoActorClaudeMdExcludes({
    repoPath: input.repoPath,
    repoActorBrainDir: layout.repoActorBrainDir,
  });
  return { ...layout, excludesDropped };
};

/**
 * .what = the link and the settings arrows, without the excludes
 * .why = the excludes write is a peer step: a fault there must not lose what the arrows did
 */
const setRepoActorBrainDirArrows = async (input: {
  repoPath: string;
}): Promise<RepoActorBrainDirLayout> => {
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
 * .what = the layout step a command runs before its role inits; null when the arrows faulted
 * .why = a fault here must not block the role links. the boot sync after the inits re-runs
 *   these same steps and reports the fault there, as a repo-scope failure with its exit code,
 *   so the fault is deferred to the step that owns its report, never hidden
 * .note = the excludes run as their own step: a fault there is deferred the same way, and the
 *   arrows' outcome is still returned, so a file they replaced is still reported
 * .note = a code defect surfaces loud at once (`isCodeDefectError`)
 * .note = it prints what the arrows and the excludes did — what moved, what was dropped, the
 *   link, each real settings file taken back, and each hand exclude the derived list dropped —
 *   the moment they land. a report deferred to the boot sync would
 *   be lost to any abort before it (a role init that throws, a cli below the floor, a render
 *   that fails), and the human's grants would be gone in silence. the sync then finds the
 *   layout in place and names naught twice
 */
export const setRepoActorBrainDirLayoutBeforeInits = async (input: {
  repoPath: string;
}): Promise<(RepoActorBrainDirLayout & { isReported: boolean }) | null> => {
  const layout = await asNullOnFault(() => setRepoActorBrainDirArrows(input));
  if (layout === null) return null;

  // the excludes, a peer step: a fault there never loses what the arrows did.
  //   a code defect is held, not thrown, until the arrows are named below
  const excludes = await asNullOnFault(() =>
    setRepoActorClaudeMdExcludes({
      repoPath: input.repoPath,
      repoActorBrainDir: layout.repoActorBrainDir,
    }),
  ).then(
    (outcome) => ({
      excludesDropped: outcome?.excludesDropped ?? [],
      defect: null,
    }),
    (defect: unknown) => ({ excludesDropped: [], defect }),
  );

  // name what the arrows and the excludes did, before any later step can abort
  //   .note = one line per call, and no blank after: the caller's next block opens with its own
  const lines = asBrainDirLayoutReportLines({
    symlink: layout.symlink,
    settingsReplaced: asSettingsReplacedOfLayout({ settings: layout.settings }),
    excludesDropped: excludes.excludesDropped,
    repoActorBrainDirRel: relative(input.repoPath, layout.repoActorBrainDir),
  });
  lines.forEach((line) => console.log(line));

  // a code defect in the excludes surfaces loud, now that the arrows are named
  if (excludes.defect !== null) throw excludes.defect;
  return { ...layout, isReported: lines.length > 0 };
};

/**
 * .what = the result of a step, or null when it faulted with aught but a code defect
 */
const asNullOnFault = async <T>(step: () => Promise<T>): Promise<T | null> => {
  try {
    return await step();
  } catch (error) {
    if (isCodeDefectError({ error })) throw error;
    return null;
  }
};
