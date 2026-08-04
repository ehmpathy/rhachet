/**
 * .what = render the human-readable `keyrack del` result block (header + per-outcome body)
 * .why = the del branch has three outcomes (absent, removed, removed + a destroyed remote
 *        secret); a pure transformer keeps invokeKeyrack a narrative dispatcher AND makes the
 *        exact operator-seen text unit-snapshottable
 */
export const asKeyrackDelReport = (input: {
  slug: string;
  effect: 'deleted' | 'not_found';
  // the remote secret keyrack destroyed, if the vault owned one (aws.params owned mech). when
  // present, the report names the destroyed param so a destructive remote mutation is visible
  destroyed?: { exid: string } | null;
}): string => {
  // keyrack success/operation output roots on the 🔐 signature glyph, uniform with every other
  // keyrack command (set/list/firewall) per rule.require.keyrack-emoji-palette
  const header = ['', '🔐 keyrack del'];

  // the entry was already absent — no removal ran
  if (input.effect !== 'deleted')
    return [
      ...header,
      `   └─ ${input.slug} not found (already absent)`,
      '',
    ].join('\n');

  // a removal that also destroyed a keyrack-managed remote secret — echo what changed so a
  // destructive SSM delete is never silent (status feedback + safe-by-default)
  if (input.destroyed)
    return [
      ...header,
      `   └─ ${input.slug} removed`,
      `      └─ the SSM secret at ${input.destroyed.exid} was destroyed`,
      '',
    ].join('\n');

  // a plain removal (no remote secret keyrack owned)
  return [...header, `   └─ ${input.slug} removed`, ''].join('\n');
};
