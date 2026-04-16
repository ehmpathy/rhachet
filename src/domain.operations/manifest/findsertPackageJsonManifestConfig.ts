/**
 * .what = findserts manifest config into package.json structure
 * .why = ensures rhachet.repo.yml is included in package files and exports
 *
 * .note = modifies files array and exports field for npm publish compatibility
 */
export const findsertPackageJsonManifestConfig = (input: {
  packageJson: {
    files?: string[];
    exports?: Record<string, string>;
    [key: string]: unknown;
  };
}): {
  packageJson: typeof input.packageJson;
  changed: boolean;
  additions: string[];
} => {
  const { packageJson } = input;
  let changed = false;
  const additions: string[] = [];

  // findsert rhachet.repo.yml into files array
  const filesArray: string[] = packageJson.files ?? [];
  const manifestFilename = 'rhachet.repo.yml';
  const filesArrayContainsManifest = filesArray.includes(manifestFilename);
  if (!filesArrayContainsManifest) {
    packageJson.files = [...filesArray, manifestFilename];
    changed = true;
    additions.push(`package.json:.files += "${manifestFilename}"`);
  }

  // findsert ./package.json into exports (required for esm compatibility)
  const exportsField: Record<string, string> | undefined = packageJson.exports;
  if (exportsField && !exportsField['./package.json']) {
    packageJson.exports = {
      ...exportsField,
      './package.json': './package.json',
    };
    changed = true;
    additions.push(`package.json:.exports += "./package.json"`);
  }

  return { packageJson, changed, additions };
};
