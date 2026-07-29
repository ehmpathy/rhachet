// .what = real-node probe: an esm-only role package loads through the peer site
//         getLinkedRolesWithHooks (ehmpathy/rhachet#429)
// .why  = spawned by importEsmSafe.realnode.acceptance.test.ts. getLinkedRolesWithHooks is
//         the SECOND peer load-site (beside getBrainHooksAdapterByConfigImplicit, proven by
//         case4). it loads a linked role package via node's require lookup -> importEsmSafe.
//         this drives that exact mechanism, in a real node child, against an ESM-ONLY fixture
//         role package (type:module, reached via an `exports` default condition) to prove the
//         fix loads an esm entry through THIS site too — so acc#5's per-site promise holds for
//         both peers, not one. the RED half proves a require() shim cannot load the fixture.
//
// argv[2] = absolute path to the built dist getLinkedRolesWithHooks.js
// argv[3] = a temp work dir; a fake user repo whose node_modules holds the esm role fixture
//           and whose .agent/repo=*/role=* dir links the role for discovery

const { mkdirSync, writeFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { join } = require('node:path');

const { getLinkedRolesWithHooks } = require(process.argv[2]);
const workDir = process.argv[3];

const main = async () => {
  // scaffold a fake user repo that declares an esm-only role package as a dep
  mkdirSync(workDir, { recursive: true });
  writeFileSync(
    join(workDir, 'package.json'),
    JSON.stringify({ dependencies: { 'rhachet-roles-esmfixture': '*' } }),
  );

  // link the role for discovery: getLinkedRolesWithHooks scans .agent/repo=<slug>/role=<slug>
  // dirs, derives packageName `rhachet-roles-<slug>`, and loads its getRoleRegistry.
  const roleLinkDir = join(
    workDir,
    '.agent',
    'repo=esmfixture',
    'role=esmfix-role',
  );
  mkdirSync(roleLinkDir, { recursive: true });

  // scaffold the esm-only fixture package in the repo's node_modules. type:module + a
  // top-level await makes index.js a genuinely esm-only entry a require() shim cannot load
  // (the top-level await defeats node's require-of-sync-esm, so require throws); the
  // `exports` default condition (no `main`) proves node's require lookup honors the
  // exports map, not just a main field. getRoleRegistry returns a role that carries
  // hooks.onBrain, so getLinkedRolesWithHooks includes it in its result.
  const pkgDir = join(
    workDir,
    'node_modules',
    'rhachet-roles-esmfixture',
  );
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(
    join(pkgDir, 'package.json'),
    JSON.stringify({
      name: 'rhachet-roles-esmfixture',
      type: 'module',
      exports: { '.': { default: './index.js' } },
    }),
  );
  writeFileSync(
    join(pkgDir, 'index.js'),
    'await 0;\n' +
      'export const getRoleRegistry = () => ({\n' +
      "  slug: 'esmfixture',\n" +
      "  readme: { uri: 'readme.md' },\n" +
      "  roles: [{ slug: 'esmfix-role', hooks: { onBrain: { slug: 'esmfix/onbrain' } } }],\n" +
      '});\n',
  );

  // RED: a require() shim cannot load the esm-only fixture (throws ERR_REQUIRE_ESM)
  let requireShimThrew = false;
  try {
    createRequire(join(pkgDir, 'index.js'))(join(pkgDir, 'index.js'));
  } catch {
    requireShimThrew = true;
  }

  // GREEN: the real peer site loads the esm fixture through node's require lookup +
  // importEsmSafe, reads its getRoleRegistry, and keeps the hooks.onBrain role
  const { roles, errors } = await getLinkedRolesWithHooks({
    cwd: workDir,
    gitroot: workDir,
  });

  const report = {
    requireShimThrew,
    roleLoaded: roles.some((role) => role.slug === 'esmfix-role'),
    errorCount: errors.length,
  };
  process.stdout.write(`REPORT_START${JSON.stringify(report)}REPORT_END`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
