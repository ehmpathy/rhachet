/**
 * .what = the one line enroll prints when it keeps or adopts a 1.48.0 brain-dir login
 * .why = a kept login means the box still runs clones on the old per-actor lock set,
 *   so the race that blanks the shared login stays open until they are respawned. the
 *   human must learn that, and the cure, at the moment enroll sees it
 *
 * .note = a removal says naught: the leftover is gone and no clone depended on it
 */
export const asBrainDirAuthMigratedLine = (input: {
  outcome: 'none' | 'kept' | 'removed' | 'adopted';
  brainDirAuthPath: string;
  brainAuthPath: string;
  liveCount: number;
}): string | null => {
  if (input.outcome === 'kept')
    return `ℹ kept the pre-cure login at ${input.brainDirAuthPath} — ${input.liveCount} clone(s) of this actor still live, and any spawned before the cure refresh it on their own locks; respawn them to close the race`;
  if (input.outcome === 'adopted')
    return `ℹ adopted the later login from ${input.brainDirAuthPath} into ${input.brainAuthPath}`;
  return null;
};
