import { execSync } from 'child_process';

import { getAwsSsoAccessToken } from './getAwsSsoAccessToken';

/**
 * .what = lists available aws accounts for sso user
 * .why = lets user pick which account to configure
 */
export const listAwsSsoAccounts = (input: {
  ssoStartUrl: string;
  ssoRegion: string;
}): Array<{ accountId: string; accountName: string; emailAddress: string }> => {
  const accessToken = getAwsSsoAccessToken({ ssoStartUrl: input.ssoStartUrl });

  // list accounts (unset AWS_PROFILE to prevent inherited empty string from shell)
  const result = execSync(
    `aws sso list-accounts --access-token "${accessToken}" --region "${input.ssoRegion}"`,
    { encoding: 'utf-8', env: { ...process.env, AWS_PROFILE: undefined } },
  );

  const parsed = JSON.parse(result);
  return parsed.accountList.map(
    (a: { accountId: string; accountName: string; emailAddress: string }) => ({
      accountId: a.accountId,
      accountName: a.accountName,
      emailAddress: a.emailAddress,
    }),
  );
};
