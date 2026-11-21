import type { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';

/**
 * .what = the json envelope of `rhx brains auth set --output json`
 * .why = a caller that parses the set reads one named shape, snapped in one place, as `use` does
 * .note = never holds a token: the login lives in the keyrack alone
 */
export const asBrainAuthSetJson = (input: {
  account: BrainAuthAccount;
  outcome: 'stored' | 'renewed';
  owner: string;
  key: string;
}): {
  account: BrainAuthAccount;
  outcome: 'stored' | 'renewed';
  owner: string;
  key: string;
} => ({
  account: input.account,
  outcome: input.outcome,
  owner: input.owner,
  key: input.key,
});
