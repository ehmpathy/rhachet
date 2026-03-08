/**
 * .what = reconstruct prepare:rhachet command string from flags
 * .why = serialize current invocation for persistence in package.json
 */
export const getPrepareCommand = (input: {
  hooks: boolean;
  roles: string[];
  pkgName: string | null;
  devDependencies?: Record<string, string> | null;
}): string => {
  const parts: string[] = [];

  // prepend build step for rhachet-roles-* and rhachet-brains-* repos
  const isRolesRepo = input.pkgName?.startsWith('rhachet-roles-') ?? false;
  const isBrainsRepo = input.pkgName?.startsWith('rhachet-brains-') ?? false;

  // detect local self-ref (e.g., rhachet with rhachet: 'link:.' or 'file:.')
  const selfRef = input.pkgName ? input.devDependencies?.[input.pkgName] : null;
  const hasSelfRef =
    selfRef?.startsWith('link:.') || selfRef?.startsWith('file:.');

  // prepend build for supplier repos or local self-ref repos
  if (isRolesRepo || isBrainsRepo || hasSelfRef) parts.push('npm run build &&');

  // add rhachet init command
  parts.push('rhachet init');

  // add --hooks if present
  if (input.hooks) parts.push('--hooks');

  // add --roles with space-separated values
  parts.push('--roles', input.roles.join(' '));

  return parts.join(' ');
};
