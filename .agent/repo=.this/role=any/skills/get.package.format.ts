/**
 * 🧮 get.package.format — report whether a package is requireable from commonjs
 *
 * .what = reads an installed package's manifest, then PROVES the verdict with a real
 *         `require()` in a child process
 * .why  = `rule.forbid.eager-esm-imports-in-prod` turns on one fact — can a cjs consumer
 *         load this package? — and that fact is routinely read off `"type": "module"`,
 *         which does not answer it. a dual-published package declares `type: module` for
 *         its own `.js` files AND ships a `.cjs` entry a consumer can require.
 *
 * .note = the manifest and the probe are reported SEPARATELY, on purpose. a manifest can
 *   promise a `require` condition that the shipped files do not honor, so a verdict taken
 *   from the manifest alone is a claim about an intention rather than about the artifact.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ARGV = process.argv.slice(2);

/**
 * .what = the value that follows a flag
 * .why = an arg reader inlined at each call site is a pipeline the caller must simulate
 *
 * ⚠️ .note = the `startsWith('--')` arm is the mispair guard, and it is not cosmetic.
 *   `--package --verbose` would otherwise record the literal `--verbose` as the package
 *   name, and the refusal would read `--verbose is not installed` — a wrong-cause message
 *   for a caller-fixable arg. the `.sh` wrapper rejects a `-*` value before exec, but this
 *   module runs standalone under `npx tsx` too, so the guard belongs at BOTH boundaries.
 *
 * .note = it is the same guard `calc.tokens.ts`'s `getAllArgValues` carries, and it stays
 *   duplicated rather than shared. two usages is one short of the bar
 *   `rule.prefer.wet-over-dry` sets, and the two readers differ in cardinality — one
 *   repeatable, one last-wins — so a shared reader would need a mode flag to serve both.
 */
const getOneArgVal = (input: { flag: string }): string | null => {
  const at = ARGV.indexOf(input.flag);
  if (at === -1) return null;
  const value = ARGV[at + 1];
  if (value === undefined || value.startsWith('--')) return null;
  return value;
};

/**
 * .what = refuses with the caller-fault class and exits 2
 * .why = an absent arg is the caller's to fix, which is exit 2 by definition
 *        (`rule.require.exit-code-semantics`), and the prefix must be UNABRIDGED
 *        (`rule.require.unabridged-error-prefix`)
 */
/**
 * .what = renders a refusal's rows as one treestruct under the command header
 * .why = the elbow of a row is a function of whether another row follows it, and `why`/`fix`
 *        are each optional — so a hardcoded `├─`/`└─` pair dangles an open branch the moment
 *        a call site omits the last row. the shape is computed rather than typed
 *        (`rule.forbid.snapshot-visual-blemishes`).
 *
 * .note = it is local rather than the shared `getOneTreeElbow`. an `.agent/` skill that
 *   imported from `src/` would couple a portable measurement to this repo's build output
 *   (`F24`), and the rule here is one expression.
 */
const sayRefusal = (rows: string[]): void => {
  console.error('🧮 get.package.format');
  for (const [index, row] of rows.entries())
    console.error(`   ${index === rows.length - 1 ? '└─' : '├─'} ${row}`);
};

/**
 * 🔴 .note = the remedy row is labelled `hint:`, and that is the repo's ONE word for the
 *   role — measured 84 of 97 terminal remedy lines across `blackbox/**\/*.snap`. this
 *   file rendered `fix:` and its peer skills rendered `hint:`, so a caller who ran two of
 *   them met one concept under two words, four lines apart
 *   (`rule.forbid.domain-term-synonyms`, `rule.forbid.snapshot-visual-blemishes`).
 *
 * .note = the FIELD is renamed with the label. to render `hint:` off a field named `fix`
 *   would move the synonym one layer down rather than retire it.
 */
const belay = (input: { say: string; hint?: string }): never => {
  sayRefusal([
    `✋ ConstraintError: ${input.say}`,
    ...(input.hint ? [`hint: ${input.hint}`] : []),
  ]);
  process.exit(2);
};

