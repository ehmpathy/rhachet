import type { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';

/**
 * .what = whether two reads name the same account: uuid, email and org alike
 * .why = case=3 proves a use by a before and after compare of the account; the uuid is the
 *   strongest identity, and the email and org are the pair the wish names
 */
export const isBrainAuthAccountSame = (input: {
  a: BrainAuthAccount;
  b: BrainAuthAccount;
}): boolean =>
  input.a.accountUuid === input.b.accountUuid &&
  input.a.email === input.b.email &&
  input.a.orgId === input.b.orgId;
