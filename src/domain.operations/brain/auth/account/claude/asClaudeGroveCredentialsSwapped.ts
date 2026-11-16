import { MalfunctionError } from 'helpful-errors';

import { asJsonParsedOrNull } from '@src/infra/json/asJsonParsedOrNull';

/**
 * .what = the grove's `.credentials.json` content with its oauth block replaced by a new account's
 * .why = `use` installs an account (case=3); every other key the file holds is kept as it was
 * .note = a file that does not parse is a malfunction, never overwritten blind: it may hold a
 *   login rhachet cannot read
 */
export const asClaudeGroveCredentialsSwapped = (input: {
  content: string | null;
  oauth: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scopes: string[];
    subscriptionType: string | null;
  };
}): string => {
  // keep the other keys of an extant file
  const parsed =
    input.content === null
      ? {}
      : asJsonParsedOrNull({ content: input.content });
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new MalfunctionError(
      'the grove login file does not parse; refused to overwrite it',
      {
        hint: 'inspect ~/.claude/.credentials.json by hand, or log in via claude, then retry',
      },
    );

  // replace the oauth block whole: no key of the prior account's block may describe the new one
  const swapped = {
    ...parsed,
    claudeAiOauth: {
      accessToken: input.oauth.accessToken,
      refreshToken: input.oauth.refreshToken,
      expiresAt: input.oauth.expiresAt,
      scopes: input.oauth.scopes,
      subscriptionType: input.oauth.subscriptionType,
    },
  };
  return `${JSON.stringify(swapped, null, 2)}\n`;
};
