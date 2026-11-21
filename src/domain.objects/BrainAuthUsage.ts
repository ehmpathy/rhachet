import { DomainLiteral } from 'domain-objects';

import { BrainAuthAccount } from './BrainAuthAccount';
import { BrainAuthUsageWindow } from './BrainAuthUsageWindow';

/**
 * .what = the usage read of one brain account: its windows, saved resets, and read status
 * .why = `brains auth get` renders one of these per account, and the pool rotation (#575)
 *        picks the soonest reset with headroom from them
 */
export interface BrainAuthUsage {
  /**
   * .what = the email the account is held under (the keyrack reach, or the grove's sign-in)
   * .why = always known, even when the token opens naught, so every row of `get` names its account
   */
  email: string;

  /**
   * .what = the account as the provider named it on this read
   * .note = null when the token opened no account (status dead, rate-limited or unreadable):
   *   the provider was not reached, or refused, so it named none
   */
  account: BrainAuthAccount | null;

  /**
   * .what = how the read went
   * .note
   *   - read         = the windows below are current
   *   - dead         = the stored refresh token was refused; the account needs a fresh `set`
   *   - rate-limited = the provider asked to wait; the account is not dead
   *   - unreadable   = server or network fault; a retry may help
   *   - unverified   = the grove's access token lapsed; it is never refreshed by a read (a refresh
   *                    of the live token kills the session), so the account is named from
   *                    `~/.claude.json` and its usage is not read
   *   - locked       = the keyrack holds this login but will not open it (locked, or blocked by
   *                    its firewall); the login is unspent, and an unlock reads it
   */
  status:
    | 'read'
    | 'dead'
    | 'rate-limited'
    | 'unreadable'
    | 'unverified'
    | 'locked';

  /**
   * .what = the windows the plan has, e.g. session and week
   * .note = empty unless status is `read`; a plan with no such window omits it
   */
  windows: BrainAuthUsageWindow[];

  /**
   * .what = the reset grants the plan has banked and left to use
   * .note = null where the provider gave no grant data
   */
  savedResets: number | null;

  /**
   * .what = whether this is the account the grove is signed in on
   * .note = that account's token lives in the grove file, not the keyrack, and is never refreshed
   */
  signedIn: boolean;

  /**
   * .what = whether this read rotated the account's stored login and parked the new one
   * .why = a refresh token is single use, so a read that mints writes the keyrack; `get` must say
   *   where it wrote, and only there (case=9)
   * .note = true only for a stored account whose mint landed; false for the signed-in account (its
   *   token is never refreshed) and for a stored login the provider refused or never answered
   */
  renewed: boolean;
}

export class BrainAuthUsage
  extends DomainLiteral<BrainAuthUsage>
  implements BrainAuthUsage
{
  public static nested = {
    account: BrainAuthAccount,
    windows: BrainAuthUsageWindow,
  };
}
