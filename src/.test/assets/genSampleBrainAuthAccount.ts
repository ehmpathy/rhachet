import { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';

/**
 * .what = a claude account as the provider names it, keyed by its email
 * .why = every brains auth suite builds one; one generator keeps the shape in one place
 *   (rule.require.shared-test-fixtures)
 * .note = the uuid derives from the email, so two samples of one email name one account, and two
 *   emails never share a uuid
 * .note = emails are on `example.com` (rfc 2606); no real identity
 */
export const genSampleBrainAuthAccount = (input: {
  email: string;
  orgId?: string | null;
}): BrainAuthAccount =>
  new BrainAuthAccount({
    brain: 'claude',
    accountUuid: `uuid-${input.email}`,
    email: input.email,
    orgId: input.orgId ?? null,
  });
