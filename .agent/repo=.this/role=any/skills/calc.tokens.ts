/**
 * .what = counts the real token cost of a fileset, and grades an estimator against it
 * .why  = a token count that GATES (a boot budget) must be measured, never assumed
 *
 * .note = invoked via calc.tokens.sh; args are parsed there and re-read here
 * .note = `encodingForModel` is the js-tiktoken library api name
 *
 * .note = the render carries NO mascot. this is rhachet-generic tooling, and a mascot
 *   belongs to a role's own voice rather than to a measurement
 *   (`rule.prefer.emoji-language`). the artifact glyph `🧮` roots every line instead.
 */
import glob from 'fast-glob';
import { encodingForModel } from 'js-tiktoken';

import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

/**
 * .what = one file, measured
 * .why  = `density` is the quantity an estimator gets wrong — chars per token. a lower
 *   number means a denser file, so a flat divisor undercounts it
 */
interface Measurement {
  path: string;
  chars: number;
  tokens: number;
  density: number;
}

/**
 * .what = one file's raw content, read off disk
 * .why  = it parts the impure read from the pure measurement, so the arithmetic below
 *         is testable with no filesystem at all
 */
interface FileContent {
  path: string;
  content: string;
}

/**
 * .what = the estimators this skill can grade
 * .why  = a closed set keeps the cli unambiguous (`rule.prefer.prevent-over-correct`)
 */
const ESTIMATORS = {
  'chars-div-4': (chars: number) => Math.ceil(chars / 4),
  'chars-div-3.97': (chars: number) => Math.ceil(chars / 3.97),
} as const;
type EstimatorSlug = keyof typeof ESTIMATORS;

/**
 * .what = what an estimator predicts for a corpus, or null where none was asked for
 * .why = the dispatch through `ESTIMATORS[slug]` is an index into a lookup table, and an
 *   index inline in an assignment is decode-friction — a reader must hold both the table
 *   and the null branch to know what the value is (`rule.forbid.inline-decode-friction`)
 */
const calcEstimate = (input: {
  slug: EstimatorSlug | null;
  chars: number;
}): number | null =>
  input.slug === null ? null : ESTIMATORS[input.slug](input.chars);

/**
 * .what = an estimator's SIGNED error against the measured truth, as a percent
 * .why = the sign is the whole point, so the direction is stated once here rather than
 *   re-derived at each render (`rule.require.named-transformers`)
 *
 * 🔴 .note = NEGATIVE means the estimator UNDERCOUNTS, which is the dangerous direction: a
 *   gate that reads an undercount passes an over-budget payload. positive merely refuses a
 *   payload that would have fit.
 */
const calcEstimatorErrorPct = (input: {
  estimate: number;
  measured: number;
}): number => ((input.estimate - input.measured) / input.measured) * 100;

/**
 * .what = refuses the run, and names what to do instead
 * .why  = an empty answer must name its cause (`define.invariant.empty-render-names-its-cause`).
 *   exit 2, never 1 — every path that reaches here is a caller-fixable input
 *   (`rule.require.exit-code-semantics`)
 *
 * .note = it writes to STDERR, so a `--format json` caller can trust that stdout holds
 *   json or holds naught. a refusal on stdout would corrupt the pipe it was meant to serve
 *
 * 🔴 .note = the prefix is `✋ ConstraintError: …`, unabridged. the glyph alone is a
 *   REDACTION: it is not greppable, and it is the one datum that tells a reader whether to
 *   fix their own input or file a defect (`rule.require.unabridged-error-prefix`). the class
 *   is `ConstraintError` on every path that reaches here, which is why it is a constant
 *   rather than a parameter — each is a caller-fixable input, and each exits 2
 *   (`rule.require.exit-code-semantics`).
 *
 * 🔴 .note = `what` is a PARAMETER, never a constant. it once read `no tokens measured` on
 *   every path, and two of the four paths refuse a FLAG before a single file is opened — so
 *   the one line a reader scans first sent them to audit their globs while the defect sat in
 *   their `--top`. an error must name the fix, and it cannot name it while the headline names
 *   a different subsystem (`rule.require.errors-name-the-fix`).
 */
const belay = (input: {
  what: string;
  why: string[];
  hint: string;
}): never => {
  console.error('🧮 calc.tokens');
  console.error(`   ├─ ✋ ConstraintError: ${input.what}`);
  input.why.forEach((line) => console.error(`   ├─ ${line}`));
  console.error(`   └─ hint: ${input.hint}`);
  return process.exit(2);
};

