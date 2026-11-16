import type { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';
import { asJsonParsedOrNull } from '@src/infra/json/asJsonParsedOrNull';

/**
 * .what = `~/.claude.json` content with its `oauthAccount` record renamed to a new account, or null
 *   when there is no file, or it does not parse (then it is left alone)
 * .why = after `use`, the cli's own record must name the account the grove now holds: `get` reads it
 *   when the live token has lapsed (case=5 [t3]), and the claude ui shows it
 * .note = only `accountUuid` and `emailAddress` are set; every other key is kept as it was
 */
export const asClaudeJsonAccountSynced = (input: {
  content: string | null;
  account: BrainAuthAccount;
}): string | null => {
  if (input.content === null) return null;
  const parsed = asJsonParsedOrNull({ content: input.content });
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    return null;
  const record = parsed as Record<string, unknown>; // external json (claude's own file), an object per the check above
  const prior =
    record.oauthAccount && typeof record.oauthAccount === 'object'
      ? (record.oauthAccount as Record<string, unknown>) // an object per the check beside it
      : {};
  return `${JSON.stringify(
    {
      ...record,
      oauthAccount: {
        ...prior,
        accountUuid: input.account.accountUuid,
        emailAddress: input.account.email,
      },
    },
    null,
    2,
  )}\n`;
};
