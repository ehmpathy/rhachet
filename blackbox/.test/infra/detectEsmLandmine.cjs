// .what = the shared, subpath-precise, environment-independent detector for a #468 esm-require
//         landmine: given a require() specifier recorded during a module-eval walk, decide whether a
//         real CJS require() of THAT EXACT request would hit a pure-esm module and throw
//         `Must use import to load ES Module`.
//
// .why  = every real-node acceptance clamp that hooks Module._load to audit the eval graph
//         (keyrack, brain-context) needs the SAME landmine test — so it lives here ONCE, not as a
//         per-probe copy (rule.require.shared-test-fixtures). the sole detector also removes the
//         adhoc hardcoded package-name list each probe used to carry: this reads the real installed
//         package manifests, so a NEW pure-esm dep is caught with no list to keep in sync.
//
// .how  = map the ACTUAL request to its file under the CJS (require) condition set, then inspect that
//         file's static module type. this is:
//           - subpath-precise: `require.resolve(request)` honors the exact subpath's export
//             conditions, so a package that is import-only on the IMPORTED subpath is flagged even if
//             a `require` condition sits on some UNRELATED subpath. (the prior whole-package.json
//             `JSON.stringify(exports).includes('"require"')` string-search false-negatived exactly
//             this — a `require` anywhere cleared the whole package.)
//           - environment-independent: it maps + reads file type statically, never EXECUTES. a
//             modern node (22.12+) CAN require() an esm file without a throw, so "does require()
//             throw" is a node-version-bound signal that false-passes; the mapped-file-type read
//             does not depend on the running node's require-esm support.

const { builtinModules } = require('node:module');
const { existsSync, readFileSync } = require('node:fs');
const { dirname, join } = require('node:path');

// .what = the effective module `type` of the package nearest a file (walk up to the first
//         package.json). node defaults an absent `type` to commonjs.
const getNearestPackageType = (filePath) => {
  let dir = dirname(filePath);
  for (;;) {
    const pkgJsonPath = join(dir, 'package.json');
    if (existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
        return typeof pkg.type === 'string' ? pkg.type : 'commonjs';
      } catch {
        return 'commonjs';
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return 'commonjs'; // reached the filesystem root
    dir = parent;
  }
};

// .what = is the mapped file loaded as esm? decided statically by extension + nearest package.json
//         `type`, never by execution. `.mjs` is always esm, `.cjs` always commonjs, `.js` follows the
//         nearest `type`. non-js targets (`.node`, `.json`) are not an esm-require landmine.
const isEsmFile = (filePath) => {
  if (filePath.endsWith('.mjs')) return true;
  if (filePath.endsWith('.cjs')) return false;
  if (filePath.endsWith('.js'))
    return getNearestPackageType(filePath) === 'module';
  return false;
};

// .what = derive the installed package name from a specifier
//         ('@scope/name/sub' -> '@scope/name'; 'name/sub' -> 'name'). used only for a legible,
//         deduped report of WHICH packages were flagged — never for the landmine decision itself.
const asPackageName = (request) => {
  const segments = request.split('/');
  return request.startsWith('@')
    ? segments.slice(0, 2).join('/')
    : segments[0];
};

// .what = would a real CJS require() of THIS EXACT request hit a pure-esm module and throw? the one
//         #468 landmine test. `lookupPaths` is where to look the request up FROM — pass the dir of
//         the module that actually require()d it (its `parent` in the Module._load hook), so the
//         request maps to the EXACT installed copy + export-condition the real require() hit. a
//         fixed origin (e.g. only the built dist dir) false-flags a dual-published transitive dep
//         whose deep subpath is unexported when looked up from an unrelated origin — even though its
//         real require, from its true parent, maps to a dist-cjs file.
const isEsmLandmineRequest = (request, lookupPaths) => {
  // internal (relative/absolute) modules + node builtins are never the landmine
  if (request.startsWith('.') || request.startsWith('/')) return false;
  if (request.startsWith('node:')) return false;
  if (builtinModules.includes(request)) return false;

  // map the EXACT request to its file under the require/cjs condition set — what a real require() gets
  let mapped;
  try {
    mapped = require.resolve(request, { paths: lookupPaths });
  } catch (error) {
    // ERR_PACKAGE_PATH_NOT_EXPORTED: the package's exports expose NO require/default path for this
    // subpath (it is import-only) — a CJS require() cannot load it, so it IS a landmine for this
    // request. any other lookup miss (ERR_MODULE_NOT_FOUND, a bad internal path) is not a #468
    // landmine and must not be flagged.
    if (error && error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') return true;
    return false;
  }

  // it mapped under require conditions — a landmine only if the mapped file is esm
  return isEsmFile(mapped);
};

module.exports = { isEsmLandmineRequest, asPackageName };
