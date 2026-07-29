// .what = real-node probe: an esm-only brain package loads through the peer site
//         getBrainHooksAdapterByConfigImplicit (ehmpathy/rhachet#429)
// .why  = spawned by importEsmSafe.realnode.acceptance.test.ts. the peer load-sites
//         (getBrainHooksAdapterByConfigImplicit, getLinkedRolesWithHooks) both load a
//         third-party package via node's require lookup -> importEsmSafe. this drives that
//         exact mechanism, in a real node child, against an ESM-ONLY fixture package
//         (type:module, reached via an `exports` default condition) to prove the fix
//         actually loads an esm entry through this site — the outcome acc#5 promises. the
//         RED half proves a require() shim cannot load the same fixture.
//
// argv[2] = absolute path to the built dist getBrainHooksAdapterByConfigImplicit.js
// argv[3] = a temp work dir; a fake user repo whose node_modules holds the esm fixture

const { mkdirSync, writeFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { join } = require('node:path');

const { getBrainHooksAdapterByConfigImplicit } = require(process.argv[2]);
const workDir = process.argv[3];

const main = async () => {
  // scaffold a fake user repo that declares an esm-only brain package as a dep
  mkdirSync(workDir, { recursive: true });
  writeFileSync(
    join(workDir, 'package.json'),
    JSON.stringify({ dependencies: { 'rhachet-brains-esmfixture': '*' } }),
  );

  // scaffold the esm-only fixture package in the repo's node_modules. type:module + a
  // top-level await makes index.js a genuinely esm-only entry a require() shim cannot load
  // (the top-level await defeats node's require-of-sync-esm, so require throws); the
  // `exports` default condition (no `main`) proves node's require lookup honors the
  // exports map, not just a main field.
  const pkgDir = join(workDir, 'node_modules', 'rhachet-brains-esmfixture');
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(
    join(pkgDir, 'package.json'),
    JSON.stringify({
      name: 'rhachet-brains-esmfixture',
      type: 'module',
      exports: { '.': { default: './index.js' } },
    }),
  );
  writeFileSync(
    join(pkgDir, 'index.js'),
    'await 0;\n' +
      'export const getBrainHooks = ({ brain }) =>\n' +
      "  brain === 'esmfix-brain' ? { slug: 'esmfix/adapter' } : null;\n",
  );

  // RED: a require() shim cannot load the esm-only fixture (throws ERR_REQUIRE_ESM)
  let requireShimThrew = false;
  try {
    createRequire(join(pkgDir, 'index.js'))(join(pkgDir, 'index.js'));
  } catch {
    requireShimThrew = true;
  }

  // GREEN: the real peer site loads the esm fixture through node's require lookup +
  // importEsmSafe, then calls its getBrainHooks
  const adapter = await getBrainHooksAdapterByConfigImplicit(
    { brain: 'esmfix-brain' },
    { cwd: workDir, gitroot: workDir },
  );

  const report = {
    requireShimThrew,
    adapterLoaded: adapter?.slug === 'esmfix/adapter',
  };
  process.stdout.write(`REPORT_START${JSON.stringify(report)}REPORT_END`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