/**
 * .what = refuses the run on a SERVER-owned fault, and names it
 * .why  = `belay`'s peer, and the two are parted by who must fix it —
 *   `✋` a caller-fixable input, `💥` a fault this program owns
 *   (`rule.prefer.emoji-language`, `rule.require.failloud`). exit 1, per the guarantee
 *   `calc.tokens.sh` publishes
 */
const blowup = (input: {
  what: string;
  why: string[];
  hint: string;
}): never => {
  console.error('🧮 calc.tokens');
  console.error(`   ├─ 💥 MalfunctionError: ${input.what}`);
  input.why.forEach((line) => console.error(`   ├─ ${line}`));
  console.error(`   └─ hint: ${input.hint}`);
  return process.exit(1);
};

/**
 * .what = the errno a node fs error carries, or null for any other throwable
 * .why  = `catch` is typed `unknown`, so the guard is a named transformer rather than an
 *   inline cast at the call site (`rule.require.named-transformers`, `rule.forbid.as-cast`)
 */
const asErrnoCode = (thrown: unknown): string | null =>
  thrown instanceof Error && 'code' in thrown && typeof thrown.code === 'string'
    ? thrown.code
    : null;

/**
 * .what = every value a repeatable flag carries in argv
 *
 * ⚠️ .note = the `startsWith('--')` arm is the mispair guard, and it is not cosmetic.
 *   `--paths --top 8` would otherwise record the literal `--top` as a glob, which matches
 *   no file and reports a zero-match as though the glob were wrong
 */
const getAllArgValues = (input: { argv: string[]; flag: string }): string[] =>
  input.argv.flatMap((arg, index) => {
    if (arg !== input.flag) return [];
    const value = input.argv[index + 1];
    if (value === undefined || value.startsWith('--')) return [];
    return [value];
  });

/**
 * .what = the one value a single-valued flag carries — the last wins
 */
const getOneArgValue = (input: { argv: string[]; flag: string }): string | null =>
  getAllArgValues(input).at(-1) ?? null;

/**
 * .what = the value at a percentile of a sorted numeric series
 */
const getOnePercentile = (input: { sorted: number[]; at: number }): number =>
  input.sorted[Math.floor((input.sorted.length - 1) * input.at)] ?? 0;

/**
 * .what = one file's content, read off disk — or a classified refusal
 * .why  = 🔴 the glob and the read are two syscalls with a gap between them, so a path this
 *   program listed can be gone by the time it is opened: a concurrent build, a watcher, a
 *   `git checkout`. an orphan symlink never reaches here — `onlyFiles` drops it at the glob.
 *   an unhandled `ENOENT` escapes as a raw v8 stack
 *   trace — no glyph, no owner, no hint — which is precisely the unnamed failure
 *   `rule.require.failloud` and `rule.require.unabridged-error-prefix` forbid
 *
 * 🔴 .note = it REFUSES rather than skips. to drop a vanished file would undercount the
 *   corpus in silence, and a silent partial measurement is the one outcome a counter that
 *   GATES must never produce (`rule.forbid.failhide`)
 *
 * .note = the two owners are parted by errno. `ENOENT` alone is the race — the caller's own
 *   tree moved, and a re-run on a settled tree fixes it, so it is `✋` and exit 2. every
 *   other errno (`EACCES`, `EISDIR`, `EIO`) is a fault this program did not anticipate, so
 *   it is `💥` and exit 1 — the guarantee `calc.tokens.sh` publishes for a read failure
 */
const getOneFileContent = (input: {
  path: string;
  cwd: string;
}): FileContent => {
  const pathRelative = relative(input.cwd, input.path);
  try {
    return { path: pathRelative, content: readFileSync(input.path, 'utf-8') };
  } catch (thrown) {
    const code = asErrnoCode(thrown);
    if (code === 'ENOENT')
      return belay({
        what: 'a matched file vanished before it was read',
        why: [
          `path: ${pathRelative}`,
          'it matched the glob, then was gone by the time it was opened',
        ],
        hint: 're-run once the tree has settled — a build or checkout is mid-flight',
      });
    return blowup({
      what: 'a matched file could not be read',
      why: [`path: ${pathRelative}`, `errno: ${code ?? 'unknown'}`],
      hint: 'check the path is a readable file, then file a defect if it is',
    });
  }
};

/**
 * .what = the content of every matched file, minus the empty ones
 * .why  = an empty file has zero tokens, so its density is `0 / 0` — a NaN that would
 *   poison the corpus divisor and every percentile computed from it. it is dropped here,
 *   at the boundary, so no measurement downstream can carry one
 *
 * .note = a non-empty string always encodes to at least one token, so a file that
 *   survives this filter has a finite density by construction
 */
