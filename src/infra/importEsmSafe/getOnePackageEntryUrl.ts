import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * .what = looks up a package's entry file as a file: URL, from a caller repo's package.json
 * .why  = all three brain/role load-sites (getAvailableBrains,
 *         getBrainHooksAdapterByConfigImplicit, getLinkedRolesWithHooks) load a third-party
 *         package FROM THE CALLER'S repo (context.cwd/gitroot), honor the package's exports
 *         map, then hand the entry to importEsmSafe as a file: URL so an esm entry loads too.
 *         all three route that load through the shared importPackageExports leaf, which calls
 *         this one lookup — so the 3-step dance (createRequire from the caller root →
 *         require.resolve → pathToFileURL), and its boundary rationale, live in exactly one
 *         place, not duplicated per load-site where the prose could drift.
 *
 * .why-not-bare-specifier = a bare specifier handed to importEsmSafe looks up from
 *         importEsmSafe's OWN location, not the caller's repo, so a package linked into a
 *         downstream repo is not found. createRequire(callerRoot) runs node's module lookup
 *         from the caller instead. and require.resolve honors the exports map (require/node/
 *         default conditions + main), unlike a read of package.json.main directly, which
 *         ignores exports entirely.
 *
 * .boundary = the commonjs lookup honors an esm entry reached via a default/main fallback
 *         (the ehmpathy/rhachet#429 target packages — e.g. the anthropic brain, whose OWN
 *         entry is commonjs-reachable while its dependency graph is esm-only — all carry
 *         one), but NOT a package whose exports expose ONLY a bare `import` condition, which
 *         needs an esm lookup unavailable under module:commonjs. such a package throws here
 *         and is caught at each caller's load boundary (warn/skip, acc#3): it drops from that
 *         registry instead of a crash of it.
 * .boundary-is-uniform = all three load-sites route through this one lookup, so the
 *         import-only-exports bound is IDENTICAL at every site — there is no primary-vs-peer
 *         asymmetry. acc#5 ("same indirection wherever a brain/plugin loads") holds for all
 *         current brain/role packages (which carry a commonjs-reachable entry). the
 *         import-only-exports shape is a known, uniform limitation of the commonjs-conditions
 *         strategy: to reach it, a caller would pass a bare specifier to importEsmSafe (which
 *         honors node's esm lookup), a strategy-level choice out of this fix's scope. see
 *         ehmpathy/rhachet#429.
 */
export const getOnePackageEntryUrl = (input: {
  packageName: string;
  fromPackageJson: string;
}): string => {
  const require = createRequire(input.fromPackageJson);
  return pathToFileURL(require.resolve(input.packageName)).href;
};
