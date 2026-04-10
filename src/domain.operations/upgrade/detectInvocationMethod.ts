/**
 * .what = detects if rhachet was invoked via npx or global install
 * .why = determines default --which behavior for upgrade command
 *
 * .note = npm_execpath is set when invoked via npm/npx
 */
export const detectInvocationMethod = (): 'npx' | 'global' => {
  // npm_execpath is set when invoked via npm/npx
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) return 'npx';
  return 'global';
};
