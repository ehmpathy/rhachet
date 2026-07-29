// .what = real-node probe for the built importEsmSafe (ehmpathy/rhachet#429)
// .why  = spawned by importEsmSafe.realnode.acceptance.test.ts in a real node child,
//         where a genuine import() runs — jest refuses import() without a vm-modules
//         flag, and that flag breaks the whole harness. the probe creates esm-only,
//         cjs, and lexer-undetectable-cjs fixtures, loads each via the BUILT
//         importEsmSafe, and prints a json report the parent test asserts on.
//
// argv[2] = absolute path to the built dist/infra/importEsmSafe/importEsmSafe.js
// argv[3] = a temp work dir for the on-disk fixtures
// argv[4] = absolute path to the built dist asBrainsFromPackageExports.js

const { mkdirSync, writeFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');

const { importEsmSafe } = require(process.argv[2]);
const workDir = process.argv[3];
// use the REAL production asBrainsFromPackageExports (not a hand mirror), so the acc#4
// RED/GREEN clamp proves the actual getAvailableBrains extraction contract, drift-free.
const { asBrainsFromPackageExports } = require(process.argv[4]);

const main = async () => {
  // esm-only fixture: type module + a top-level await (a require() cannot load it)
  const esmDir = join(workDir, 'esm');
  mkdirSync(esmDir, { recursive: true });
  writeFileSync(join(esmDir, 'package.json'), '{ "type": "module" }');
  writeFileSync(
    join(esmDir, 'index.js'),
    'await 0;\nexport const getBrainAtomsByTestFixture = () => [{ slug: "test/fixture" }];\n',
  );

  // cjs fixture: a plain commonjs module (the fix must stay a superset)
  const cjsDir = join(workDir, 'cjs');
  mkdirSync(cjsDir, { recursive: true });
  writeFileSync(join(cjsDir, 'package.json'), '{ "type": "commonjs" }');
  writeFileSync(
    join(cjsDir, 'index.js'),
    'module.exports.getBrainAtomsByTestFixture = () => [{ slug: "test/fixture" }];\n',
  );

  // cjs-dynamic fixture: a named export hidden from the static lexer via Object.assign,
  // so a real import() lands it only under .default (the .default hoist path)
  const cjsDynDir = join(workDir, 'cjsdyn');
  mkdirSync(cjsDynDir, { recursive: true });
  writeFileSync(join(cjsDynDir, 'package.json'), '{ "type": "commonjs" }');
  writeFileSync(
    join(cjsDynDir, 'index.js'),
    'Object.assign(module.exports, { getBrainAtomsByDynamic: () => [{ slug: "test/dynamic" }] });\n',
  );

  const esm = await importEsmSafe({
    specifier: pathToFileURL(join(esmDir, 'index.js')).href,
  });
  const cjs = await importEsmSafe({
    specifier: pathToFileURL(join(cjsDir, 'index.js')).href,
  });
  const cjsDyn = await importEsmSafe({
    specifier: pathToFileURL(join(cjsDynDir, 'index.js')).href,
  });

  // prove the pre-fix path (a require() shim) cannot load the esm-only fixture
  let requireEsmThrew = false;
  try {
    createRequire(join(esmDir, 'index.js'))(join(esmDir, 'index.js'));
  } catch {
    requireEsmThrew = true;
  }

  // reproduce the getAvailableBrains discovery contract on the esm-only fixture, BOTH
  // ways, so the clamp bites RED on the old require()-shim path and GREEN on the fix.
  // uses the REAL production asBrainsFromPackageExports (required above), so the proof
  // cannot drift from what getAvailableBrains actually does.

  // old path: `await import()` down-leveled to a require() shim — throws on the esm
  // module, caught by the same fault isolation getAvailableBrains uses, yields []. (RED)
  let discoveryOldAtomCount;
  try {
    const oldExports = createRequire(join(esmDir, 'index.js'))(
      join(esmDir, 'index.js'),
    );
    discoveryOldAtomCount = asBrainsFromPackageExports({
      exports: oldExports,
    }).atoms.length;
  } catch {
    discoveryOldAtomCount = 0;
  }

  // new path: importEsmSafe loads the esm module, so extraction finds the brain. (GREEN)
  const discoveryNewAtomCount = asBrainsFromPackageExports({
    exports: esm,
  }).atoms.length;

  // negative path: a specifier that points at an absent file must REJECT (not settle to
  // a silent empty), so callers' fault isolation can catch + warn deterministically.
  let importRejectedOnAbsent = false;
  try {
    await importEsmSafe({
      specifier: pathToFileURL(join(workDir, 'does-not-exist.js')).href,
    });
  } catch {
    importRejectedOnAbsent = true;
  }

  const report = {
    esmKeys: Object.keys(esm),
    esmValue:
      typeof esm.getBrainAtomsByTestFixture === 'function'
        ? esm.getBrainAtomsByTestFixture()
        : null,
    cjsValue:
      typeof cjs.getBrainAtomsByTestFixture === 'function'
        ? cjs.getBrainAtomsByTestFixture()
        : null,
    cjsDynKeys: Object.keys(cjsDyn),
    cjsDynValue:
      typeof cjsDyn.getBrainAtomsByDynamic === 'function'
        ? cjsDyn.getBrainAtomsByDynamic()
        : null,
    requireEsmThrew,
    discoveryOldAtomCount,
    discoveryNewAtomCount,
    importRejectedOnAbsent,
  };
  process.stdout.write(`REPORT_START${JSON.stringify(report)}REPORT_END`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
