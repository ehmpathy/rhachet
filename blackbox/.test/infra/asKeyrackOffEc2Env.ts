import { join } from 'node:path';

/**
 * .what = the env of a box with no aws identity: every AWS_* credential var unset, the shared
 *         config and credentials files pointed at absent paths, IMDS disabled, and the box's
 *         failed `gh` (from `genKeyrackOffEc2Box`) first on PATH
 * .why = the off-ec2 grove's shape, shared by every github-app blackbox suite
 *
 * .note = NODE_OPTIONS is unset, so api.github.com is the real github. a suite that cans github
 *         spreads its own NODE_OPTIONS over this env
 */
export const asKeyrackOffEc2Env = (input: {
  repoPath: string;
}): Record<string, string | undefined> => ({
  HOME: input.repoPath,
  PATH: `${join(input.repoPath, '.gh-fails')}:${process.env.PATH}`,
  AWS_ACCESS_KEY_ID: undefined,
  AWS_SECRET_ACCESS_KEY: undefined,
  AWS_SESSION_TOKEN: undefined,
  AWS_PROFILE: undefined,
  AWS_DEFAULT_PROFILE: undefined,
  AWS_WEB_IDENTITY_TOKEN_FILE: undefined,
  AWS_ROLE_ARN: undefined,
  AWS_CONTAINER_CREDENTIALS_RELATIVE_URI: undefined,
  AWS_CONTAINER_CREDENTIALS_FULL_URI: undefined,
  AWS_CONFIG_FILE: join(input.repoPath, '.aws', 'config.absent'),
  AWS_SHARED_CREDENTIALS_FILE: join(input.repoPath, '.aws', 'credentials.absent'),
  AWS_EC2_METADATA_DISABLED: 'true',
  NODE_OPTIONS: undefined,
});
