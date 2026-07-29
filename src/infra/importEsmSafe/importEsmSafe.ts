import { asFlatModuleExports } from './asFlatModuleExports';

// .what = a real dynamic import() that survives tsc's commonjs down-level.
// .why  = `await import(x)` compiles to a require() shim under module:commonjs,
//         which cannot load esm-only packages; the import() hidden inside a
//         Function() body is opaque to tsc, so node runs the native import().
//         the `as` on an untyped Function() is a documented boundary exception
//         to rule.forbid.as-cast: `new Function` returns `Function` (untyped), so
//         the type system cannot express the import()-returns-a-module-namespace
//         shape. removal path: when rhachet moves off module:commonjs (node16/nodenext),
//         a bare `import(specifier)` compiles to a real runtime import and this whole
//         indirection + cast is deleted. see ehmpathy/rhachet#429.
// eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval
const importModuleAtRuntime = new Function(
  'specifier',
  'return import(specifier)',
) as (specifier: string) => Promise<Record<string, unknown>>;

/**
 * .what = perform a genuine runtime, esm-capable dynamic import of a module, with
 *         commonjs default-interop flattened so named exports are always reachable
 * .why  = under tsconfig `module: commonjs`, tsc down-levels `await import(x)` into a
 *         require() shim that cannot load esm-only packages (e.g. a brain that pins the
 *         esm-only @anthropic-ai/claude-agent-sdk). this indirection keeps the import()
 *         a real runtime import, so it loads both cjs and esm — and the flatten keeps
 *         the returned shape stable across cjs/esm so callers read named exports the
 *         same way regardless of the loaded module's system. see ehmpathy/rhachet#429.
 * .note = the caller declares the loaded module's export shape via TModule. this
 *         centralizes the one unavoidable boundary cast here, so call sites need no
 *         per-site `as { ... }` on the untyped third-party module.
 * .note = under jest, this CANNOT load a real third-party package — jest refuses native
 *         import() without --experimental-vm-modules (which breaks the shared harness via
 *         age-encryption). so any test of a caller's real-package load path must run as a
 *         real-node acceptance test against the BUILT dist (see blackbox/sdk/*.realnode.
 *         acceptance.test.ts), NOT a .test.ts/.integration.test.ts inside the jest process.
 *         a jest test of such a path silently sees an empty/failed load, not the real one.
 */
export const importEsmSafe = async <TModule = Record<string, unknown>>(input: {
  specifier: string;
}): Promise<TModule> => {
  const namespace = await importModuleAtRuntime(input.specifier);
  // as-cast exception: a dynamically-imported third-party module is untyped at this
  // boundary, so the flattened namespace is asserted to the caller's declared TModule —
  // the single, centralized boundary cast (removes duplicated per-call-site casts).
  // removal path: publish typed exports from the loaded packages and import them directly.
  // (rule.forbid.as-cast)
  return asFlatModuleExports({ namespace }) as TModule;
};
