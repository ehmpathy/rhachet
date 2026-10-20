import type { BrainDirSettingsLayout } from '@src/domain.operations/actor/enrolled/setBrainDirSettingsLayout';
import type { BrainDirSyncSettingsReplaced } from '@src/domain.operations/boot/BrainDirLayoutOutcome';

/**
 * .what = each settings name where one layout step replaced a real file with an arrow, or
 *         removed one on a box with no grove (target null)
 * .why = a real file's content is gone, so the step that took it names it; a fresh arrow
 *   (LINKED) or a dropped arrow (UNLINKED) lost no file, so neither is news
 * .note = a step that faulted (null) took back naught the report can name
 */
export const asSettingsReplacedOfLayout = (input: {
  settings: BrainDirSettingsLayout | null;
}): BrainDirSyncSettingsReplaced[] =>
  (input.settings?.effects ?? []).flatMap(
    (effect): BrainDirSyncSettingsReplaced[] => {
      if (effect.kind === 'REPLACED')
        return [{ name: effect.name, target: effect.target }];
      if (effect.kind === 'REMOVED')
        return [{ name: effect.name, target: null }];
      return [];
    },
  );
