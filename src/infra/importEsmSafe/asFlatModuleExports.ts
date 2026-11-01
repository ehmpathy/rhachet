/**
 * .what = flatten a module namespace so a commonjs default-interop export is hoisted
 * .why  = a real import() of a commonjs package exposes its `module.exports` under
 *         `.default` (esm interop), and only the statically-detectable named exports at
 *         the top level (via node's cjs-module-lexer). a package that re-exports at
 *         runtime (e.g. tsc's `__exportStar`) may not be fully lexer-detectable, so its
 *         named exports land ONLY under `.default`. hoist the object `default`'s keys
 *         beneath the top-level keys so callers find named exports (getBrainAtomsBy*,
 *         getBrainHooks, getRoleRegistry, ...) whether the loader hoisted them or nested
 *         them under default. top-level keys win on conflict (no double-count).
 * .note = node >= 23 adds a `'module.exports'` key to a commonjs namespace, an alias of
 *         the same object as `default`. it is dropped, so the shape is the same on every
 *         node; a `'module.exports'` export that is NOT that alias is kept
 */
export const asFlatModuleExports = (input: {
  namespace: Record<string, unknown>;
}): Record<string, unknown> => {
  const defaultExport = input.namespace.default;

  // only an object default is a commonjs module.exports to hoist (a function/value
  // default is a real default export, left untouched under its `default` key)
  const fromDefault =
    typeof defaultExport === 'object' && defaultExport !== null
      ? defaultExport
      : {};

  // drop node's commonjs alias key, which repeats `default` under a second name
  const { 'module.exports': aliasOfDefault, ...namespaceRest } =
    input.namespace;
  const namespaceKept =
    'module.exports' in input.namespace && aliasOfDefault !== defaultExport
      ? input.namespace
      : namespaceRest;

  return { ...fromDefault, ...namespaceKept };
};
