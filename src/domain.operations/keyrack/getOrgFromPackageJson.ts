import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = extracts org from scoped package name
 * .why = @org/name format is common for npm packages
 */
export const parseOrgFromScopedName = (input: {
  name: string;
}): string | null => {
  const match = input.name.match(/^@([^/]+)\//);
  return match?.[1] ?? null;
};

/**
 * .what = extracts owner from repository field
 * .why = supports npm shorthand and object formats
 *
 * formats:
 * - "owner/repo" (npm shorthand, implies github)
 * - "github:owner/repo"
 * - "git://github.com/owner/repo.git"
 * - { type: "git", url: "https://github.com/owner/repo.git" }
 */
export const parseOrgFromRepositoryField = (input: {
  repository: string | { type?: string; url: string };
}): string | null => {
  const url =
    typeof input.repository === 'string'
      ? input.repository
      : input.repository.url;

  // try npm bare shorthand: owner/repo (no prefix, implies github)
  const bareMatch = url.match(/^([a-zA-Z0-9_-]+)\/[a-zA-Z0-9_-]+$/);
  if (bareMatch?.[1]) return bareMatch[1];

  // try github shorthand: github:owner/repo
  const shorthandMatch = url.match(/^(?:github|gitlab|bitbucket):([^/]+)\//);
  if (shorthandMatch?.[1]) return shorthandMatch[1];

  // try full url: git://github.com/owner/repo.git or https://github.com/owner/repo
  const urlMatch = url.match(
    /(?:github|gitlab|bitbucket)\.(?:com|org)\/([^/]+)\//,
  );
  if (urlMatch?.[1]) return urlMatch[1];

  return null;
};

/**
 * .what = detects org from package.json via fallback chain
 * .why = enables auto-detection for keyrack init
 *
 * fallback chain:
 * 1. package.json#organization field (explicit)
 * 2. scoped name: @org/name → org
 * 3. repository field: github:org/repo → org
 */
export const getOrgFromPackageJson = async (
  _input: Record<string, never>,
  context: { gitroot: string },
): Promise<string | null> => {
  // check if package.json present
  const packageJsonPath = join(context.gitroot, 'package.json');
  if (!existsSync(packageJsonPath)) return null;

  // read package.json
  const packageJson: {
    organization?: string;
    name?: string;
    repository?: string | { type?: string; url: string };
  } = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  // 1. try organization field
  if (packageJson.organization) return packageJson.organization;

  // 2. try scoped name
  if (packageJson.name) {
    const orgFromScope = parseOrgFromScopedName({ name: packageJson.name });
    if (orgFromScope) return orgFromScope;
  }

  // 3. try repository field
  if (packageJson.repository) {
    const orgFromRepo = parseOrgFromRepositoryField({
      repository: packageJson.repository,
    });
    if (orgFromRepo) return orgFromRepo;
  }

  // no org source found
  return null;
};
