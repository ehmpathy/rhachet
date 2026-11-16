/**
 * .what = the claude usage windows we read, keyed by the reply's own field name
 * .why = one table names which reply field feeds which window slug, for the drift check and the cast
 */
export const CLAUDE_USAGE_WINDOW_FIELDS = [
  { field: 'five_hour', slug: 'session' },
  { field: 'seven_day', slug: 'week' },
] as const;

/**
 * .what = how a claude `/api/oauth/usage` reply drifted from the shape we read, or null when it fits
 * .why = the endpoint is undocumented, so drift is plausible. a caller that only annotates with
 *   usage (`use`), or reads many rows (`get`), checks this first and degrades that one read, so a
 *   drift never blocks a swap or hides the other rows
 * .note = a window present as `null` fits: the plan has no such limit
 */
export const asClaudeUsageReplyDrift = (input: {
  reply: unknown;
}): { reason: string; keys: string[] } | null => {
  // a reply that is not an object
  const reply = input.reply;
  if (typeof reply !== 'object' || reply === null || Array.isArray(reply))
    return {
      reason: 'claude usage reply is not an object',
      keys: [],
    };
  const record = reply as Record<string, unknown>; // external json, an object per the check above
  const keys = Object.keys(record);

  // a window key absent
  const fieldAbsent = CLAUDE_USAGE_WINDOW_FIELDS.find(
    ({ field }) => !(field in record),
  );
  if (fieldAbsent)
    return {
      reason: `claude usage reply lacks a window key (${fieldAbsent.field})`,
      keys,
    };

  // a window whose utilization is not a number
  const fieldNotNumeric = CLAUDE_USAGE_WINDOW_FIELDS.find(({ field }) => {
    const window = record[field] as Record<string, unknown> | null; // external json, narrowed next
    if (window === null) return false;
    const utilization = window?.utilization;
    return typeof utilization !== 'number' || Number.isNaN(utilization);
  });
  if (fieldNotNumeric)
    return {
      reason: `claude usage window lacks a numeric utilization (${fieldNotNumeric.field})`,
      keys,
    };

  return null;
};
