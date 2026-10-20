import type { BrainDirSyncSettingsReplaced } from './BrainDirLayoutOutcome';

/**
 * .what = the one stdout row for a settings name whose real file the layout took back
 * .why = the file's content is gone (one answer, rhachet's), so the row says so and names where
 *   a durable allow belongs; every command that lays the layout prints this same row
 *   (criteria usecase.3, seed S2)
 * .note = target null = a box with no grove, where the name holds no arrow at all
 * .note = `dirRel` is how a human reaches the brain dir: `.claude` for the repo actor, the
 *   actor dir's own path for any other
 */
export const asSettingsReplacedRow = (
  input: BrainDirSyncSettingsReplaced & { dirRel: string },
): string => {
  const hint = 'keep durable allows in a role or ~/.claude/settings.json';
  if (input.target === null)
    return `${input.dirRel}/${input.name} — a real file was here; this box has no ~/.claude/settings.json, so rhachet removed it and its content is gone (${hint})`;
  return `${input.dirRel}/${input.name} → ${input.target} — a real file was here; its content is gone, rhachet owns this name (${hint})`;
};
