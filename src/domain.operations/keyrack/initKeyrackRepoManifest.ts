import fs from 'fs/promises';
import path from 'path';

/**
 * .what = initializes a keyrack manifest for a repo
 * .why = enables keyrack init CLI command and role-level keyrack creation
 *
 * .note = when `at` is provided, creates keyrack at custom path (for role-level keyracks)
 * .note = when `at` is absent, creates keyrack at default .agent/keyrack.yml
 */
export const initKeyrackRepoManifest = async (input: {
  gitroot: string;
  org: string;
  at?: string | null;
}): Promise<{ status: 'created' | 'exists'; path: string }> => {
  // compute manifest path (custom path or default)
  const manifestPath = input.at
    ? path.isAbsolute(input.at)
      ? input.at
      : path.join(input.gitroot, input.at)
    : path.join(input.gitroot, '.agent', 'keyrack.yml');

  // check if manifest already exists
  const manifestExists = await fs
    .access(manifestPath)
    .then(() => true)
    .catch(() => false);

  if (manifestExists) {
    return { status: 'exists', path: manifestPath };
  }

  // create parent directory if needed
  const parentDir = path.dirname(manifestPath);
  await fs.mkdir(parentDir, { recursive: true });

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
