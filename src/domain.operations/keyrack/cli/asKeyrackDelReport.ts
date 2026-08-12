/**
 * .what = render the human-readable `keyrack del` result block (header + per-outcome body)
 * .why = the del branch has three outcomes (absent, removed, removed + a destroyed remote
 *        secret); a pure transformer keeps invokeKeyrack a narrative dispatcher AND makes the
 *        exact operator-seen text unit-snapshottable
 */
export const asKeyrackDelReport = (input: {
  // the ADDRESS the del was aimed at — the slug when the key names no reach, and `$slug@$exid`
  // when it does. named `address` rather than `slug` because the composite is never parsed back
  // apart, and `slug` is a forbidden synonym for it (`term=address`)
  address: string;
  effect: 'deleted' | 'not_found';
  // the remote secret keyrack destroyed, if the vault owned one (aws.params owned mech). when
  // present, the report names the destroyed param so a destructive remote mutation is visible
  destroyed?: { exid: string } | null;
}): string => {
  // keyrack success/operation output roots on the 🔐 signature glyph, uniform with every other
  // keyrack command (set/list/firewall) per rule.require.keyrack-emoji-palette
  // .note = the header opens with NO blank line, and that is the house pattern rather than an
  //         oversight: every other keyrack report builder lets its CALL SITE own the separator, and
  //         the del path already prints one (invokeKeyrack.ts, ahead of the passphrase prompt). a
  //         blank here stacks with that one and renders TWO before the glyph, where every other
  //         `🔐 keyrack …` render in the corpus opens with exactly one
  const header = ['🔐 keyrack del'];

  // the entry was already absent — no removal ran
  if (input.effect !== 'deleted')
    return [
      ...header,
      `   └─ ${input.address} not found (already absent)`,
      '',
    ].join('\n');

  // a removal that also destroyed a keyrack-managed remote secret — echo what changed so a
  // destructive SSM delete is never silent (status feedback + safe-by-default)
  if (input.destroyed)
    return [
      ...header,
      `   └─ ${input.address} removed`,
      `      └─ the SSM secret at ${input.destroyed.exid} was destroyed`,
      '',
    ].join('\n');

  // a plain removal (no remote secret keyrack owned)
  return [...header, `   └─ ${input.address} removed`, ''].join('\n');
};
