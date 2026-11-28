/**
 * .what = what a clone's spawn boot dir records about its own two files
 * .why = a drift check compares hashes, never bytes: `spawned.hash` names the boot the clone
 *        spawned on, `drift.against` names the current boot its `CLAUDE.md` was last written
 *        against, so a sweep whose current boot hash matches skips the clone with no delta
 * .note = `drift` is null only between the boot write and the first drift write of a spawn
 */
export type BootSpawnedMeta = {
  spawned: { hash: string };
  drift: { against: string } | null;
};
