import { asSettingsReplacedRow } from './asSettingsReplacedRow';
import type {
  BrainDirSyncSettingsReplaced,
  BrainDirSyncSymlink,
} from './BrainDirLayoutOutcome';

/** .what = one group of a brain dir tree — a label and the rows beneath it */
export type BrainDirReportGroup = { label: string; rows: string[] };

/**
 * .what = the groups that name what a layout step did to the repo actor's brain dir: what it
 *         moved, what it dropped, whether it made the `<repo>/.claude` link, and which real
 *         settings files it took back
 * .why = one builder for both reporters — the layout step's own report and the boot sync's —
 *   so a layout change reads the same whichever step made it
 * .note = a step that changed naught yields no group (success is not news)
 */
export const asBrainDirLayoutReportGroups = (input: {
  symlink: BrainDirSyncSymlink | null;
  settingsReplaced: BrainDirSyncSettingsReplaced[];
  excludesDropped: string[];
  repoActorBrainDirRel: string;
}): BrainDirReportGroup[] => {
  const { symlink, settingsReplaced, excludesDropped, repoActorBrainDirRel } =
    input;
  const groups: BrainDirReportGroup[] = [];

  // what the migration carried over, and which of those replaced a file already there.
  //   the `(replaced)` suffix is the one row a human may want to diff against git.
  //   a name the layout then took back reads once, under `replaced`: its content is gone, and
  //   a `moved` row would say it survived
  const namesTakenBack = settingsReplaced.map((entry) => entry.name);
  const moves = (symlink?.moves ?? []).filter(
    (name) => !namesTakenBack.includes(name),
  );
  if (symlink && moves.length)
    groups.push({
      label: 'moved',
      rows: moves.map(
        (name) =>
          `.claude/${name} → ${repoActorBrainDirRel}/${name}${symlink.overwrites.includes(name) ? ' (replaced)' : ''}`,
      ),
    });
  if (symlink?.drops.length)
    groups.push({
      label: 'dropped',
      rows: symlink.drops.map(
        (name) => `.claude/${name} — rhachet owns the boot context`,
      ),
    });

  // the link itself — named only when this step changed it. FOUND means it was already
  //   the link we wanted, which is no news
  if (symlink && symlink.effect !== 'FOUND')
    groups.push({
      label: 'linked',
      rows: [`.claude → ${repoActorBrainDirRel}`],
    });

  // a real settings file the layout replaced with its arrow, or removed on a box with no
  //   grove. its content is gone, so the human learns it here rather than by a later diff
  //   (one answer, rhachet's)
  if (settingsReplaced.length)
    groups.push({
      label: 'replaced',
      rows: settingsReplaced.map((entry) =>
        asSettingsReplacedRow({ ...entry, dirRel: '.claude' }),
      ),
    });

  // a prior claudeMdExcludes entry the derived list replaced. rhachet owns the key, so the
  //   entry is gone; the human learns it here rather than by a later diff of the tracked file
  if (excludesDropped.length)
    groups.push({
      label: 'unexcluded',
      rows: excludesDropped.map(
        (entry) =>
          `${entry} — a claudeMdExcludes entry rhachet does not derive; rhachet owns this key, so it was dropped`,
      ),
    });

  return groups;
};
