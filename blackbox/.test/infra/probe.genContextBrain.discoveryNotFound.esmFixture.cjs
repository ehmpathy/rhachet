// .what = real-node probe: discovery-mode BrainChoiceNotFoundError, driven against a FIXED
//         esm-only brain fixture, so the not-found message is DETERMINISTIC + snapshot-able
// .why  = recovers the snapshot observability the removed genContextBrain.integration.test
//         held: it snapshotted the discovery-fed not-found message, but drove it against the
//         REAL installed registry (environment-brittle: any brain dep bump broke it) AND under
//         jest (which cannot witness importEsmSafe's native import(), so discovery returned an
//         empty registry). a real node child + a FIXED esm brain fixture restores a
//         deterministic snapshot of the discovery path's three not-found variants (generic /
//         repl / atom) WITHOUT the brittleness that forced the original's removal. the fixture
//         is esm-only, so discovery must go through importEsmSafe — the #429 fix under proof.
//
// argv[2] = absolute path to built dist genContextBrain (contract sdk.brains.js)
// argv[3] = a temp work dir; a fake user repo whose node_modules holds the esm brain fixture

const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const { genContextBrain } = require(process.argv[2]);
const workDir = process.argv[3];

const main = async () => {
  // scaffold a fake user repo that declares an esm-only brain package as a dep
  mkdirSync(workDir, { recursive: true });
  writeFileSync(
    join(workDir, 'package.json'),
    JSON.stringify({ dependencies: { 'rhachet-brains-esmfixture': '*' } }),
  );

  // scaffold a FIXED esm-only brain fixture: a deterministic registry of exactly one atom +
  // one repl. type:module + a top-level await make index.js a genuinely esm-only entry a
  // require() shim cannot load, so discovery must reach it through importEsmSafe (the fix).
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
    [
      'await 0;',
      'export const getBrainAtomsByFixture = () => [',
      "  { repo: 'esmfix', slug: 'atom-alpha', description: 'fixture atom', spec: {}, ask: () => {} },",
      '];',
      'export const getBrainReplsByFixture = () => [',
      "  { repo: 'esmfix', slug: 'repl-beta', description: 'fixture repl', spec: {}, ask: () => {}, act: () => {} },",
      '];',
      '',
    ].join('\n'),
  );

  // point discovery at the fixture repo (cwd) — no rhachet.use.ts there, so genContextBrain
  // takes the discovery path: getAvailableBrains -> discoverBrainPackages -> importEsmSafe
  const context = { cwd: workDir, gitroot: workDir };

  // drive the three discovery-mode not-found variants against the fixed fixture registry
  const capture = async (choice) => {
    try {
      await genContextBrain({ choice }, context);
      return null;
    } catch (error) {
      return {
        name: error && error.constructor ? error.constructor.name : null,
        message: error && error.message ? String(error.message) : '',
      };
    }
  };

  const report = {
    generic: await capture('zzz/absent'),
    repl: await capture({ repl: 'zzz/absent' }),
    atom: await capture({ atom: 'zzz/absent' }),
  };
  process.stdout.write(`REPORT_START${JSON.stringify(report)}REPORT_END`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
