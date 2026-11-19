/**
 * .what = the line count past which a clone's boot drift nudges it to compact or respawn
 * .why = the brain cli's own docs name 200 lines as the size where a memory file starts to cost
 *        adherence (https://code.claude.com/docs/en/memory); past it, the drift a clone carries
 *        in memory is better shed by a respawn onto the current boot
 * .note = a policy constant: the nudge decision owns it, and the readout only quotes it
 */
export const BOOT_DRIFT_NUDGE_LINES = 200;
