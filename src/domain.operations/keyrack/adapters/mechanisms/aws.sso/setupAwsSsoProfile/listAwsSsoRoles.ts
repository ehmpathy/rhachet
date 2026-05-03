import { execSync } from 'child_process';

import { getAwsSsoAccessToken } from './getAwsSsoAccessToken';

/**
 * .what = lists available roles for an aws account
 * .why = lets user pick which role to assume
 */
export const listAwsSsoRoles = (input: {
  ssoStartUrl: string;
  ssoRegion: string;
  accountId: string;
}): Array<{ roleName: string }> => {
  const accessToken = getAwsSsoAccessToken({ ssoStartUrl: input.ssoStartUrl });

  // list roles (unset AWS_PROFILE to prevent inherited empty string from shell)
  const result = execSync(
    `aws sso list-account-roles --access-token "${accessToken}" --account-id "${input.accountId}" --region "${input.ssoRegion}"`,
    { encoding: 'utf-8', env: { ...process.env, AWS_PROFILE: undefined } },
  );

  const parsed = JSON.parse(result);
  return parsed.roleList.map((r: { roleName: string }) => ({
    roleName: r.roleName,
  }));
};
