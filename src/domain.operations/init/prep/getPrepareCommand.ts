/**
 * .what = reconstruct prepare:rhachet command string from flags
 * .why = serialize current invocation for persistence in package.json
 */
export const getPrepareCommand = (input: {
  hooks: boolean;
  roles: string[];
}): string => {
  const parts = ['rhachet init'];

  // add --hooks if present
  if (input.hooks) parts.push('--hooks');

  // add --roles with space-separated values
  parts.push('--roles', input.roles.join(' '));

  return parts.join(' ');
};
