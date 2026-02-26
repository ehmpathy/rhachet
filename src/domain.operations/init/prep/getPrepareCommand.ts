/**
 * .what = reconstruct prepare:rhachet command string from flags
 * .why = serialize current invocation for persistence in package.json
 */
export const getPrepareCommand = (input: {
  hooks: boolean;
  roles: string[];
  pkgName: string | null;
}): string => {
  const parts: string[] = [];

  // prepend build step for rhachet-roles-* repos
  const isRolesRepo = input.pkgName?.startsWith('rhachet-roles-') ?? false;
  if (isRolesRepo) parts.push('npm run build &&');

  // add rhachet init command
  parts.push('rhachet init');

  // add --hooks if present
  if (input.hooks) parts.push('--hooks');

  // add --roles with space-separated values
  parts.push('--roles', input.roles.join(' '));

  return parts.join(' ');
};
