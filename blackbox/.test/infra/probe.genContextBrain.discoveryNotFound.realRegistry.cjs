// .what = real-node probe: the discovery-mode BrainChoiceNotFoundError message, driven against
//         the REAL installed brain registry, for all three choice variants (ehmpathy/rhachet#429)
// .why  = the faithful resurrection of the deleted genContextBrain.integration.test case4 snapshot.
//         that test snapshotted the discovery-fed not-found message against the REAL registry, but
//         ran under jest — and jest's vm sandbox REFUSES the runtime import() the #429 fix relies on
//         (ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG without --experimental-vm-modules), so under
//         the fix discovery loads zero brains under jest and the snapshot cannot survive there. a
//         real node child has no such vm restriction, so it drives REAL discovery through the real
//         import() and captures the same real-registry message the deleted snapshot held.
//
// argv[2] = absolute path to built dist genContextBrain (contract sdk.brains.js)
// cwd     = the repo whose package.json declares the rhachet-brains-* deps (the real registry)

const { genContextBrain } = require(process.argv[2]);

const main = async () => {
  // drive the three discovery-mode not-found variants against the REAL installed registry;
  // no context override, so discovery reads this repo's package.json (the real brain deps)
  const capture = async (choice) => {
    try {
      await genContextBrain({ choice });
      return null;
    } catch (error) {
      return {
        name: error && error.constructor ? error.constructor.name : null,
        message: error && error.message ? String(error.message) : '',
      };
    }
  };

  const report = {
    generic: await capture('nonexistent/brain-slug-xyz'),
    repl: await capture({ repl: 'nonexistent/repl-xyz' }),
    atom: await capture({ atom: 'nonexistent/atom-xyz' }),
  };
  process.stdout.write(`REPORT_START${JSON.stringify(report)}REPORT_END`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
