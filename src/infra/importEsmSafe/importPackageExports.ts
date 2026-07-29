import { getOnePackageEntryUrl } from './getOnePackageEntryUrl';
import { importEsmSafe } from './importEsmSafe';

/**
 * .what = load a third-party package's exports from a caller repo, esm-safe, as a resilient
 *         result union — { ok: true, module } on success, { ok: false, error } on any load
 *         failure. never throws.
 * .why  = three sites load a third-party brain/role package and must isolate one bad package
 *         so it never sinks discovery of the rest (acc#3): getAvailableBrains,
 *         getBrainHooksAdapterByConfigImplicit, getLinkedRolesWithHooks. this centralizes the
 *         ONE resolution strategy they share (caller-rooted getOnePackageEntryUrl +
 *         importEsmSafe) and the ONE load-isolation boundary, so every load site resolves a
 *         package identically and a bad package is data (a { ok: false }) in the caller's flow
 *         rather than a throw each site must re-catch. each caller presents the { ok: false }
 *         case in its own channel (warn / structured errors[]) — this leaf owns the load, not
 *         the presentation. (ehmpathy/rhachet#429)
 * .why-union-not-throw = the callers loop over discovered packages and must CONTINUE past a
 *         bad one; a union return keeps the fault in the caller's data flow (check ok, record,
 *         continue) instead of a throw that must be wrapped at every call site.
 * .why-caller-rooted = one uniform resolution strategy across all three sites (closes the
 *         prior asymmetry where getAvailableBrains used a bare specifier — resolved from
 *         rhachet's own install location via hoisting — while the peers resolved from the
 *         caller repo). getOnePackageEntryUrl resolves from the caller's package.json, which
 *         is where discoverBrainPackages found the dependency in the first place, so the lookup
 *         is explicit and consistent rather than reliant on npm/pnpm hoisting semantics.
 * .boundary = resolution uses getOnePackageEntryUrl's commonjs conditions; a package whose
 *         exports expose ONLY a bare `import` condition (no default/main fallback) is
 *         unreachable and returns { ok: false } — now UNIFORMLY across all three sites, not an
 *         asymmetry. no current brain/role package carries that shape; see getOnePackageEntryUrl.
 * .note = this leaf isolates the LOAD phase only. a package can load fine yet throw when its
 *         exports are USED (a malformed registry, a throwing collector); that USE-phase
 *         isolation stays with each caller, next to the use, so a bug in our own use-code
 *         fails loud rather than hidden under a "bad package" warn (rule.forbid.failhide).
 * .note-root = "uniform resolution strategy" means one lookup ALGORITHM, not an identical root:
 *         the caller passes fromPackageJson — cwd/package.json for the two package.json-driven
 *         sites, gitroot/package.json for getLinkedRolesWithHooks (whose .agent/ always lives at
 *         gitroot). that root difference is by design; a future reader should not "fix" it.
 */
export const importPackageExports = async <TModule>(input: {
  packageName: string;
  fromPackageJson: string;
}): Promise<{ ok: true; module: TModule } | { ok: false; error: Error }> => {
  try {
    // resolve the package entry from the caller repo (honors its exports map) and load it
    // esm-safe as a file: URL — the one shared resolution strategy for all load sites
    const entryUrl = getOnePackageEntryUrl({
      packageName: input.packageName,
      fromPackageJson: input.fromPackageJson,
    });
    const module = await importEsmSafe<TModule>({ specifier: entryUrl });
    return { ok: true, module };
  } catch (error) {
    // isolate the load failure as data — the caller decides how to present it
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};