const getAllFileContents = (input: {
  paths: string[];
  cwd: string;
}): FileContent[] =>
  input.paths
    .map((path) => getOneFileContent({ path, cwd: input.cwd }))
    .filter((file) => file.content.length > 0);

/**
 * .what = one file's content, measured against a real bpe encoder
 * .why  = the arithmetic is a pure transformer, so the encoder arrives as an input rather
 *         than a module-scope singleton (`rule.require.named-transformers`)
 */
const asMeasurement = (input: {
  file: FileContent;
  encode: (content: string) => number;
}): Measurement => {
  const tokens = input.encode(input.file.content);
  return {
    path: input.file.path,
    chars: input.file.content.length,
    tokens,
    density: input.file.content.length / tokens,
  };
};

/**
 * .what = the N densest files, densest first
 * .why  = density is where an estimator errs worst, so this is the list an author reads
 *         to learn WHICH files break a flat divisor
 *
 * 🔴 .note = the tie-break on `path` carries weight, and is never cosmetic. `measured`
 *   arrives in `glob.sync` discovery order, which is filesystem-enumeration order and
 *   differs across machines and across a `pnpm install` relink. JS sorts stably, so ties
 *   would inherit that order — and the render would then be a function of the DISK rather
 *   than of the corpus. this skill's whole job is a measurement, so an output that varies
 *   with naught but the enumeration is one that cannot be compared to its own prior run.
 *
 *   ⚠️ the acceptance snapshot cannot catch this: its frozen fixture has distinct densities,
 *   so no tie is ever exercised. a real corpus — two `.min` briefs of the same shape, a pair
 *   of generated files — produces them routinely.
 */
const getAllDensestRows = (input: {
  measured: Measurement[];
  top: number;
}): Measurement[] =>
  input.top <= 0
    ? []
    : [...input.measured]
        .sort((a, b) => a.density - b.density || a.path.localeCompare(b.path))
        .slice(0, input.top);

/**
 * .what = the corpus totals — chars and tokens, summed across every measured file
 * .why  = two folds that answer one question belong behind one name, so a caller reads a
 *         corpus total rather than a pair of accumulators
 *         (`rule.forbid.inline-decode-friction`)
 */
const calcCorpusTotals = (input: {
  measured: Measurement[];
}): { chars: number; tokens: number } => ({
  chars: input.measured.reduce((sum, row) => sum + row.chars, 0),
  tokens: input.measured.reduce((sum, row) => sum + row.tokens, 0),
});

/**
 * .what = every file's density, least-first — the sorted sample a percentile is read from
 * .why  = `getAllPercentile` indexes into this, so the sort order is a PRECONDITION of that
 *         read rather than an incidental step. the name states it once, where it is made.
 *
 * .note = least-first, so index 0 is the DENSEST file — a low chars/token ratio means more
 *   tokens per char, which is where a flat divisor undercounts worst.
 */
const getAllDensitiesSorted = (input: { measured: Measurement[] }): number[] =>
  input.measured.map((row) => row.density).sort((a, b) => a - b);

/**
 * .what = the whole measurement, as one json document
 * .why  = the shape a `| jq` caller depends on. it lives behind a name so the tree render
 *         and the json render cannot drift on what each reports
 */
const asJsonReadout = (input: {
  measured: Measurement[];
  densities: number[];
  charsTotal: number;
  tokensTotal: number;
  estimatorSlug: EstimatorSlug | null;
  estimate: number | null;
  errorPct: number | null;
  top: number;
}): string =>
  JSON.stringify(
    {
      corpus: {
        files: input.measured.length,
        chars: input.charsTotal,
        tokens: input.tokensTotal,
      },
      density: {
        overall: Number((input.charsTotal / input.tokensTotal).toFixed(3)),
        min: Number(input.densities[0]!.toFixed(2)),
        p05: Number(
          getOnePercentile({ sorted: input.densities, at: 0.05 }).toFixed(2),
        ),
        p50: Number(
          getOnePercentile({ sorted: input.densities, at: 0.5 }).toFixed(2),
        ),
        p95: Number(
          getOnePercentile({ sorted: input.densities, at: 0.95 }).toFixed(2),
        ),
      },
      estimator:
        input.estimatorSlug === null
          ? null
          : {
              slug: input.estimatorSlug,
              estimate: input.estimate,
              errorPct: Number(input.errorPct!.toFixed(2)),
            },
      densest: getAllDensestRows({
        measured: input.measured,
        top: input.top,
      }).map((row) => ({
        path: row.path,
        chars: row.chars,
        tokens: row.tokens,
        density: Number(row.density.toFixed(2)),
      })),
    },
    null,
    2,
  );

