import { MalfunctionError } from 'helpful-errors';

import {
  type KeyrackInfraRegistryGithubApp,
  schemaKeyrackInfraRegistry,
} from './KeyrackInfraRegistryGithubApp';

/**
 * .what = parse the keyrack-infra registry file content into validated entries
 * .why = the registry is a json array persisted in $org/keyrack-infra
 *
 * .note = a corrupt registry is unexpected shared-repo state, not caller input the
 *         cli can fix by a different invocation — it needs a manual fix to the file
 *         in $org/keyrack-infra — so it fails loud as an MalfunctionError with
 *         the raw content in metadata for diagnostics
 */
export const asKeyrackInfraRegistryGithubApps = (input: {
  content: string;
}): KeyrackInfraRegistryGithubApp[] => {
  // parse the raw file content as json
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.content);
  } catch (error) {
    throw new MalfunctionError('keyrack-infra registry is not valid json', {
      hint: 'registry/github-apps.json in $org/keyrack-infra must be a json array; fix the file in the repo',
      content: input.content,
      cause: error instanceof Error ? error : undefined,
    });
  }

  // validate the shape against the registry schema
  return schemaKeyrackInfraRegistry.parse(parsed);
};
