import fs from 'fs/promises';
import path from 'path';

/**
 * .what = initializes a keyrack manifest for a repo
 * .why = provides a standard start point for keyrack configuration
 */
export const initKeyrackRepoManifest = async (input: {
  gitroot: string;
  org: string;
}): Promise<{ status: 'created' | 'exists'; path: string }> => {
  // compute manifest path
  const manifestPath = path.join(input.gitroot, '.agent', 'keyrack.yml');

  // check if manifest already exists
  const manifestExists = await fs
    .access(manifestPath)
    .then(() => true)
    .catch(() => false);

  if (manifestExists) {
    return { status: 'exists', path: manifestPath };
  }

  // create .agent dir if needed
  const agentDir = path.join(input.gitroot, '.agent');
  await fs.mkdir(agentDir, { recursive: true });

  // write manifest template
  const content = `org: ${input.org}

env.prod:
  # - AWS_PROFILE
  # - OPENAI_API_KEY

env.test:
  # - AWS_PROFILE
  # - OPENAI_API_KEY
`;
  await fs.writeFile(manifestPath, content, 'utf-8');

  return { status: 'created', path: manifestPath };
};
