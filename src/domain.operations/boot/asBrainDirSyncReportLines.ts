import { asBrainDirBootScopeLabel } from './asBrainDirBootScopeLabel';
import {
  asBrainDirLayoutReportGroups,
  type BrainDirReportGroup,
} from './asBrainDirLayoutReportGroups';
import { asBrainDirReportGroupLines } from './asBrainDirReportGroupLines';
import type { BrainDirBootRender } from './BrainDirBootRender';
import type {
  BrainDirSyncSettingsReplaced,
  BrainDirSyncSymlink,
} from './BrainDirLayoutOutcome';
import { BRAIN_DIR_BOOT_FILENAMES } from './constants';

/**
 * .what = the treestruct report for ONE brain dir sync: what moved, what was dropped,
 *         whether the link was made, which real settings files became arrows, and whether
 *         the corpus was created or upgraded
 *
 * .why = every adjacent section of this stdout is a treestruct (`📚 link role`,
 *   `🔭 search for linked roles`, `🪝 apply hooks`). a bare one-liner wedged between two
 *   trees reads as debug chatter rather than as a report, so a human skims past the one
 *   part of the output that says their `.claude` MOVED
 *   (`rule.require.treestruct-output`).
 *
 * .note = a no-op emits NAUGHT. a sync that moved naught, linked naught and re-rendered
 *   an identical corpus has no news, and success is not news (either it halts, or it is
 *   silent). the failure path is loud elsewhere — `asBrainDirBootFailureLines` plus a
 *   nonzero exit — so silence here can only mean "as it was".
 *
 * .note = the glyph is 🧠, the domain-root glyph for a brain (`define.rhachet.v3`). a
 *   brain dir is that same concept at a smaller grain, never a second concept, so it
 *   reuses the glyph rather than coins one.
 */
export const asBrainDirSyncReportLines = (input: {
  render: BrainDirBootRender;
  symlink: BrainDirSyncSymlink | null;
  settingsReplaced: BrainDirSyncSettingsReplaced[];
  excludesDropped: string[];
  repoActorBrainDirRel: string;
}): string[] => {
  const { render } = input;

  // what this sync's own layout step did — the same groups the layout step's report draws
  const groups: BrainDirReportGroup[] = asBrainDirLayoutReportGroups({
    symlink: input.symlink,
    settingsReplaced: input.settingsReplaced,
    excludesDropped: input.excludesDropped,
    repoActorBrainDirRel: input.repoActorBrainDirRel,
  });

  // whether the layout step itself has news — the corpus alone, re-rendered, is none
  const hasLayoutNews = groups.length > 0;

  // the corpus. `created` and `upgraded` are different facts to a human: one says a
  //   brain dir is new, the other says a live one just changed under its clones. a
  //   byte-identical re-render is neither, so it gets no row. `upgraded` rides beside
  //   other news only: a re-render alone is the daily brief edit, and stays quiet (below)
  const roleWord = render.stats.roles === 1 ? 'role' : 'roles';
  if (render.bootMdChanged)
    groups.push({
      label: BRAIN_DIR_BOOT_FILENAMES.bootMd,
      rows: [
        `${render.bootMdCreated ? 'created' : 'upgraded'} — ${render.stats.roles} ${roleWord}`,
      ],
    });

  // a reset is never silent (S11): the human's hand edits were dropped, and they learn
  //   it here rather than by a later diff
  if (render.agentsMdReset)
    groups.push({
      label: BRAIN_DIR_BOOT_FILENAMES.agentsMd,
      rows: ['reset — hand edits dropped; rhachet owns this file'],
    });

  // a corpus that merely re-rendered, with no migration, no link change and no reset, is no news,
  //   whether or not its bytes changed: `bootMdCreated` gates, never `bootMdChanged`
  const isNews = hasLayoutNews || render.bootMdCreated || render.agentsMdReset;
  if (!isNews) return [];

  return [
    `🧠 ${asBrainDirBootScopeLabel({ scope: render.scope })}`,
    ...asBrainDirReportGroupLines({ groups }),
  ];
};
