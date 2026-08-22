// .what = real-node probe for the built brain-context contract's esm-require safety (rhachet#468/#429)
// .why  = the #468/#429 defect surfaces WORST in the brain-context path: a downstream jest (or a
//         brain package's compiled cjs) does `require('rhachet/brains')`, which evaluates the whole
//         static-import graph behind genContextBrain + getAvailableBrains. if ANY file in that graph
//         eagerly (top-level) imports a pure-esm package, tsc down-levels it to a require() and the
//         cjs require of the contract throws `Must use import to load ES Module` — which silently
//         empties the brain registry (atoms: []). the keyrack clamp guards the keyrack graph; THIS
//         clamp guards the brain-context graph — the actual #429 failure surface — so a future eager
//         esm import there is caught proactively, not only in downstream repos.
//
//         a @swc/jest test may keep import() native and mask the defect, so the honest witness is a
//         real node child that require()s the BUILT contract artifact (dist/contract/sdk.brains.js)
//         under cjs — the exact file `require('rhachet/brains')` resolves to.
//
//         the teeth are ENVIRONMENT-INDEPENDENT + subpath-precise: the probe hooks Module._load to
//         record EVERY specifier require()d as the contract module-eval runs, then flags each whose
//         real cjs require() would hit a pure-esm module (the shared detectEsmLandmine helper). the
//         audit is over EAGER eval-time requires only — it does NOT call getAvailableBrains(), whose
//         brain-package loads are LEGITIMATELY lazy (via importEsmSafe) and are not landmines.
//
// argv[2] = absolute path to the built dist contract artifact (dist/contract/sdk.brains.js)

// emulate a real-node CONSUMER, not a jest worker: spawnSync inherits the parent jest's env, which
// carries JEST_WORKER_ID; rhachet's lazy-load boundary keys its strategy off that flag. delete it so
// any lazy load in the graph would take the genuine import() path — the downstream real-node cjs
// require('rhachet/brains') environment #468/#429 target. (this probe audits EAGER requires, but the
// delete keeps the child an honest real-node consumer either way.)
delete process.env.JEST_WORKER_ID;

const Module = require('node:module');
const { dirname } = require('node:path');
const {
  isEsmLandmineRequest,
  asPackageName,
} = require('./detectEsmLandmine.cjs');

const brainsContractDistPath = process.argv[2];

const main = async () => {
  // record every specifier require()d as the contract module-eval runs, PLUS the module that
  // require()d it. a hook on Module._load captures the whole eager static-import graph behind the
  // brains contract, so a top-level `import x from 'pure-esm-pkg'` anywhere in genContextBrain /
  // getAvailableBrains / the brain domain objects is caught here. the parent's path is kept so the
  // detector maps each specifier from the SAME origin node's real require() uses — a deep transitive
  // dep maps to the exact copy + export-condition the real load hit, not a copy hoisted elsewhere.
  // (a fixed-origin lookup false-positives a dual-published subpath dep like @smithy/core, whose
  // real cjs require maps to dist-cjs but whose subpath is unexported when looked up from an
  // unrelated origin dir.)
  const specifiersLoadedAtEval = [];
  const loadOriginal = Module._load;
  Module._load = function loadRecorded(request, parent, isMain) {
    specifiersLoadedAtEval.push({
      request,
      parentPath: parent && parent.filename ? parent.filename : null,
    });
    return loadOriginal.call(this, request, parent, isMain);
  };

  // green: require the built brains contract under cjs — the exact artifact a downstream
  // require('rhachet/brains') resolves to. post-fix, no eager pure-esm require survives in its graph,
  // so the require loads clean.
  let requireContractThrew = false;
  let requireContractError = null;
  try {
    require(brainsContractDistPath);
  } catch (error) {
    requireContractThrew = true;
    requireContractError =
      error instanceof Error ? error.message : String(error);
  } finally {
    Module._load = loadOriginal;
  }

  // teeth: EVERY specifier require()d at eval whose real cjs require() would hit a pure-esm module
  // (the shared subpath-precise, environment-independent detector — no hardcoded package list). a
  // non-empty list names a landmine: an eager pure-esm require in the brain-context eval graph,
  // INCLUDING one no prior audit named. the report emits the deduped PACKAGE NAMES flagged, so a
  // failure says WHICH package leaked.
  const esmLandminesLoadedAtEval = [
    ...new Set(
      specifiersLoadedAtEval
        .filter(({ request, parentPath }) =>
          isEsmLandmineRequest(request, [
            parentPath ? dirname(parentPath) : brainsContractDistPath,
            __dirname,
          ]),
        )
        .map(({ request }) => asPackageName(request)),
    ),
  ];

  const report = {
    requireContractThrew,
    requireContractError,
    esmLandminesLoadedAtEval,
  };
  process.stdout.write(`REPORT_START${JSON.stringify(report)}REPORT_END`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
