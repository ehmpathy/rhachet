import { asBrainDirBootScopeLabel } from './asBrainDirBootScopeLabel';
import { asBrainDirReportGroupLines } from './asBrainDirReportGroupLines';
import { asSettingsReplacedRow } from './asSettingsReplacedRow';
import type { BrainDirBootScope } from './BrainDirBootRender';
import type { BrainDirSyncSettingsReplaced } from './BrainDirLayoutOutcome';

/**
 * .what = the treestruct for each real settings file one layout findsert took back, in any
 *         actor's brain dir
 * .why = a command outside init (an enroll) lays the layout too, and a real file it replaces
 *   is gone as surely as one init replaces. so it names the loss with the same row init prints,
 *   under the address of the dir it touched (`inventory.of=requirements.case=7`, "never silent")
 * .note = naught taken back → naught printed (success is not news)
 */
export const asBrainDirSettingsReplacedLines = (input: {
  scope: BrainDirBootScope;
  settingsReplaced: BrainDirSyncSettingsReplaced[];
  dirRel: string;
}): string[] => {
  if (input.settingsReplaced.length === 0) return [];
  return [
    `🧠 ${asBrainDirBootScopeLabel({ scope: input.scope })}`,
    ...asBrainDirReportGroupLines({
      groups: [
        {
          label: 'replaced',
          rows: input.settingsReplaced.map((entry) =>
            asSettingsReplacedRow({ ...entry, dirRel: input.dirRel }),
          ),
        },
      ],
    }),
  ];
};
