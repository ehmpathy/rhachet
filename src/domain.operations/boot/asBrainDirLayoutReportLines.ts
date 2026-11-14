import { asBrainDirBootScopeLabel } from './asBrainDirBootScopeLabel';
import { asBrainDirLayoutReportGroups } from './asBrainDirLayoutReportGroups';
import { asBrainDirReportGroupLines } from './asBrainDirReportGroupLines';
import type {
  BrainDirSyncSettingsReplaced,
  BrainDirSyncSymlink,
} from './BrainDirLayoutOutcome';

/**
 * .what = the treestruct report for the layout step a command runs before its role inits:
 *         what it moved, dropped and linked, and which real settings files it took back
 * .why = the step replaces a human's real file before the inits run. a report deferred to the
 *   boot sync after them is lost to any abort between — a role init that throws, a cli below
 *   the floor, a render that fails — so the loss would be silent. the step names its own
 *   change, at once (the layout op's "never silent on any box")
 * .note = naught changed → naught printed (success is not news)
 */
export const asBrainDirLayoutReportLines = (input: {
  symlink: BrainDirSyncSymlink | null;
  settingsReplaced: BrainDirSyncSettingsReplaced[];
  excludesDropped: string[];
  repoActorBrainDirRel: string;
}): string[] => {
  const groups = asBrainDirLayoutReportGroups(input);
  if (groups.length === 0) return [];
  return [
    `🧠 ${asBrainDirBootScopeLabel({ scope: { kind: 'repo' } })}`,
    ...asBrainDirReportGroupLines({ groups }),
  ];
};
