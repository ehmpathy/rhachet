/**
 * .what = the most lines of drift body a boot revision's `CLAUDE.md` carries; past it, the file
 *         holds a stub that names the drift and says to respawn
 * .why = `/compact` re-injects the whole drift into the conversation, at the moment a clone
 *        compacts for headroom. a drift near the size of the boot itself (a roleset bump, a new
 *        role) would spend that headroom, so past the cap a respawn, which loads the new boot whole
 *        from the shared cache, is the only cure offered
 * .note = ten times the nudge threshold: a drift this large has nudged long before it is capped
 */
export const BOOT_DRIFT_CARRY_LINES_MAX = 2000;
