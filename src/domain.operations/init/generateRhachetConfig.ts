/**
 * .what = converts a package name suffix to PascalCase
 * .why = generates valid TypeScript identifier suffixes for aliased imports
 */
const toPascalCase = (str: string): string =>
  str
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

/**
 * .what = generates rhachet.use.ts config file content
 * .why = enables auto-initialization from discovered role packages
 * .how = creates aliased imports and exports for registries and hooks
 */
export const generateRhachetConfig = (input: {
  packages: string[];
}): string => {
  // Always use aliased imports for consistency
  const imports = input.packages
    .map((pkg) => {
      const suffix = toPascalCase(pkg.replace('rhachet-roles-', ''));
      return `import { getRoleRegistry as getRoleRegistry${suffix}, getInvokeHooks as getInvokeHooks${suffix} } from '${pkg}';`;
    })
    .join('\n');

  const registries = input.packages
    .map(
      (pkg) =>
        `getRoleRegistry${toPascalCase(pkg.replace('rhachet-roles-', ''))}()`,
    )
    .join(', ');

  const hooks = input.packages
    .map(
      (pkg) =>
        `getInvokeHooks${toPascalCase(pkg.replace('rhachet-roles-', ''))}()`,
    )
    .join(', ');

  return `import type { InvokeHooks, RoleRegistry } from 'rhachet';

${imports}

export const getRoleRegistries = (): RoleRegistry[] => [${registries}];
export const getInvokeHooks = (): InvokeHooks[] => [${hooks}];
`;
};
