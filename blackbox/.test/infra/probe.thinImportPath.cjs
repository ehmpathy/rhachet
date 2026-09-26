// .what = real-node probe that records every module a built cli call loads
// .why  = the clamp for rule.require.thinnest-import-path: the cost of an eager import lives only
//         in the built dist under real node, so the witness is a child that runs the BUILT invoke
//         with a Module._load recorder, then reports the dist files and packages it loaded
//
// argv[2]   = absolute path to the built dist contract/cli/invoke.js
// argv[3..] = the cli args (e.g. `init --help`)

const Module = require('node:module');
const { relative, dirname } = require('node:path');

const invokeDistPath = process.argv[2];
const cliArgs = process.argv.slice(3);
const distRoot = dirname(dirname(dirname(invokeDistPath)));

// record each resolved filename; the resolve is what distinguishes a dist file from a package
const filenamesLoaded = new Set();
const loadOriginal = Module._load;
Module._load = function loadRecorded(request, parent, isMain) {
  try {
    filenamesLoaded.add(Module._resolveFilename(request, parent, isMain));
  } catch {
    // a builtin or an unresolvable request; the load below decides its fate
  }
  return loadOriginal.call(this, request, parent, isMain);
};

// the package name of a node_modules path (scoped or bare), else null
const asPackageName = (filename) => {
  const match = /node_modules\/(@[^/]+\/[^/]+|[^/@][^/]*)\//.exec(
    filename.split('node_modules/').length > 1
      ? `node_modules/${filename.split('node_modules/').pop()}`
      : '',
  );
  return match ? match[1] : null;
};

process.on('exit', () => {
  const all = [...filenamesLoaded];
  const report = {
    loads: all.length,
    distFiles: all
      .filter((f) => f.startsWith(distRoot) && !f.includes('node_modules'))
      .map((f) => relative(distRoot, f))
      .sort(),
    packages: [...new Set(all.map(asPackageName).filter(Boolean))].sort(),
  };
  process.stdout.write(`REPORT_START${JSON.stringify(report)}REPORT_END`);
});

require(invokeDistPath).invoke({ args: cliArgs });
