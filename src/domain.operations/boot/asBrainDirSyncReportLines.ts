import { asBrainDirBootScopeLabel } from './asBrainDirBootScopeLabel';
import type { BrainDirBootRender } from './BrainDirBootRender';
import { BRAIN_DIR_BOOT_FILENAMES } from './constants';

/**
 * .what = what a `<repo>/.claude` sync did to the link, if it touched it at all
 * .why = the effect is already computed by `setRepoBrainDirSymlink`; the report names
 *        it rather than re-derive it
 */
export type BrainDirSyncSymlink = {
  effect: 'CREATED' | 'FOUND' | 'REWRITTEN' | 'MIGRATED';
  drops: string[];
  moves: string[];
  overwrites: string[];
};

/** .what = one group of the sync tree — a label and the rows beneath it */
type ReportGroup = { label: string; rows: string[] };

/**
 * .what = the treestruct report for ONE brain dir sync: what moved, what was dropped,
 *         whether the link was made, and whether the corpus was created or upgraded
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
  defaultBrainDirRel: string;
}): string[] => {
  const { render, symlink, defaultBrainDirRel } = input;

  const groups: ReportGroup[] = [];

  // what the migration carried over, and which of those replaced a file already there.
  //   the `(replaced)` suffix is the one row a human may want to diff against git
  if (symlink?.moves.length)
    groups.push({
      label: 'moved',
      rows: symlink.moves.map(
        (name) =>
          `.claude/${name} → ${defaultBrainDirRel}/${name}${symlink.overwrites.includes(name) ? ' (replaced)' : ''}`,
      ),
    });
  if (symlink?.drops.length)
    groups.push({
      label: 'dropped',
      rows: symlink.drops.map(
        (name) => `.claude/${name} — rhachet owns the boot context`,
      ),
    });

  // the link itself — named only when this run changed it. FOUND means it was already
  //   the link we wanted, which is no news
  if (symlink && symlink.effect !== 'FOUND')
    groups.push({
      label: 'linked',
      rows: [`.claude → ${defaultBrainDirRel}`],
    });

  // the corpus. `created` and `upgraded` are different facts to a human: one says a
  //   brain dir is new, the other says a live one just changed under its clones
  const roleWord = render.stats.roles === 1 ? 'role' : 'roles';
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

  // a corpus that merely re-rendered, with no migration and no link change, is no news
  const isBootOnly = groups.length === 1;
  if (isBootOnly && !render.bootMdCreated) return [];

  return [
    `🧠 brain dir (${asBrainDirBootScopeLabel({ scope: render.scope })})`,
    ...groups.flatMap((group, groupIndex) => {
      const isLastGroup = groupIndex === groups.length - 1;
      const groupBranch = isLastGroup ? '└─' : '├─';
      const groupStem = isLastGroup ? '   ' : '│  ';
      return [
        `   ${groupBranch} ${group.label}`,
        ...group.rows.map((row, rowIndex) => {
          const rowBranch = rowIndex === group.rows.length - 1 ? '└─' : '├─';
          return `   ${groupStem}${rowBranch} ${row}`;
        }),
      ];
    }),
  ];
};
