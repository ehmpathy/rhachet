// .what = real-node probe: the getAvailableBrains loop isolates a bad package (acc#3)
// .why  = spawned by importEsmSafe.realnode.acceptance.test.ts. proves the discovery loop
//         CONTINUES past a package that fails to load and still aggregates a healthy
//         peer's brains — the exact behavior acc#3 promises ("a single bad brain never
//         sinks the registry"), end-to-end through the real built getAvailableBrains. the
//         unit clamp (getBrainsFromPackageExports.test.ts case2) proves ONE package
//         degrades in isolation; this proves the LOOP survives and keeps the healthy one.
//
// argv[2] = absolute path to the built dist getAvailableBrains.js
// argv[3] = a temp work dir; its package.json declares a healthy + an absent brain package

const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const { getAvailableBrains } = require(process.argv[2]);
const workDir = process.argv[3];

const main = async () => {
  // a curated package.json: one healthy REAL brain package (resolvable from this repo's
  // node_modules via the built dist) beside an absent one whose import() throws. discovery
  // reads context.cwd/package.json, so this list drives the loop; the bare-specifier
  // import() resolves from the dist location, so the healthy package still loads.
  mkdirSync(workDir, { recursive: true });
  writeFileSync(
    join(workDir, 'package.json'),
    JSON.stringify({
      dependencies: {
        'rhachet-brains-anthropic': '*',
        'rhachet-brains-doesnotexist': '*',
      },
    }),
  );

  const brains = await getAvailableBrains({}, { cwd: workDir });

  const report = {
    // the healthy peer survived the bad package in the same loop
    healthySurvived: brains.atoms.some((a) => a.repo === 'anthropic'),
    atomCount: brains.atoms.length,
    replCount: brains.repls.length,
  };
  process.stdout.write(`REPORT_START${JSON.stringify(report)}REPORT_END`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
