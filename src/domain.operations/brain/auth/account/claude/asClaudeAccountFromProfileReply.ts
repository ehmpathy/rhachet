import { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';

/**
 * .what = the account a claude profile reply names, or null when the reply drifted
 * .why = the read and the cast are two jobs; the cast is pure, so it is tested apart from the wire
 * .note = a reply that lacks its uuid or email is drift. null lets the wire reader report it as
 *   `unreadable`, so one account's drift never hides the other rows of `get`
 * .note = the org id is read when the reply carries one, else null; the profile reply is unprobed
 *   for it (r4), and dev-env-setup never reads one
 */
export const asClaudeAccountFromProfileReply = (input: {
  json: unknown;
}): BrainAuthAccount | null => {
  // external json: each field is narrowed below, a null body reads as drift
  const json = (input.json ?? {}) as {
    account?: { uuid?: unknown; email?: unknown };
    organization?: { uuid?: unknown };
  };

  // a reply that lacks its uuid or email is drift
  const uuid = json.account?.uuid;
  const email = json.account?.email;
  if (typeof uuid !== 'string' || typeof email !== 'string') return null;

  // name the account
  const orgId = json.organization?.uuid;
  return new BrainAuthAccount({
    brain: 'claude',
    accountUuid: uuid,
    email,
    orgId: typeof orgId === 'string' ? orgId : null,
  });
};
