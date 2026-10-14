/**
 * .what = a `--require` hook that tallies every module a node process loads, by package
 * .why = an `rhx` call pays its module-eval cost on every invocation; this names which
 *   packages that cost comes from (`rule.require.thinnest-import-path`, "how to measure")
 *
 * .note = loaded by `cli.load.profile.sh`; prints its report to stderr on exit, so the
 *   command's own stdout stays untouched
 */
const Module = require('node:module');

const loadsByPackage = new Map();
const msByPackage = new Map();
const seen = new Set();

const asPackageOf = (filename) => {
  const at = filename.lastIndexOf('node_modules/');
  if (at < 0) {
    const dist = filename.indexOf('/dist/');
    return dist >= 0 ? `(rhachet) ${filename.slice(dist + 6).split('/').slice(0, 2).join('/')}` : '(other)';
  }
  const rest = filename.slice(at + 'node_modules/'.length).split('/');
  return rest[0].startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0];
};

const loadOriginal = Module._load;
Module._load = function (request, parent, isMain) {
  const startedAt = process.hrtime.bigint();
  const result = loadOriginal.apply(this, arguments);
  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
  let filename;
  try {
    filename = Module._resolveFilename(request, parent, isMain);
  } catch {
    return result;
  }
  if (seen.has(filename)) return result;
  seen.add(filename);
  const pkg = asPackageOf(filename);
  loadsByPackage.set(pkg, (loadsByPackage.get(pkg) ?? 0) + 1);
  msByPackage.set(pkg, (msByPackage.get(pkg) ?? 0) + elapsedMs);
  return result;
};

process.on('exit', () => {
  const rows = [...loadsByPackage.entries()].sort((a, b) => b[1] - a[1]);
  const top = Number(process.env.CLI_LOAD_PROFILE_TOP ?? 25);
  process.stderr.write(`\n🔬 modules loaded: ${seen.size}\n`);
  for (const [pkg, count] of rows.slice(0, top))
    process.stderr.write(
      `   ${String(count).padStart(5)}  ${(msByPackage.get(pkg) ?? 0).toFixed(0).padStart(6)}ms(incl)  ${pkg}\n`,
    );
});
