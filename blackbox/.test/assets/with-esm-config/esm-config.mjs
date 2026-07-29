// .what = a genuinely esm-only rhachet user-config (ehmpathy/rhachet#429)
// .why  = the top-level `await` below makes this file unloadable by a require() shim —
//         the exact #429-broken path (tsc down-levels `await import()` to require() under
//         module:commonjs). so when the built-dist `act` binary reads this config through
//         importEsmSafe and gets the brains from getBrainRepls, that proves a real
//         runtime import() ran (a require() would have thrown, fail-loud, out of the load
//         site — never arrives at brain resolution). this is the CLI twin of the SDK
//         configLoad.realnode witness.
//
// getRoleRegistries returns [] on purpose: the act binary loads brains (non-empty, so it
// clears the "no brains available" gate) and THEN resolves the --role against these empty
// registries, so it halts fail-loud at role resolution — past the brain-load proof, and
// before any real inference (which the vision rules out of scope).
await 0;

export const getRoleRegistries = () => [];

export const getBrainRepls = () => [{ slug: 'test/esm-brain' }];
