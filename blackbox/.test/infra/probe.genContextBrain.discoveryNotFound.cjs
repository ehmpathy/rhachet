// .what = real-node probe: discovery-mode BrainChoiceNotFoundError lists the REAL registry (#429)
// .why  = F1 — proves the end-user path the wish exists to fix: a user runs discovery mode
//         (no rhachet.use.ts), types a brain slug absent from the REAL registry, and the
//         not-found error lists the real discovered brains. jest cannot witness discovery's
//         native import() (see importEsmSafe), and the explicit-mode tests inject a fake brain
//         list — so neither proves that getAvailableBrains() (discovery) feeds a real list into
//         the shared BrainChoiceNotFoundError path (genContextBrain buildContextBrain). only a
//         real node child against the built dist drives discovery + the not-found path together.
//
// argv[2] = absolute path to built dist genContextBrain.js
// argv[3] = absolute path to built dist getAvailableBrains.js
// cwd     = the repo whose package.json declares the rhachet-brains-* deps

const { genContextBrain } = require(process.argv[2]);
const { getAvailableBrains } = require(process.argv[3]);

const main = async () => {
  // learn the real discovered registry — the same list discovery mode builds
  const brains = await getAvailableBrains();
  const realSlugs = [
    ...brains.repls.map((r) => `${r.repo}/${r.slug}`),
    ...brains.atoms.map((a) => `${a.repo}/${a.slug}`),
  ];
  const sampleSlug = realSlugs.length > 0 ? realSlugs[0] : null;

  // drive discovery mode with a choice that is absent from the real registry
  let errorName = null;
  let message = '';
  let metadataAvailableCount = null;
  try {
    await genContextBrain({ choice: 'zzz-not-a-real-brain-zzz' });
  } catch (error) {
    errorName = error && error.constructor ? error.constructor.name : null;
    message = error && error.message ? String(error.message) : '';
    const available = error && error.metadata && error.metadata.available;
    if (available) {
      const atoms = Array.isArray(available.atoms) ? available.atoms.length : 0;
      const repls = Array.isArray(available.repls) ? available.repls.length : 0;
      metadataAvailableCount = atoms + repls;
    }
  }

  const report = {
    errorName,
    realBrainCount: realSlugs.length,
    metadataAvailableCount,
    // the not-found formatter ran (treestruct header present)
    messageHasHeader: message.includes('available brains'),
    // discovery fed the REAL list: the error names a real discovered brain
    messageListsRealBrain: sampleSlug !== null && message.includes(sampleSlug),
    sampleSlug,
  };
  process.stdout.write(`REPORT_START${JSON.stringify(report)}REPORT_END`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