/**
 * .what = the whole measurement, as a tree a human scans
 * .why  = the elbows depend on which optional sections are present, and that branch logic
 *         is arithmetic a reader should not simulate inline (`rule.require.treestruct-output`)
 */
const asTreeLines = (input: {
  patterns: string[];
  measured: Measurement[];
  densities: number[];
  charsTotal: number;
  tokensTotal: number;
  estimatorSlug: EstimatorSlug | null;
  estimate: number | null;
  errorPct: number | null;
  top: number;
}): string[] => {
  const hasEstimator = input.estimate !== null;
  const densest = getAllDensestRows({
    measured: input.measured,
    top: input.top,
  });
  const hasTop = densest.length > 0;

  const linesCorpus = [
    `🧮 calc.tokens --paths ${input.patterns.map((pattern) => `'${pattern}'`).join(' --paths ')}`,
    `   ├─ corpus`,
    `   │  ├─ files  = ${input.measured.length}`,
    `   │  ├─ chars  = ${input.charsTotal}`,
    `   │  └─ tokens = ${input.tokensTotal}   (o200k_base, gpt-4o)`,
    `   │`,
  ];

  const isDensityLast = !hasEstimator && !hasTop;
  const padDensity = isDensityLast ? '   ' : '   │';
  const linesDensity = [
    isDensityLast ? `   └─ density` : `   ├─ density`,
    `${padDensity}  ├─ chars/token = ${(input.charsTotal / input.tokensTotal).toFixed(3)}   (corpus-wide)`,
    `${padDensity}  ├─ min = ${input.densities[0]!.toFixed(2)}   (densest file)`,
    `${padDensity}  ├─ p05 = ${getOnePercentile({ sorted: input.densities, at: 0.05 }).toFixed(2)}`,
    `${padDensity}  ├─ p50 = ${getOnePercentile({ sorted: input.densities, at: 0.5 }).toFixed(2)}`,
    `${padDensity}  └─ p95 = ${getOnePercentile({ sorted: input.densities, at: 0.95 }).toFixed(2)}`,
  ];

  const padEstimator = hasTop ? '   │' : '   ';
  const linesEstimator = !hasEstimator
    ? []
    : [
        `   │`,
        hasTop
          ? `   ├─ estimator: ${input.estimatorSlug}`
          : `   └─ estimator: ${input.estimatorSlug}`,
        `${padEstimator}  ├─ estimate = ${input.estimate}`,
        `${padEstimator}  └─ error    = ${input.errorPct! >= 0 ? '+' : ''}${input.errorPct!.toFixed(1)}%   (${
          input.errorPct! < 0
            // 🔴 both arms lowercase. these two strings are the SAME field's two values,
            //    and one was shouted while its peer three lines down was not — the most
            //    legible form of uneven emphasis there is, since a reader meets one or the
            //    other and cannot see the pair (`rule.forbid.snapshot-visual-blemishes`).
            //    the direction still carries the weight; it does so in the clause
            ? 'undercounts — a gate would pass an over-budget payload'
            : 'overcounts — a gate would refuse a within-budget payload'
        })`,
      ];

  const linesDensest = !hasTop
    ? []
    : [
        `   │`,
        `   └─ densest ${densest.length}   (where an estimator undercounts most)`,
        ...densest.map((row, index) => {
          const elbow = index === densest.length - 1 ? '└─' : '├─';
          return `      ${elbow} ${row.density.toFixed(2)}  chars=${String(row.chars).padStart(7)} tokens=${String(row.tokens).padStart(7)}  ${row.path}`;
        }),
      ];

  return [
    ...linesCorpus,
    ...linesDensity,
    ...linesEstimator,
    ...linesDensest,
    '',
  ];
};

const argv = process.argv.slice(2);
const cwd = process.cwd();

// refuse a --top that is not a non-negative integer, before any file is read
//
// .why = `Number('abc')` is NaN, and every downstream comparison against NaN is false —
//   so a typo would silently drop the densest section rather than name the typo
//
// 🟡 .note = `calc.tokens.sh` grades `--top` and `--against` first, so an `rhx` caller meets
//   its refusal rather than this one. this arm is NOT redundant: the module is runnable
//   directly under `tsx`, and a guard that exists only in the wrapper is a guard the inner
//   program does not have (`rule.require.failfast`).
const topRaw = getOneArgValue({ argv, flag: '--top' });
const top = topRaw === null ? 0 : Number(topRaw);
if (!Number.isInteger(top) || top < 0)
  belay({
    what: 'invalid --top',
    why: [`--top = ${topRaw}`, 'a --top must be a non-negative integer'],
    hint: "drop --top, or pass a count — --top 8",
  });

