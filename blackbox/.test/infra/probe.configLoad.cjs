// .what = real-node probe for the built config-explicit load sites (ehmpathy/rhachet#429, q1)
// .why  = the i018→i019 swap routed getBrainsByConfigExplicit /
//         getRoleHooksOnDispatchByConfigExplicit / getRoleRegistriesByConfigExplicit through
//         importEsmSafe. jest cannot witness a real import() (it refuses native import() without
//         a vm-modules flag that breaks the harness), so this real-node child loads an esm-only
//         user-config fixture through the BUILT functions and prints a json report the parent
//         asserts on: positive (an esm-only config loads + its exports are called) and fail-loud
//         (a broken config throws out of each site, never warn+skips — the .note invariant).
//
// argv[2] = a temp work dir for the on-disk fixtures
// argv[3] = absolute path to the built dist getBrainsByConfigExplicit.js
// argv[4] = absolute path to the built dist getRoleHooksOnDispatchByConfigExplicit.js
// argv[5] = absolute path to the built dist getRoleRegistriesByConfigExplicit.js

const { mkdirSync, writeFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');

const workDir = process.argv[2];
const { getBrainsByConfigExplicit } = require(process.argv[3]);
const { getRoleHooksOnDispatchByConfigExplicit } = require(process.argv[4]);
const { getRoleRegistriesByConfigExplicit } = require(process.argv[5]);

const main = async () => {
  // esm-only user-config fixture: type module + a top-level await (a require() shim cannot
  // load it), with a named export for each of the three config entrypoints the sites read
  const goodDir = join(workDir, 'good');
  mkdirSync(goodDir, { recursive: true });
  writeFileSync(join(goodDir, 'package.json'), '{ "type": "module" }');
  writeFileSync(
    join(goodDir, 'index.js'),
    [
      'await 0;',
      'export const getRoleRegistries = async () => [{ slug: "test/registry" }];',
      'export const getInvokeHooks = async () => ({ onInvokeAskInput: [{ slug: "ask/one" }] });',
      'export const getBrainRepls = async () => [{ slug: "test/brain" }];',
      '',
    ].join('\n'),
  );
  const goodConfig = pathToFileURL(join(goodDir, 'index.js')).href;

  // broken user-config fixture: esm-only, throws at import time (a real user-config bug)
  const brokenDir = join(workDir, 'broken');
  mkdirSync(brokenDir, { recursive: true });
  writeFileSync(join(brokenDir, 'package.json'), '{ "type": "module" }');
  writeFileSync(
    join(brokenDir, 'index.js'),
    'await 0;\nthrow new Error("boom in config");\n',
  );
  const brokenConfig = pathToFileURL(join(brokenDir, 'index.js')).href;

  // prove the fixture is genuinely esm-only: a require() shim (the pre-fix path) cannot load it,
  // so the positive load below is a real esm capability, not an accident of a cjs-loadable file
  let requireEsmConfigThrew = false;
  try {
    createRequire(join(goodDir, 'index.js'))(join(goodDir, 'index.js'));
  } catch {
    requireEsmConfigThrew = true;
  }

  // positive: each site loads the esm-only config through importEsmSafe and calls its export
  const registries = await getRoleRegistriesByConfigExplicit({
    opts: { config: goodConfig },
  });
  const hooks = await getRoleHooksOnDispatchByConfigExplicit({
    opts: { config: goodConfig },
  });
  const brains = await getBrainsByConfigExplicit({
    opts: { config: goodConfig },
  });

  // fail-loud: a broken config must THROW out of each site, never warn+skip (rule.forbid.failhide)
  const brokenThrew = async (fn) => {
    try {
      await fn({ opts: { config: brokenConfig } });
      return false;
    } catch {
      return true;
    }
  };
  const registriesThrewOnBroken = await brokenThrew(
    getRoleRegistriesByConfigExplicit,
  );
  const hooksThrewOnBroken = await brokenThrew(
    getRoleHooksOnDispatchByConfigExplicit,
  );
  const brainsThrewOnBroken = await brokenThrew(getBrainsByConfigExplicit);

  const report = {
    requireEsmConfigThrew,
    registrySlugs: registries.map((r) => r.slug),
    hookAskSlugs:
      hooks && hooks.onInvokeAskInput
        ? hooks.onInvokeAskInput.map((h) => h.slug)
        : null,
    brainSlugs: brains.map((b) => b.slug),
    registriesThrewOnBroken,
    hooksThrewOnBroken,
    brainsThrewOnBroken,
  };
  process.stdout.write(`REPORT_START${JSON.stringify(report)}REPORT_END`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
