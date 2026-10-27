/**
 * .what = the row of one enrolled actor in the `🧢 apply hooks to enrolled actors` tree
 * .why = a derivation that faulted must read as a fault, never as a quiet actor with no
 *   change. a fault row carries a `✗` marker, a skip row a `⚠️`; what went wrong hangs beneath
 *   the row as a subbranch (`asEnrolledActorsHookSyncLines`), never after a `:` on the row
 *   (rule.forbid.colons-in-stdout)
 *
 * .note = the actor exid is rendered whole, never cut short — it is the actor's entire name and a copyable
 *   `@<exid>` address (`define.address-sigils`)
 * .note = a change row keeps its extant `<exid>: <changes>` form, the same form the brain rows
 *   above it use; their repair is one reshape of both trees (dream item 13)
 */
export const asEnrolledActorHookSyncRow = (input: {
  actorExid: string;
  outcome: { changes: string } | { error: Error } | { skipped: string };
}): string => {
  // a skip is no fault: the row says so, and the `⚠️` block below names the path and fix
  if ('skipped' in input.outcome) return `⚠️ ${input.actorExid}`;
  if ('error' in input.outcome) return `✗ ${input.actorExid}`;
  const { changes } = input.outcome;
  return `${input.actorExid}${changes ? `: ${changes}` : ''}`;
};
