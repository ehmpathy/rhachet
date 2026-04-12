import { ConstraintError } from 'helpful-errors';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = extracts full owner/repo from repository field
 * .why = supports npm shorthand and object formats
 *
 * formats:
 * - "owner/repo" (npm shorthand, implies github)
 * - "github:owner/repo"
 * - "git://github.com/owner/repo.git"
 * - { type: "git", url: "https://github.com/owner/repo.git" }
 */
export const parseRepoFromRepositoryField = (input: {
  repository: string | { type?: string; url: string };
}): string | null => {
  const url =
    typeof input.repository === 'string'
      ? input.repository
      : input.repository.url;

  // try npm bare shorthand: owner/repo (no prefix, implies github)
  const bareMatch = url.match(/^([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)$/);
  if (bareMatch?.[1]) return bareMatch[1];

  // try github shorthand: github:owner/repo
  const shorthandMatch = url.match(/^github:([^/]+\/[^/]+)$/);
  if (shorthandMatch?.[1]) return shorthandMatch[1];

  // try full url: git://github.com/owner/repo.git or https://github.com/owner/repo
  const urlMatch = url.match(/github\.com\/([^/]+\/[^/.]+)/);
  if (urlMatch?.[1]) return urlMatch[1];

  return null;
};

/**
 * .what = get github repo from context gitroot
 * .why = github.secrets vault needs repo for gh secret set
 *
 * .note = reads package.json from gitroot
 * .note = failfast if repo cannot be determined
 */
export const getGithubRepoFromContext = (input: {
  gitroot: string | null | undefined;
}): string => {
  // guard: gitroot required
  if (!input.gitroot) {
    throw new ConstraintError('gitroot required for github.secrets vault', {
      hint: 'run from within a git repository',
    });
  }

  // check if package.json present
  const packageJsonPath = join(input.gitroot, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new ConstraintError(
      'package.json required for github.secrets vault',
      {
        gitroot: input.gitroot,
        hint: 'run from a directory with package.json that has repository field',
      },
    );
  }

  // read package.json
  const packageJson: {
    repository?: string | { type?: string; url: string };
  } = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  // extract repo from repository field
  if (!packageJson.repository) {
    throw new ConstraintError(
      'package.json.repository required for github.secrets vault',
      {
        gitroot: input.gitroot,
        hint: 'add repository field to package.json, e.g., "repository": "owner/repo"',
      },
    );
  }

  const repo = parseRepoFromRepositoryField({
    repository: packageJson.repository,
  });

  if (!repo) {
    throw new ConstraintError(
      'could not parse github repo from package.json.repository',
      {
        repository: packageJson.repository,
        hint: 'use format "owner/repo" or "github:owner/repo"',
      },
    );
  }

  return repo;
};
