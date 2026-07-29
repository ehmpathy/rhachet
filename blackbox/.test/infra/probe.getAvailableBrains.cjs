// .what = real-node probe for the built getAvailableBrains (ehmpathy/rhachet#429)
// .why  = spawned by importEsmSafe.realnode.acceptance.test.ts in a real node child,
//         where import() of the esm-only anthropic brain runs. it exercises the discovery
//         path against the brain packages installed in this repo — the exact #429 scenario
//         (the anthropic brain pins the esm-only @anthropic-ai/claude-agent-sdk). the
//         parent test asserts on the json report.
//
// argv[2] = absolute path to the built dist getAvailableBrains.js
// cwd     = the repo whose package.json declares the rhachet-brains-* deps

const { getAvailableBrains } = require(process.argv[2]);

const main = async () => {
  const brains = await getAvailableBrains();

  // dedup check: no repo/slug pair may repeat (dedupeBrainsBySlug, first-wins)
  const atomSlugs = brains.atoms.map((a) => `${a.repo}/${a.slug}`);
  const replSlugs = brains.repls.map((r) => `${r.repo}/${r.slug}`);
  const atomHasDupSlugs = new Set(atomSlugs).size !== atomSlugs.length;
  const replHasDupSlugs = new Set(replSlugs).size !== replSlugs.length;

  // callable check: EVERY discovered brain exposes its invocation methods (not just the
  // first) — an atom must expose ask(); a repl must expose BOTH ask() and act(). a
  // first-item-only check would let a single malformed brain deep in the registry slip by.
  const allAtomsAskIsFunction =
    brains.atoms.length > 0 &&
    brains.atoms.every((a) => typeof a.ask === 'function');
  const allReplsAskIsFunction =
    brains.repls.length > 0 &&
    brains.repls.every((r) => typeof r.ask === 'function');
  const allReplsActIsFunction =
    brains.repls.length > 0 &&
    brains.repls.every((r) => typeof r.act === 'function');

  // domain-shape check: EVERY real discovered brain is a well-formed BrainAtom/BrainRepl —
  // repo, slug, description populated (non-empty strings) and spec present. proves the real
  // installed npm packages actually yield well-formed domain objects, not just callable stubs.
  const isWellFormedBrain = (b) =>
    typeof b.repo === 'string' &&
    b.repo.length > 0 &&
    typeof b.slug === 'string' &&
    b.slug.length > 0 &&
    typeof b.description === 'string' &&
    b.description.length > 0 &&
    b.spec !== null &&
    b.spec !== undefined &&
    typeof b.spec === 'object';
  const allAtomsWellFormed =
    brains.atoms.length > 0 && brains.atoms.every(isWellFormedBrain);
  const allReplsWellFormed =
    brains.repls.length > 0 && brains.repls.every(isWellFormedBrain);

  const report = {
    atomRepos: [...new Set(brains.atoms.map((a) => a.repo))],
    replRepos: [...new Set(brains.repls.map((r) => r.repo))],
    atomCount: brains.atoms.length,
    replCount: brains.repls.length,
    atomHasDupSlugs,
    replHasDupSlugs,
    allAtomsAskIsFunction,
    allReplsAskIsFunction,
    allReplsActIsFunction,
    allAtomsWellFormed,
    allReplsWellFormed,
  };
  process.stdout.write(`REPORT_START${JSON.stringify(report)}REPORT_END`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