// refuse an unknown --against slug, and name the ones that exist
const estimatorRaw = getOneArgValue({ argv, flag: '--against' });
if (estimatorRaw !== null && !(estimatorRaw in ESTIMATORS))
  belay({
    what: 'invalid --against',
    why: [`--against = ${estimatorRaw}`],
    hint: `one of: ${Object.keys(ESTIMATORS).join(', ')}`,
  });
const estimatorSlug = estimatorRaw as EstimatorSlug | null;

// expand the corpus from the --paths globs
//
// .note = glob.sync, never the async form: tsx compiles this skill to cjs, which forbids
//   a top-level await (`rule.require.failfast` — a build error, not a runtime one)
//
// 🟡 .note = the call stays INLINE, deliberately. `rule.forbid.inline-decode-friction`'s own
//   test is *"do I have to decode this to understand what it produces?"*, and a named library
//   call with its four options spelled out reads as what it does — there is no positional
//   index, no fold, and no compound boolean to simulate. a `getAllCorpusPaths` wrapper here
//   would add a hop and a name for one call site and hide naught (`rule.prefer.wet-over-dry`).
const patterns = getAllArgValues({ argv, flag: '--paths' });
const paths = glob.sync(patterns, { cwd, absolute: true, onlyFiles: true });

if (paths.length === 0)
  belay({
    what: 'no files matched',
    why: [`paths: ${patterns.join(', ') || '(none declared)'}`, 'matched 0 files'],
    hint: "quote the glob — --paths '.agent/**/*.md'",
  });

// measure every matched file with the real bpe tokenizer
//
// ⚠️ .note = constructed ONCE, outside the map. construction is the whole cost and it does
//   not scale with the payload, so a per-file construct would pay it per file. the figures
//   are `src/domain.operations/brainCost/getOneBrainTokenEncoder.ts`'s to state.
//
// .note = that operation is deliberately NOT imported. a `.agent/` skill is a standalone
//   program that ships beside the briefs and reaches into `src/` not at all, and the
//   defect memoization exists to prevent — a per-CALL construct — cannot arise here,
//   since this process encodes from one module-scope encoder and then exits.
const encoder = encodingForModel('gpt-4o');
const measured = getAllFileContents({ paths, cwd }).map((file) =>
  asMeasurement({
    file,
    encode: (content) => encoder.encode(content).length,
  }),
);

// refuse a corpus whose every match was empty — the globs hit, and there is naught to count
//
// .why = without this the divisor below is `0 / 0` and the percentile reads index -1.
//   the cause differs from a zero-match, so the refusal names it differently
if (measured.length === 0)
  belay({
    what: 'no tokens measured',
    why: [
      `paths: ${patterns.join(', ')}`,
      paths.length === 1
        ? 'matched 1 file, and it is empty'
        : `matched ${paths.length} files, and every one is empty`,
    ],
    hint: 'widen the glob, or measure a corpus that carries content',
  });

const { chars: charsTotal, tokens: tokensTotal } = calcCorpusTotals({ measured });
const densities = getAllDensitiesSorted({ measured });

const estimate = calcEstimate({ slug: estimatorSlug, chars: charsTotal });
const errorPct =
  estimate === null
    ? null
    : calcEstimatorErrorPct({ estimate, measured: tokensTotal });

const readout = {
  measured,
  densities,
  charsTotal,
  tokensTotal,
  estimatorSlug,
  estimate,
  errorPct,
  top,
};

// refuse an unknown --format, and name the ones that exist
//
// 🟡 .note = the same wrapper/module split the --top and --against arms carry. without this
//   arm an unknown value falls through to the tree, so an explicit flag is silently
//   discarded rather than refused (`rule.forbid.unexpected-defaults`).
const FORMATS = ['tree', 'json'] as const;
const format = getOneArgValue({ argv, flag: '--format' }) ?? 'tree';
if (!(FORMATS as readonly string[]).includes(format))
  belay({
    what: 'invalid --format',
    why: [`--format = ${format}`],
    hint: `one of: ${FORMATS.join(', ')}`,
  });

const lines =
  format === 'json'
    ? [asJsonReadout(readout)]
    : asTreeLines({ patterns, ...readout });
lines.forEach((line) => console.log(line));
