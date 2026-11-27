import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * .what = the entry a package manifest names: its root `exports` (require, node, then default
 *         condition), else `main`, else `index.js`
 * .why = the walk reads the manifest by hand, so it honors the same conditions the commonjs
 *        lookup would, in the same order
 */
const asPackageEntryOfManifest = (input: { manifest: unknown }): string => {
  const manifest =
    input.manifest && typeof input.manifest === 'object'
      ? (input.manifest as Record<string, unknown>) // a parsed json, read field by field; retire once a manifest type guard exists
      : {};
  const exportsRoot = (() => {
    const exportsField = manifest.exports;
    if (typeof exportsField === 'string') return exportsField;
    if (!exportsField || typeof exportsField !== 'object') return null;
    const record = exportsField as Record<string, unknown>; // a parsed json, read field by field; retire once a manifest type guard exists
    return '.' in record ? record['.'] : record;
  })();
  if (typeof exportsRoot === 'string') return exportsRoot;
  if (exportsRoot && typeof exportsRoot === 'object') {
    const conditions = exportsRoot as Record<string, unknown>; // a parsed json, read by key; retire once a manifest type guard exists
    const entry = ['require', 'node', 'default']
      .map((condition) => conditions[condition])
      .find((value): value is string => typeof value === 'string');
    if (entry) return entry;
  }
  if (typeof manifest.main === 'string') return manifest.main;
  return 'index.js';
};

/**
 * .what = the file an entry names: itself, itself with `.js`, or its `index.js`
 * .why = a manifest may name `dist/index` or `dist`, as node's commonjs lookup accepts
 */
const getOneEntryFileOrNull = (input: { path: string }): string | null => {
  const candidates = [
    input.path,
    `${input.path}.js`,
    join(input.path, 'index.js'),
  ];
  return (
    candidates.find(
      (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
    ) ?? null
  );
};

/**
 * .what = a dir and each of its ancestors, up to the fs root
 * .why = node's lookup tries the node_modules of each, nearest first
 */
const getAllDirsAncestor = (input: { dir: string }): string[] => {
  const parent = dirname(input.dir);
  if (parent === input.dir) return [input.dir];
  return [input.dir, ...getAllDirsAncestor({ dir: parent })];
};

/**
 * .what = the dir of a package in the nearest node_modules that holds it, or null
 * .why = node's lookup tries the node_modules of each ancestor, nearest first
 */
const getOnePackageDirByWalk = (input: {
  fromDir: string;
  packageName: string;
}): string | null =>
  getAllDirsAncestor({ dir: input.fromDir })
    .map((dir) => join(dir, 'node_modules', input.packageName))
    .find((dir) => existsSync(join(dir, 'package.json'))) ?? null;

/**
 * .what = the entry file of a package, found by a walk up the node_modules dirs from a caller
 *         repo's package.json, or null where no dir holds the package
 * .why = a bun-compiled binary may fail to look a package up from a caller repo where node
 *        finds it (measured: `rhx bun.compiled.lookup.probe --at blackbox/.test/assets/with-mods
 *        --pkg rhachet-roles-test`), yet it reads the file and imports it by path. the walk is
 *        the lookup the runtime could not do, so a role's package loads under either runtime
 *
 * .note = the walk honors the root `exports` conditions and `main`, never a subpath export;
 *   a role package is loaded by its root alone
 */
export const getOnePackageEntryPathByWalk = (input: {
  packageName: string;
  fromPackageJson: string;
}): string | null => {
  // the first dir whose node_modules holds the package, and the file its manifest names
  const dirPackage = getOnePackageDirByWalk({
    fromDir: dirname(input.fromPackageJson),
    packageName: input.packageName,
  });
  if (!dirPackage) return null;
  const manifest: unknown = JSON.parse(
    readFileSync(join(dirPackage, 'package.json'), 'utf-8'),
  );
  return getOneEntryFileOrNull({
    path: join(dirPackage, asPackageEntryOfManifest({ manifest })),
  });
};
