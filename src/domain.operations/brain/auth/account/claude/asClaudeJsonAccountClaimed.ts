import { asJsonParsedOrNull } from '@src/infra/json/asJsonParsedOrNull';

/**
 * .what = the email a `~/.claude.json` content names as the signed-in account, or null when none
 * .why = the read and the cast are two jobs; the cast is pure, so it is tested apart from the disk
 */
export const asClaudeJsonAccountClaimed = (input: {
  content: string | null;
}): { email: string } | null => {
  // parse the record; no content or no oauth account names none
  if (input.content === null) return null;
  const parsed = asJsonParsedOrNull({ content: input.content });
  if (!parsed || typeof parsed !== 'object' || !('oauthAccount' in parsed))
    return null;

  // narrow to the email it claims
  const oauthAccount = parsed.oauthAccount;
  if (!oauthAccount || typeof oauthAccount !== 'object') return null;
  const email =
    'emailAddress' in oauthAccount ? oauthAccount.emailAddress : null;
  return typeof email === 'string' ? { email } : null;
};