/**
 * 🔴 .what = refuses with the SERVER-fault class and exits 1
 * .why = the docblock and `show_help` both promise `exit 1 = malfunction (the probe could not
 *        run)`, and until 2026-09-24 this file had no path to 1 at all — a promise stated
 *        twice and reachable never.
 *
 * 🔴 .note = the absence was read as "no cheap fixture reaches this fault" (`F36`, row 3) and
 *   it was not a fixture problem: the BRANCH was absent. the survey asked *what fixture could
 *   drive exit 1* and never asked *what in this file can raise it* — the same per-candidate
 *   rather than per-call-site search a peer dream already caught once.
 *
 * .note = exit 1, never 2. a malformed manifest inside `node_modules` and a spawn that cannot
 *   start are both an unexpected STATE of the tree rather than an arg the caller typed wrong
 *   (`rule.require.exit-code-semantics`). the prefix is UNABRIDGED
 *   (`rule.require.unabridged-error-prefix`).
 */
const halt = (input: { say: string; why?: string; hint?: string }): never => {
  sayRefusal([
    `💥 MalfunctionError: ${input.say}`,
    ...(input.why ? [`why: ${input.why}`] : []),
    // the remedy row, under the one label `belay` uses — see its docblock
    ...(input.hint ? [`hint: ${input.hint}`] : []),
  ]);
  process.exit(1);
};

const slugPackage =
  getOneArgVal({ flag: '--package' }) ??
  belay({
    say: '--package is required',
    hint: 'rhx get.package.format --package js-tiktoken',
  });

// the package must be installed — this reads what SHIPPED, never what npm advertises
const pathToManifest = join(
  process.cwd(),
  'node_modules',
  slugPackage,
  'package.json',
);

const manifestRaw = ((): string => {
  try {
    return readFileSync(pathToManifest, 'utf-8');
  } catch {
    return belay({
      say: `${slugPackage} is not installed`,
      hint: 'pnpm install, then re-run — this skill reads node_modules, never the registry',
    });
  }
})();

/**
 * 🔴 .what = the parsed manifest, with the parse GUARDED
 * .why = it was unguarded, so a malformed `package.json` inside `node_modules` exited 1 with
 *        a raw node stack — no class prefix, no path, no fix
 *        (`rule.require.unabridged-error-prefix`, `rule.require.refusals-carry-context`).
 *
 * ⚠️ .note = the READ above is guarded and the PARSE was not, which is the shape that hid it:
 *   the file's one visible refusal reads as though the whole manifest step is covered.
 */
const manifest = ((): {
  version?: string;
  type?: string;
  main?: string;
  exports?: Record<string, unknown>;
} => {
  try {
    return JSON.parse(manifestRaw);
  } catch (error) {
    return halt({
      say: `${slugPackage}'s package.json is not valid json`,
      why: error instanceof Error ? error.message : String(error),
      hint: `read ${pathToManifest} — a malformed manifest in node_modules usually means a partial install; re-run pnpm install`,
    });
  }
})();

/**
 * .what = the `require` condition of the root export, when one is declared
 * .why = a nested lookup inlined into the render is decode-friction
 *        (`rule.forbid.inline-decode-friction`)
 */
const getOneRequireCondition = (): string | null => {
  const rootExport = manifest.exports?.['.'];
  if (!rootExport || typeof rootExport !== 'object') return null;
  const asConditions = rootExport as Record<string, unknown>;
  return typeof asConditions.require === 'string' ? asConditions.require : null;
};

const conditionRequire = getOneRequireCondition();

/**
 * .what = whether a real commonjs `require()` of the package succeeds
 * .why = 🔴 the whole point of the skill. it runs in a CHILD process so a package that
 *        throws at module-eval refuses the probe rather than kills this one — and so the
 *        probe is a genuine cjs context rather than whatever this file was compiled into
 */
const probe = spawnSync(
  process.execPath,
  [
    '-e',
    "try { require(process.argv[1]); console.log('OK'); } catch (e) { console.log('NO: ' + (e && e.message ? e.message.split('\\n')[0] : e)); }",
    slugPackage,
  ],
  { cwd: process.cwd(), encoding: 'utf-8' },
);

/**
 * 🔴 .what = refuses where the PROBE ITSELF could not start
 * .why = this is the exact fault the docblock's `exit 1 = the probe could not run` names, and
 *        it was never consulted. `spawnSync` sets `.error` when the spawn fails to launch —
 *        and the reader below went straight to `.stdout`, which is `null` in that case.
 *
 * 🔴 .note = so a probe that COULD NOT RUN rendered as `require(): ✗ refuses`, with an empty
 *   cause line beneath it. that is a `failhide` (`rule.forbid.failhide`) and the worse half of
 *   the two defects here: the file exited 0 and reported a measurement it never took.
 */
