import type { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';

/**
 * .what = the human tree for `rhx brains auth set`: the account filed, its org, its keyrack key
 * .why = case=1 — the human sees which account landed and where, and never a token
 * .note = a `renewed` outcome says the account was already held, so a human who logged in as the
 *   wrong account sees that the login replaced one they had (F8)
 */
export const asBrainAuthSetTree = (input: {
  account: BrainAuthAccount;
  outcome: 'stored' | 'renewed';
  owner: string;
  key: string;
}): string =>
  [
    '🧠 brains auth set',
    `   ├─ owner = ${input.owner}`,
    `   ├─ ${input.account.email}`,
    `   │  ├─ org = ${input.account.orgId ?? 'unknown'}`,
    `   │  └─ key = ${input.key}`,
    `   ├─ ${input.outcome === 'renewed' ? 'renewed — already held; the new login replaces the held one' : 'stored'}`,
    `   └─ next = rhx brains auth use --account ${input.account.email} --scope grove`,
  ].join('\n');
