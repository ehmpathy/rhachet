/**
 * .what = the one line an enroll prints when it resumes a session: the clone's boot is the
 *         session's, so its drift is unknown
 * .why = a resume replays the system prompt its session first recorded; said at enroll, the
 *        human knows at once that a respawn, not a compaction, takes the current boot
 * .note = a 🟡 caution, never an error: the resume succeeds
 */
export const asCloneBootResumedLine = (): string =>
  '🟡 a resume holds the boot its session first recorded, so it takes no drift at any compaction; respawn to take the current boot';
