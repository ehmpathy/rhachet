import { asTreeBranch } from '@src/utils/asTreeBranch';

import { basename } from 'node:path';
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
  carries: string[];
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
  repoActorBrainDirRel: string;
  isManifestRepo: boolean;
}): string[] => {
  const { render, symlink, repoActorBrainDirRel, isManifestRepo } = input;

  const groups: ReportGroup[] = [];

  // what the migration carried over, and which of those replaced a file already there.
  //   the `(replaced)` suffix is the one row a human may want to diff against git
  if (symlink?.moves.length)
    groups.push({
      label: 'moved',
      rows: symlink.moves.map(
        (name) =>
          `.claude/${name} → ${repoActorBrainDirRel}/${name}${symlink.overwrites.includes(name) ? ' (replaced)' : ''}`,
      ),
    });
  // what a change of repo actor carried from the former one — its own settings, kept
  if (symlink?.carries.length)
    groups.push({
      label: 'carried',
      rows: symlink.carries.map(
        (path) => `${path} → ${repoActorBrainDirRel}/${basename(path)}`,
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
      rows: [`.claude → ${repoActorBrainDirRel}`],
    });

  // the corpus. `created` and `changed` are different facts to a human: one says a
  //   brain dir is new, the other says a live one just changed under its clones
  //   .note = `changed — now N`, never `upgraded — N`: a change may add roles or remove them, and
  //     N is the total the corpus holds now, not the count that moved
  //   .note = a live corpus whose last role left reads `emptied`, never `changed — now 0 roles`
  //   .note = with no manifest the row keeps main's words, `upgraded — N`, so an absent
  //     actors.yml keeps today's output byte for byte (case=5)
  const roleWord = render.stats.roles === 1 ? 'role' : 'roles';
  const isEmptied = !render.bootMdCreated && render.stats.roles === 0;
  const corpusRow = (() => {
    if (render.bootMdCreated)
      return `created — ${render.stats.roles} ${roleWord}`;
    if (!isManifestRepo) return `upgraded — ${render.stats.roles} ${roleWord}`;
    if (isEmptied) return 'emptied — 0 roles';
    return `changed — now ${render.stats.roles} ${roleWord}`;
  })();
  groups.push({
    label: BRAIN_DIR_BOOT_FILENAMES.bootMd,
    rows: [corpusRow],
  });

  // a reset is never silent (S11): the human's hand edits were dropped, and they learn
  //   it here rather than by a later diff
  if (render.agentsMdReset)
    groups.push({
      label: BRAIN_DIR_BOOT_FILENAMES.agentsMd,
      rows: ['reset — hand edits dropped; rhachet owns this file'],
    });

  // the drift: whether the live clones of this actor get the change, at their next compaction.
  //   an actor with no spawn revision has no clone to tell; one that holds some always answers,
  //   "no change" included, and a fault always shows
  //   .note = deliberate mutation: `groups` is this render's local accumulator, as for each group above
  const drift = render.drift;
  const isDriftNews =
    drift !== null && (drift.revisions > 0 || drift.faults.length > 0);
  if (drift && isDriftNews)
    groups.push({
      label: 'drift',
      rows: [
        ...(drift.rewritten > 0
          ? [
              `${drift.rewritten} spawn revision${drift.rewritten === 1 ? '' : 's'} re-written`,
              drift.clones === 1
                ? '1 clone refers to them; a live one takes the drift at its next compaction'
                : `${drift.clones} clones refer to them; a live one takes the drift at its next compaction`,
            ]
          : []),
        ...(drift.rewritten === 0 && drift.faults.length === 0
          ? ['no change']
          : []),
        ...drift.faults.map(
          (fault) => `✗ ${basename(fault.revisionDir)} ${fault.reason}`,
        ),
      ],
    });

  // a corpus that re-rendered identical bytes, with no migration, no link change, and no drift,
  //   is no news. under `.agent/actors.yml`, a corpus whose bytes changed is news: a manifest
  //   edit just moved the roleset every clone of this actor boots. with no manifest the report
  //   stays as it was, news only on a created corpus, so an absent actors.yml keeps today's output
  const isBootOnly = groups.length === 1;
  const isNewsOfCorpus =
    render.bootMdCreated || (isManifestRepo && render.bootMdChanged);
  if (isBootOnly && !isNewsOfCorpus) return [];

  return [
    `🧠 ${asBrainDirBootScopeLabel({ scope: render.scope })}`,
    ...groups.flatMap((group, groupIndex) => {
      const { branch: groupBranch, stem: groupStem } = asTreeBranch({
        index: groupIndex,
        count: groups.length,
      });
      return [
        `   ${groupBranch} ${group.label}`,
        ...group.rows.map((row, rowIndex) => {
          const { branch: rowBranch } = asTreeBranch({
            index: rowIndex,
            count: group.rows.length,
          });
          return `   ${groupStem}${rowBranch} ${row}`;
        }),
      ];
    }),
  ];
};
