import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';
import type { BrainDirSettingsLayout } from '@src/domain.operations/actor/enrolled/setBrainDirSettingsLayout';
import type { BrainDirBootRender } from '@src/domain.operations/boot/BrainDirBootRender';
import type { BrainDirSyncSymlink } from '@src/domain.operations/boot/BrainDirLayoutOutcome';
import { BRAIN_DIR_BOOT_FILENAMES } from '@src/domain.operations/boot/constants';
import { setBrainDirBoot } from '@src/domain.operations/boot/setBrainDirBoot';
import { CLAUDE_SETTINGS_FILENAMES } from '@src/domain.operations/brains/claudeCodeSettings';
import { asTextWithLinesConverged } from '@src/infra/asTextWithLinesConverged';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { delStaleEnrollConfigs } from './delStaleEnrollConfigs';
import { genRepoActorGitignoreExclusion } from './genRepoActorGitignoreExclusion';
import { setRepoActorBrainDirLayout } from './setRepoActorBrainDirLayout';
import { setRepoActorDirFromLegacy } from './setRepoActorDirFromLegacy';

/**
 * .what = the brain dir `.gitignore` lines: ignore all, then re-include the boot doors and
 *         the four settings names — `settings.json`, `settings.of.repo.json`,
 *         `settings.of.grove.json`, `settings.local.json`
 * .why = an allowlist, because the dir is also a clone's `CLAUDE_CONFIG_DIR`: claude writes
 *        its own runtime state here (`.claude.json`, `projects/`, the credential link), and
 *        none of it, nor the rendered `boot.md`, belongs in git
 * .note = the repo actor commits the settings names (the wisher's call, 2026-09-29); it is the
 *         one actor dir git sees, since every other sits under the ignored `.agent/.actors/`
 * .note = order matters: `/*` precedes each `!` re-include
 */
const BRAIN_DIR_GITIGNORE_LINES = [
  '/*',
  '!/.gitignore',
  `!/${BRAIN_DIR_BOOT_FILENAMES.agentsMd}`,
  `!/${BRAIN_DIR_BOOT_FILENAMES.claudeMd}`,
  `!/${CLAUDE_SETTINGS_FILENAMES.claude}`,
  `!/${CLAUDE_SETTINGS_FILENAMES.repo}`,
  `!/${CLAUDE_SETTINGS_FILENAMES.grove}`,
  `!/${CLAUDE_SETTINGS_FILENAMES.local}`,
];

/**
 * .what = brain dir `.gitignore` lines a prior release wrote, now retired
 * .why = the findsert only appends, so a retired line must be dropped on purpose, or a
 *        prior brain dir would keep a tracked file out of git forever. the allowlist
 *        subsumes each of them
 */
const BRAIN_DIR_GITIGNORE_LINES_RETIRED = [
  BRAIN_DIR_BOOT_FILENAMES.bootMd,
  '*.local.json',
  CLAUDE_SETTINGS_FILENAMES.claude,
  CLAUDE_SETTINGS_FILENAMES.repo,
  CLAUDE_SETTINGS_FILENAMES.grove,
  '*.forked.*.json',
];

/**
 * .what = render the ambient roles into the repo actor's brain dir, link `<repo>/.claude`
 *         to it, and make both `.gitignore` edits (D10)
 * .why = the repo actor holds the ambient roles (`term=ambient`); `<repo>/.claude` is only
 *        a reach path into its brain dir
 *
 * .note = a legacy repo actor dir (`actor.via.slug=.default`) moves to its current name
 *         first, so its tracked brain config carries over
 * .note = the render runs next, and a render that throws propagates: no link is made here,
 *         so a failed render leaves `<repo>/.claude` as this op found it
 * .note = `rhx init --roles` and `rhx upgrade` run the layout (`setRepoActorBrainDirLayout`)
 *         before the role inits, so there the link and the layout precede the render, and
 *         this op meets them already in place (`inventory.of=requirements.case=8`)
 */
export const setRepoActorBrainDir = async (input: {
  repoPath: string;
  refsLinked: RoleLinkRef[];
}): Promise<{
  render: BrainDirBootRender;
  symlink: BrainDirSyncSymlink;
  settings: BrainDirSettingsLayout;
  excludesDropped: string[];
  enrollConfigs: Awaited<ReturnType<typeof delStaleEnrollConfigs>>;
}> => {
  // carry a legacy repo actor dir over to its current name, before any write
  setRepoActorDirFromLegacy({ repoPath: input.repoPath });

  // the parent tree exists before any write
  const repoActorBrainDir = getBrainOndiskDir({
    actorDir: getOneRepoActorOndiskDir({ repoPath: input.repoPath }),
  });
  mkdirSync(repoActorBrainDir, { recursive: true });

  // render the corpus; a throw here stops the sync before the link
  const render = await setBrainDirBoot({
    brainDir: repoActorBrainDir,
    roles: input.refsLinked,
    repoPath: input.repoPath,
    scope: { kind: 'repo' },
  });

  // link <repo>/.claude to the rendered dir, and findsert the settings layout: the grove
  //   arrows and settings.of.repo.json; a real file at an arrow name is replaced, never merged
  const { symlink, settings, excludesDropped } =
    await setRepoActorBrainDirLayout({
      repoPath: input.repoPath,
    });

  // drop each retired per-enroll config whose actor has no clone left
  const enrollConfigs = await delStaleEnrollConfigs({
    repoPath: input.repoPath,
  });

  // track only the boot doors and the settings names, keep all else out of git, and
  //   spare the repo actor dir from the actors ignore
  // .note = this `.gitignore` is about what git sees, not the layout: only the repo actor's
  //   brain dir is tracked, and every other actor dir is ignored whole by the actors ignore
  //   (`rule.forbid.brain-dir-layout-divergence`, "git differs")
  await setBrainDirGitignore({
    repoPath: input.repoPath,
    brainDir: repoActorBrainDir,
  });
  await genRepoActorGitignoreExclusion({ repoPath: input.repoPath });

  return { render, symlink, settings, excludesDropped, enrollConfigs };
};

/**
 * .what = converge the brain dir `.gitignore` to the allowlist, in one write
 * .note = the file is written only when its content changes
 * .note = the read and the write hold the file's mutex, so a peer `rhx init` cannot drop a
 *   line this one converged
 */
const setBrainDirGitignore = async (input: {
  repoPath: string;
  brainDir: string;
}): Promise<void> => {
  const path = join(input.brainDir, '.gitignore');
  await withRepoMutex({ repoPath: input.repoPath, path }, async () => {
    const contentBefore = existsSync(path) ? readFileSync(path, 'utf8') : null;
    const contentAfter = asTextWithLinesConverged({
      content: contentBefore,
      linesAbsent: BRAIN_DIR_GITIGNORE_LINES_RETIRED,
      linesPresent: BRAIN_DIR_GITIGNORE_LINES,
    });
    if (contentAfter !== contentBefore)
      setFileAtomic({ path, content: contentAfter });
  });
};