if (probe.error)
  halt({
    say: 'the require() probe could not run',
    why: probe.error.message,
    hint: 'the probe spawns this same node binary — check that the process can fork',
  });

const probeSaid = (probe.stdout ?? '').trim();
const isRequireable = probeSaid.startsWith('OK');
const probeWhyNot = isRequireable ? null : probeSaid.replace(/^NO: /, '');

/**
 * .what = whether the package SHIPS a commonjs entry a consumer can reach
 * .why = 🔴 the manifest decides this, NOT the probe — see the verdict's note
 */
const hasCjsEntry =
  conditionRequire !== null || (manifest.main ?? '').endsWith('.cjs');

/**
 * .what = the one-word verdict a caller acts on
 * .why = the three states differ in what they ask of an author, so they are named rather
 *        than left for the reader to infer from four separate fields
 *
 * 🔴 .note = the verdict is taken from the MANIFEST, and the probe is evidence beside it —
 *   never the other way round. node 22.12+ loads a synchronous esm graph through
 *   `require()`, so on a modern runtime a PURE-esm package probes green. measured
 *   2026-09-19: `age-encryption` (the package this repo routes through
 *   `getOneLazyEsmModuleLoader` precisely because it is esm-only) probed `✓ loads` on
 *   node v24. a probe-led verdict would have called it safe.
 *
 * ⚠️ .note = so a green probe proves the package loads HERE, on THIS node. it does not
 *   prove a consumer can load it — jest's cjs runtime and node below 22.12 both refuse a
 *   package with no cjs entry, which is the whole reason
 *   `rule.forbid.eager-esm-imports-in-prod` exists.
 */
const verdict = ((): string => {
  if (manifest.type !== 'module') return 'cjs';
  if (hasCjsEntry) return 'dual';
  return 'esm-only';
})();

// ⚠️ .note = an esm-only package is NOT a refusal — it is a measured answer, and the skill
//   exits 0. the refusal class is reserved for a caller fault (absent arg, absent package),
//   so a caller tells "you asked wrong" from "the answer is no" by the exit code alone.
// .note = the render opens on the HEADER, with no blank ahead of it. rhachet prints its own
//   `🪨 run solid skill` banner and a blank line before every skill, so a blank emitted here
//   lands as a SECOND one — a gap the peer skills do not carry
//   (`rule.forbid.snapshot-visual-blemishes`).
// 🔴 .note = the root is 🧮, and it must MATCH the `.sh` half's help header. the two are
//   rendered by two files, so a glyph repair applied to one and not the other ships a skill
//   whose `--help` and whose output claim two identities (`rule.prefer.emoji-language` —
//   one grain, one glyph). that is exactly the miss this line once carried.
console.log(`🧮 get.package.format --package ${slugPackage}`);
console.log(`   ├─ version: ${manifest.version ?? '(absent)'}`);
console.log('   ├─ manifest');
console.log(`   │  ├─ type: ${manifest.type ?? '(absent — cjs by default)'}`);
console.log(`   │  ├─ main: ${manifest.main ?? '(absent)'}`);
console.log(`   │  └─ exports['.'].require: ${conditionRequire ?? '(absent)'}`);
console.log(`   ├─ probe (node ${process.version} — this runtime only)`);
// .note = `✓`/`✗` are the status-leaf pair (`rule.prefer.emoji-language`)
console.log(`   │  └─ require(): ${isRequireable ? '✓ loads' : '✗ refuses'}`);
if (probeWhyNot) console.log(`   │     └─ ${probeWhyNot}`);
console.log(`   └─ verdict: ${verdict}`);
console.log('');

// ⚠️ the one combination a caller WILL misread, so it is called out rather than left to
//   the two fields above to contradict each other in silence
if (verdict === 'esm-only' && isRequireable) {
  console.log(
    `   🟡 the probe loaded it, and that does NOT make it safe. node ${process.version}`,
  );
  console.log(
    '      loads a synchronous esm graph through require(); jest\'s cjs runtime and',
  );
  console.log('      node below 22.12 do not. the manifest is what a consumer gets.');
  console.log('');
}

if (verdict === 'esm-only') {
  console.log(
    '   🟡 esm-only — a static import compiles to require() in dist and a cjs consumer',
  );
  console.log('      cannot load it. route it through getOneLazyEsmModuleLoader');
  console.log('      (`rule.forbid.eager-esm-imports-in-prod`).');
  console.log('');
}
