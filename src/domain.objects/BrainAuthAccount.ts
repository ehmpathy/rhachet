import { DomainLiteral } from 'domain-objects';

import type { BrainSlug } from './BrainSlug';

/**
 * .what = one paid brain account, named the way its provider names it
 * .why = the read (`brains auth get`) and the swap (`brains auth use`) share this one noun, and
 *        a swap is proven only by a compare of it before and after
 */
export interface BrainAuthAccount {
  /**
   * .what = the brain this account logs into (e.g., "claude")
   */
  brain: BrainSlug;

  /**
   * .what = the uuid the provider reports for the account (claude: `/api/oauth/profile` `.account.uuid`)
   * .why = the one identity a compare can trust: an email can sit in two orgs, a uuid cannot
   */
  accountUuid: string;

  /**
   * .what = the email the provider reports for the account
   * .note = the keyrack slot is filed at reach = this email
   */
  email: string;

  /**
   * .what = the org the provider reports for the account
   * .note = null where the provider read gave none (the claude profile read is unprobed for it)
   */
  orgId: string | null;
}

export class BrainAuthAccount
  extends DomainLiteral<BrainAuthAccount>
  implements BrainAuthAccount {}
