import { MalfunctionError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { asPtyAddonFileName } from '@src/.test/assets/asPtyAddonFileName';
import { PNPM_MAJOR_NONZERO_ON_BUILD_GATE } from '@src/domain.operations/upgrade/asNpmInstallFailureKind';

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { getPtyHostTupleFromProcess } from './getPtyHostTupleFromProcess';
import { getPtyPlatformSupportFromProcess } from './getPtyPlatformSupportFromProcess';

/**
 * .what = THE CLAMP — installs our declared node-pty the way a CONSUMER installs it,
 *   in a project isolated from this repo, and proves the addon loads and spawns with
 *   no build hook run
 *
 * .why  = a probe of THIS tree proves naught about a consumer: our own
 *   `pnpm.onlyBuiltDependencies` allowlist makes the native build succeed here.
 *
 *   so the clamp reproduces the consumer condition exactly:
 *   - its own project dir, never this one (no store, lockfile, or allowlist of ours)
 *   - its own manifest with NO build allowlist — the allowlist is a ROOT-project
 *     property, so a consumer never inherits ours
 *   - a real package-manager install, with pnpm's build gate live
 *   - a real LOAD and a real SPAWN — presence on disk is not proof of function
 *   - a PINNED package manager, at TWO majors
 *
 * .note = 🚨 the pin: pnpm 10 and 11 disagree on the subject under test — 10 reads the
 *   `pnpm` manifest field, 11 does not. so the pin is READ from our manifest, CONFIRMED
 *   to have taken before any row is measured, the REPORT held as data per major, and the
 *   CAPABILITY asserted invariant across both.
 *
 * .note = same subject as `getPtyModuleOrNull.integration.test.ts` — the
 *   `require('node-pty')` load path — read from a consumer's tree rather than the AMBIENT
 *   one. hence the `.consumer` facet.
 *
 * .note = [case1] is the RED CONTROL: node-pty@1.1.0, so the harness is proven to SEE the
 *   defect (rule.require.clamp-edge-cases). the class clamped is "a native optional dep on
 *   a platform with no prebuild, behind a package manager that blocks build hooks".
 */

jest.setTimeout(600_000);

/**
 * .what = the version that shipped the defect — upstream added linux prebuilds ten
 *   days after it published, so on linux it must compile at install time
 */
const PTY_VERSION_BROKEN = '1.1.0';

/**
 * .what = the version WE declare, read from our own manifest, so a bump is clamped too
 */
const getPtyVersionDeclared = (): string => {
  const manifest = require('../../../../package.json') as {
    optionalDependencies?: Record<string, string>;
  };
  return (
    manifest.optionalDependencies?.['node-pty'] ??
    MalfunctionError.throw('node-pty is not declared in optionalDependencies', {
      hint: 'this clamp reads the declared version from package.json; restore the declaration',
    })
  );
};

/**
 * .what = the package manager WE pin, read from our own manifest
 *
 * .note = a real consumer's own pnpm may differ. that changes what pnpm REPORTS (the gate
 *   line, the exit code), never whether the addon works — the prebuild ships in the
 *   tarball. so report rows are scoped to the version we name; capability rows are not
 */
const getPackageManagerPinned = (): string => {
  const manifest = require('../../../../package.json') as {
    packageManager?: string;
  };
  return (
    manifest.packageManager ??
    MalfunctionError.throw('no packageManager is pinned in package.json', {
      hint: 'this clamp pins the temp project to our own package manager; restore the packageManager field',
    })
  );
};

/**
 * .what = a package manager one MAJOR above the one we pin
 *
 * .why  = makes "the capability does not depend on the package manager" a MEASUREMENT.
 *   ⚠️ NAMED rather than ambient: on a ci image that already runs our major, an ambient
 *   `pnpm` would degrade this row to a duplicate — green for the wrong reason
 */
const PACKAGE_MANAGER_NEXT_MAJOR = 'pnpm@11.18.0';

/**
 * .what = which package manager a row installs under
 * .why  = `ours` is the version our ci runs; `next-major` proves the capability survives
 *   a package-manager major. the REPORT differs between them; the capability must not
 */
type ConsumerPackageManager = 'ours' | 'next-major';

const asPackageManagerSpec = (input: {
  packageManager: ConsumerPackageManager;
}): string =>
  input.packageManager === 'ours'
    ? getPackageManagerPinned()
    : PACKAGE_MANAGER_NEXT_MAJOR;

/**
 * .what = the bare version a `packageManager` spec pins — `pnpm@10.24.0` -> `10.24.0`
 *
 * .why  = `rule.require.named-transformers`
 *
 * .note = a malformed spec (no `@`) yields the whole string, which then fails the version
 *   guard at the call site with both halves printed
 *   (`rule.require.fewer-paths-via-idempotency`)
 */
const asVersionFromPackageManagerSpec = (input: { spec: string }): string =>
  input.spec.slice(input.spec.lastIndexOf('@') + 1);

/**
 * .what = the MAJOR a `packageManager` spec pins — `pnpm@10.24.0` -> `10`
 *
 * .why  = `rule.require.named-transformers`, raised by the r003 `mech-decode-friction`
 *   lane at i065: the call site read `…split('.')[0]`, so a reader had to simulate which
 *   element of the split the major is
 *
 * .note = a malformed spec yields `NaN`, which the call site's own integer guard catches
 *   with both halves printed — the same shape its version twin above takes
 */
const asMajorFromPackageManagerSpec = (input: { spec: string }): number =>
  Number(asVersionFromPackageManagerSpec({ spec: input.spec }).split('.')[0]);

/**
 * .what = how many packages DECLARE node-pty in a pnpm lockfile
 *
 * .why  = `rule.require.named-transformers`, raised by the r003 `mech-decode-friction`
 *   lane at i065: the call site fused a regex, a positional next-line read, and a filter
 *   reduction, so a reader had to simulate the whole pipeline to learn what was counted
 *
 * .note = a `specifier:` line under a `node-pty:` key marks a DECLARANT. the package's own
 *   `node-pty@x.y.z:` blocks carry no specifier, so they do not match — which is what parts
 *   "who asked for it" from "what the lock settled on"
 */
const countNodePtyDeclarantsInLockfile = (input: {
  lockfile: string;
}): number => {
  const lines = input.lockfile.split('\n');
  const isDeclarantKeyLine = (line: string): boolean =>
    /^\s+node-pty:\s*$/.test(line);
  const isSpecifierLine = (line: string): boolean =>
    /^\s+specifier:/.test(line);
  return lines.filter(
    (line, index) =>
      isDeclarantKeyLine(line) && isSpecifierLine(lines[index + 1] ?? ''),
  ).length;
};

/**
 * .what = the pnpm version that ACTUALLY ran, read off the install's own final line
 *
 * .why  = a pre-flight `pnpm --version` proves what a DIFFERENT invocation ran; pnpm's
 *   close line names the version that did THIS work
 *
 * 🚨 .a KIND, not a nullable string — `string | null` conflates three conditions:
 *
 *     - **no-op** — pnpm had no work, so it printed no `Done in` line at all
 *     - **aborted** — pnpm ERRORED, and its error path exits before the close line
 *     - **unreadable** — pnpm DID work, exited clean, and worded its close line in a way
 *       this regex does not match (a reword, a locale suffix)
 *
 *   so `no-op` is earned by a POSITIVE match on pnpm's own words, `aborted` by a POSITIVE
 *   nonzero exit, and any other read is `unreadable`, which is fatal
 *   (`rule.forbid.failhide`). **the guard fails CLOSED.**
 *
 * 🚨 .`aborted` is its own member because pnpm suppresses its close line on ANY nonzero
 *   exit — measured at pnpm 11.18.0, and it fires on the cell this clamp most depends on
 *   (pnpm 11 + a gated hook is always nonzero).
 *
 *   ⚠️ `aborted` is NOT a free pass — the caller still proves the pin another way, and
 *   only the LOCAL target can. see the call site.
 */
type PnpmVersionRanRead =
  | { kind: 'confirmed'; version: string }
  | { kind: 'no-op' }
  | { kind: 'aborted' }
  | { kind: 'unreadable' };

/**
 * .what = pnpm's own words for "there was no work to do", each of which explains an
 *   absent `Done in` line
 * .why  = the no-op branch must be earned by a POSITIVE match, never inferred from a
 *   failed match. a future pnpm reword is then a one-line edit here
 */
const PNPM_NO_OP_MARKERS = [
  'Already up to date',
  'Lockfile is up to date',
] as const;

const asPnpmVersionRanFromInstallOutput = (input: {
  output: string;
  exitCode: number | null;
}): PnpmVersionRanRead => {
  const version = /Done in .* using pnpm v([0-9]+\.[0-9]+\.[0-9]+)/.exec(
    input.output,
  )?.[1];
  if (version !== undefined) return { kind: 'confirmed', version };

  if (PNPM_NO_OP_MARKERS.some((marker) => input.output.includes(marker)))
    return { kind: 'no-op' };

  // 🚨 read the ABORT before the fallthrough. a nonzero exit explains the absent close
  //   line STRUCTURALLY rather than by a guess at pnpm's wording. `null` (killed by
  //   signal / never spawned) is aborted too: no clean exit, so no close line was owed
  if (input.exitCode !== 0) return { kind: 'aborted' };

  return { kind: 'unreadable' };
};

/**
 * .what = a value made safe to sit in a temp-dir name
 * .why  = a spec (`pnpm@10.24.0`) and a version (`1.2.0-beta.15`) both carry `@` and `.`,
 *   which make a dir name awkward to read and to glob. one owner, two call sites
 */
const asDirSlugSafe = (input: { value: string }): string =>
  input.value.replace(/[^a-z0-9]/gi, '-');

/**
 * .what = the in-package dir node-pty probes for this host's prebuilt addon
 * .why  = node-pty's own loadNativeModule tries `prebuilds/${platform}-${arch}`, so
 *   this mirrors its lookup rather than a path we invent
 */
const asPtyPrebuildDir = (): string =>
  `prebuilds/${getPtyHostTupleFromProcess()}`;

/**
 * .what = how deep node-pty sits below the project that installs
 *
 * .why  = a real consumer NEVER declares node-pty. they install rhachet, and node-pty
 *   arrives one level below as its optional dep — "a human has no way to know a
 *   TRANSITIVE optional dep needs an allowlist entry". a direct-only clamp would prove
 *   the criterion on a path no consumer walks
 */
type ConsumerDepth = 'direct' | 'transitive';

/** the stub package that stands in for rhachet at the `transitive` depth */
const PARENT_NAME = 'pty-clamp-parent';

/**
 * .what = which install COMMAND the consumer runs — a project install, or a global one
 *
 * .why  = 🚨 `pnpm add -g rhachet` is the wish's LITERAL entrypoint, and not the same
 *   subject as `pnpm install`. three facts differ:
 *
 *   - NO consumer manifest — pnpm GENERATES one, so a `pnpm.onlyBuiltDependencies`
 *     allowlist is not merely absent here, it is inexpressible
 *   - the layout differs by major: pnpm 10 writes `<globalDir>/<n>/`, pnpm 11 writes
 *     `<globalDir>/v11/<hash>/` and keeps the package in a store-links tree
 *   - the REPORT differs from local. see `PACKAGE_MANAGER_REPORT_EXPECTED`
 *
 * .note = ⚠️ a global row runs into a TEMP global dir via `--global-dir` /
 *   `--global-bin-dir`. without that isolation it mutates the human's real global store
 *
 * .note = the word is `target`, never `scope` — `execNpmInstall` already names this
 *   union `NpmInstallTarget` (rule.forbid.domain-term-synonyms), and `scope` is taken
 */
type ConsumerInstallTarget = 'local' | 'global';

/**
 * .what = the pnpm arg vector a consumer row installs with — one owner for both targets
 *
 * .why  = production owns this identical decision in one named transformer
 *   (`asNpmInstallArgs`), so the clamp mirrors it rather than rebuilds the vector inline
 *   at two `spawnSync` branches (`rule.require.named-transformers`)
 *
 * .note = 🚨 the local vector's `--ignore-workspace` is LOAD-BEARING. without it pnpm
 *   walks up and adopts THIS repo's workspace root, which drags our lockfile and our
 *   build allowlist back in — the contamination the clamp exists to exclude.
 *
 * .note = the hook opt-out is added only when a row asks for it, so each vector mirrors
 *   the real invocation in `execNpmInstallLocal` / `execNpmInstallGlobal`.
 */
const asConsumerInstallArgs = (input: {
  target: ConsumerInstallTarget;
  ignoreScripts: boolean;
  global: { dir: string; binDir: string; specifier: string } | null;
}): string[] => {
  const hookFlags = input.ignoreScripts ? ['--ignore-scripts'] : [];

  if (input.target === 'local')
    return ['install', '--ignore-workspace', ...hookFlags];

  // 🚨 a global row with no store dirs would write into the HUMAN's real global install.
  //   the type permits the shape, so the guard is what forbids it
  const store =
    input.global ??
    MalfunctionError.throw('a global row was asked for with no store dirs', {
      hint: 'pass `global` whenever target is `global` — the store must live inside the temp project, or the row mutates the human real global install',
    });

  return [
    'add',
    '-g',
    '--global-dir',
    store.dir,
    '--global-bin-dir',
    store.binDir,
    ...hookFlags,
    store.specifier,
  ];
};

/**
 * .what = the bytes a live pty must echo back for the spawn to count as real
 *
 * .why  = presence of an addon on disk is not proof it works, so every spawn row asserts
 *   a round trip: this token goes in through a pty and must come back out of one
 *
 * .note = ⚠️ it must hold no quote character — it is interpolated into the probe body as a
 *   single-quoted literal inside a double-quoted `-e` arg. `[case0]` enforces it
 */
const PTY_PROBE_TOKEN = 'pty-ok';

/**
 * .what = the probe body — loads node-pty and spawns a REAL pty through it
 * .why  = written to a FILE rather than passed via `-e`: node looks a specifier up from
 *   the dir of the file that holds it, and at the transitive depth the load must be
 *   attempted from INSIDE the parent package — where rhachet's own dist attempts it
 */
const PTY_PROBE_SOURCE = [
  'const out = { ptyPackageDir: null, addonLoaded: false, spawnBytes: null, loadError: null };',
  // where node ITSELF looks the package up. read rather than constructed: the layout
  // differs by depth (pnpm hoists a direct dep, keeps a transitive one in its virtual
  // store), so a hand-built path would report one layout as an absent install
  'try { out.ptyPackageDir = require("path").dirname(require.resolve("node-pty/package.json")); }',
  'catch (error) { out.ptyPackageDir = null; }',
  // looked up SEPARATELY from the load — the two fail independently: at 1.1.0 on linux
  // the package is found fine and only its addon is absent. to conflate them would report
  // the defect under test as a broken harness
  'try {',
  '  const pty = require("node-pty");',
  '  out.addonLoaded = typeof pty.spawn === "function";',
  // the token is INTERPOLATED rather than re-typed, so the bytes the probe writes and the
  // bytes the assertion expects cannot drift apart
  `  const child = pty.spawn(process.execPath, ["-e", "process.stdout.write('${PTY_PROBE_TOKEN}')"], { cwd: process.cwd() });`,
  // a const array rather than a reassigned string, so `out.spawnBytes` is written once
  '  const chunks = [];',
  // 🚨 THE VERDICT IS DRIVEN BY THE BYTES, NOT BY THE EXIT.
  //
  //   ⚠️ a pty guarantees NO order between a child's final data chunk and its exit event,
  //   so a read of `chunks` inside `onExit` ALONE reads EMPTY whenever exit wins the race.
  //   the moment the token lands the verdict is written; the exit path is the SAD path only
  //
  //   .note = no re-entry guard is needed: `emit` ends with `process.exit(0)`
  //     (rule.require.immutable-vars)
  //
  //   ⚠️ the exit path uses `setImmediate`, never a wall-clock grace — the need is ORDER,
  //     not duration: let the queued I/O callbacks run before `chunks` is read. a timer
  //     would bound a late chunk to N ms with no measurement behind N
  //     (`rule.forbid.behavior-hazards`)
  '  const emit = () => { out.spawnBytes = chunks.join("").trim(); process.stdout.write(JSON.stringify(out)); process.exit(0); };',
  // a NAMED guard (`rule.require.named-transformers`), inline here as the probe is a
  //   generated file
  `  const hasToken = () => chunks.join("").indexOf('${PTY_PROBE_TOKEN}') !== -1;`,
  '  child.onData((d) => { chunks.push(d); if (hasToken()) emit(); });',
  // `setImmediate`, never a timed grace — see the ⚠️ above
  '  child.onExit(() => { setImmediate(emit); });',
  '} catch (error) {',
  '  out.loadError = String(error && error.message);',
  '  process.stdout.write(JSON.stringify(out));',
  '  process.exit(0);',
  '}',
].join('\n');

/**
 * .what = the project dir pnpm GENERATES for a global install, discovered by a scan
 *
 * .why  = 🚨 the layout is a property of the major (pnpm 10: `<globalDir>/<n>/`, pnpm 11:
 *   `<globalDir>/v11/<hash>/`), so it is DISCOVERED by a scan for the dir that carries a
 *   `node_modules`. a fixed path would report the other major as an absent install.
 *
 * .note = named `getOne*`, never `find*` (`rule.require.get-set-gen-verbs`)
 */
const getOneGlobalProjectDir = (input: {
  dir: string;
  depthLeft: number;
}): string | null => {
  if (input.depthLeft < 0) return null;
  for (const name of readdirSync(input.dir)) {
    const candidate = join(input.dir, name);
    if (existsSync(join(candidate, 'node_modules'))) return candidate;
    if (existsSync(join(candidate, 'package.json'))) continue;
    const nested = ((): string | null => {
      try {
        return getOneGlobalProjectDir({
          dir: candidate,
          depthLeft: input.depthLeft - 1,
        });
      } catch (error) {
        // 🚨 an ALLOWLIST, never a catch-all. the one skippable condition is `ENOTDIR` —
        //   a candidate that is a plain file with no entries to walk. a swallowed EACCES
        //   would surface at the caller as `no project dir` (`rule.forbid.failhide`)
        if ((error as NodeJS.ErrnoException).code !== 'ENOTDIR') throw error;
        return null;
      }
    })();
    if (nested) return nested;
  }
  return null;
};

/**
 * .what = the SPECIFIER a global install is pointed at, and the tarball it may need
 *
 * .why  = at the direct depth that is the registry package itself. ⚠️ at the transitive
 *   depth it must be a real TARBALL of the parent, never a directory — `pnpm add -g
 *   <dir>` creates a `link:`, which does not install the linked package's own deps, so
 *   node-pty would never arrive and the row would read as an absent addon for a reason
 *   unrelated to the build gate.
 *
 * .note = named `gen*`, never `as*` — this spawns `pnpm pack` and writes to disk
 *   (`rule.require.named-transformers`)
 *
 * .note = `specifier`, never `target` — `target` names the local/global axis here
 */
const genGlobalSpecifier = (input: {
  depth: ConsumerDepth;
  version: string;
  projectDir: string;
  parentDir: string;
  env: NodeJS.ProcessEnv;
}): string => {
  if (input.depth === 'direct') return `node-pty@${input.version}`;
  const pack = spawnSync(
    'pnpm',
    ['pack', '--pack-destination', input.projectDir],
    {
      cwd: input.parentDir,
      encoding: 'utf8',
      timeout: 120_000,
      env: input.env,
    },
  );

  // 🚨 READ THE PACK'S OWN VERDICT FIRST. with this absent, a nonzero pack exits silently
  //   and the throw below guesses at the cause while pnpm's stderr names it
  //   (`rule.forbid.failhide`). the structural death is read BEFORE the exit code: a
  //   child killed at its bound has `status === null`, which a bare `status !== 0` test
  //   would render as a clean pass
  if (pack.error !== undefined || pack.signal !== null)
    MalfunctionError.throw('`pnpm pack` never completed for the parent stub', {
      parentDir: input.parentDir,
      error: pack.error?.message ?? null,
      signal: pack.signal,
      stderr: pack.stderr ?? null,
      hint: 'the child died rather than exited — a 120s timeout kill, or a pnpm that never spawned. the signal and error above name which',
    });
  if (pack.status !== 0)
    MalfunctionError.throw('`pnpm pack` failed for the parent stub', {
      parentDir: input.parentDir,
      exitCode: pack.status,
      // 🚨 pnpm's OWN words, carried rather than paraphrased. a malformed manifest, an
      //   absent `files` entry, and a registry read all land here, and only this string
      //   tells them apart
      stderr: pack.stderr ?? null,
      stdout: pack.stdout ?? null,
      hint: 'read the stderr above — it is pnpm’s own account of why the pack failed. the row below cannot run without the tarball',
    });

  const tarball = readdirSync(input.projectDir).find((name) =>
    name.endsWith('.tgz'),
  );

  // .note = still reachable, and it names a NARROW fact: pack reported success yet left
  //   no tarball where we asked. a genuine surprise rather than a catch-all
  return tarball
    ? join(input.projectDir, tarball)
    : MalfunctionError.throw(
        '`pnpm pack` reported success yet left no tarball',
        {
          parentDir: input.parentDir,
          packDestination: input.projectDir,
          stdout: pack.stdout ?? null,
          hint: 'pack exited 0, so this is not a pack failure — the tarball landed somewhere other than --pack-destination, or was removed between the write and this read',
        },
      );
};

/**
 * .what = install one node-pty version into a fresh consumer project, then try to
 *   load it and spawn a real pty through it
 * .why  = one procedure serves both the red control and the green subject, so the two
 *   are proven under identical conditions — the only variable is the version
 */
const genConsumerInstall = (input: {
  version: string;
  depth: ConsumerDepth;
  /**
   * .what = whether the consumer's manifest carries a `pnpm.onlyBuiltDependencies`
   *   key at all, and if so, one that does NOT name node-pty
   *
   * .why  = our ci runs `pnpm install --frozen-lockfile` with no fallback, so whether
   *   pnpm treats an unlisted blocked build as fatal or advisory decides whether ci
   *   installs at all. 'absent' is what a consumer has, 'present-without-node-pty' is
   *   what WE have, 'ignored-explicitly' adds `ignoredBuiltDependencies`. all three are
   *   measured rather than claimed from pnpm's docs
   */
  allowlist: 'absent' | 'present-without-node-pty' | 'ignored-explicitly';
  /**
   * .what = whether the install passes `--ignore-scripts`, the flag
   *   `execNpmInstallLocal` hard-codes on EVERY local upgrade
   *
   * .why  = `rhx upgrade` local is the DEFAULT target, and it opts out of every build
   *   hook. two independent questions ride on the answer:
   *   1. does pnpm still EXIT nonzero under the flag? (decides whether the local path
   *      throws on a successful install — this wish's own defect, on the common path)
   *   2. does the ADDON still load? (decides whether the flag breaks the cure itself)
   */
  ignoreScripts?: boolean;
  /**
   * .what = which package manager the consumer installs under
   * .why  = defaults to `ours`, the version our ci runs, so the matrix is deterministic.
   *   `next-major` shows the capability INVARIANT across a package-manager major
   */
  packageManager?: ConsumerPackageManager;
  /**
   * .what = whether the consumer runs `pnpm install` (a project) or `pnpm add -g`
   * .why  = defaults to `local`, which every case before [case9] measures. `global` is
   *   the wish's literal entrypoint — see `ConsumerInstallTarget`
   */
  target?: ConsumerInstallTarget;
}): {
  buildGateBlocked: boolean;
  installExitCode: number | null;
  /**
   * .what = the package manager version that actually ran
   * .why  = a row that asserts a gate or an exit code asserts THAT version's protocol,
   *   never a property of node-pty. carried out so a red row names its own version
   */
  packageManagerVersion: string;
  /**
   * .what = the raw stdout+stderr of the install
   * .why  = an exit code alone says a run failed, never WHY. carried so a red row
   *   diagnoses itself
   */
  installOutput: string;
  prebuiltOnDisk: boolean;
  /**
   * .what = whether node-gyp compiled the addon here, read from `build/` on disk
   * .why  = the version-independent form of "the build hook was blocked" — pnpm 10 and
   *   pnpm 11 block the identical hook and report it in different words
   */
  builtOnDisk: boolean;
  ptyPackageDir: string | null;
  addonLoaded: boolean;
  spawnBytes: string | null;
  loadError: string | null;
  /**
   * .what = the manifest pnpm GENERATED for a global install, verbatim; null when the
   *   row is a local install, which uses the manifest we wrote instead
   * .why  = the evidence that a consumer's build allowlist cannot reach a global install
   */
  manifestGlobal: string | null;
} => {
  const target = input.target ?? 'local';
  // .why = normalized once, so no downstream read re-derives the default
  //   (`rule.forbid.undefined-inputs`)
  const ignoreScripts = input.ignoreScripts ?? false;
  const packageManagerSpec = asPackageManagerSpec({
    packageManager: input.packageManager ?? 'ours',
  });

  const projectDir = genTempDir({
    slug: `pty-consumer-${target}-${input.depth}-${input.allowlist}${
      ignoreScripts ? '-noscripts' : ''
    }-${asDirSlugSafe({ value: packageManagerSpec })}-${asDirSlugSafe({
      value: input.version,
    })}`,
  });

  // at the transitive depth a stub stands where rhachet stands: IT declares node-pty, the
  // consumer declares only the stub. the consumer's manifest never names node-pty at all
  const parentDir = join(projectDir, 'parent');
  if (input.depth === 'transitive') {
    mkdirSync(parentDir, { recursive: true });
    writeFileSync(
      join(parentDir, 'package.json'),
      JSON.stringify(
        {
          name: PARENT_NAME,
          version: '0.0.0',
          private: true,
          optionalDependencies: { 'node-pty': input.version },
        },
        null,
        2,
      ),
    );
  }

  // the consumer manifest. at `allowlist: 'absent'` note what is MISSING: any build
  // allowlist — the ordinary consumer condition.
  // .note = ⚠️ node-pty is declared OPTIONAL, as rhachet declares it. pnpm accounts an
  //   optional dep's blocked build hook differently from a regular one, so a plain
  //   `dependencies` entry would test a condition no consumer is ever in
  writeFileSync(
    join(projectDir, 'package.json'),
    JSON.stringify(
      {
        name: 'pty-consumer-clamp',
        version: '0.0.0',
        private: true,
        // 🚨 pin the package manager — see `getPackageManagerPinned`
        packageManager: packageManagerSpec,
        ...(input.depth === 'direct'
          ? { optionalDependencies: { 'node-pty': input.version } }
          : { dependencies: { [PARENT_NAME]: 'file:./parent' } }),
        // 'bun' mirrors THIS repo's own surviving entry: a key that exists yet omits the
        // blocked package.
        // .note = `ignoredBuiltDependencies` is a SEPARATE key — it does not build the
        //   package, only declares the block expected, so the tree stays no-build
        ...(input.allowlist === 'present-without-node-pty'
          ? { pnpm: { onlyBuiltDependencies: ['bun'] } }
          : {}),
        ...(input.allowlist === 'ignored-explicitly'
          ? {
              pnpm: {
                onlyBuiltDependencies: ['bun'],
                ignoredBuiltDependencies: ['node-pty'],
              },
            }
          : {}),
      },
      null,
      2,
    ),
  );

  // 🚨 confirm the pin TOOK before a single row is measured. if pnpm's self-manage ever
  //   stops, every report row below would silently measure a different pnpm
  const packageManagerWanted = asVersionFromPackageManagerSpec({
    spec: packageManagerSpec,
  });
  const packageManagerVersion =
    spawnSync('pnpm', ['--version'], {
      cwd: projectDir,
      encoding: 'utf8',
      timeout: 120_000,
    }).stdout?.trim() ?? '';
  if (packageManagerVersion !== packageManagerWanted)
    MalfunctionError.throw('the packageManager pin did not take', {
      wanted: packageManagerWanted,
      ran: packageManagerVersion,
      projectDir,
      hint: 'pnpm self-manages to the `packageManager` field; if that is disabled (manage-package-manager-versions=false) this clamp measures the wrong pnpm and its report rows are void',
    });

  // 🚨 the global target needs its OWN store, or the row writes into the human's real
  //   global install. PNPM_HOME rides along because pnpm refuses a global install with
  //   no global bin dir known
  const globalDir = join(projectDir, 'pnpm-global');
  const globalBinDir = join(projectDir, 'pnpm-bin');
  if (target === 'global') {
    mkdirSync(globalDir, { recursive: true });
    mkdirSync(globalBinDir, { recursive: true });
  }
  const envGlobal = {
    ...process.env,
    PNPM_HOME: globalBinDir,
    PATH: `${globalBinDir}:${process.env.PATH ?? ''}`,
  };

  // .note = the specifier is produced INSIDE this branch — `genGlobalSpecifier` packs a
  //   tarball as a side effect, so a local row must never reach it
  const installArgs = asConsumerInstallArgs({
    target,
    ignoreScripts,
    global:
      target === 'global'
        ? {
            dir: globalDir,
            binDir: globalBinDir,
            specifier: genGlobalSpecifier({
              depth: input.depth,
              version: input.version,
              projectDir,
              parentDir,
              env: envGlobal,
            }),
          }
        : null,
  });

  const install = spawnSync('pnpm', installArgs, {
    cwd: projectDir,
    encoding: 'utf8',
    timeout: 300_000,
    // .why = the global row needs PNPM_HOME aimed into the temp tree; the local row runs
    //   under the ambient env, as a consumer's own `pnpm install` does
    env: target === 'global' ? envGlobal : process.env,
  });

  // .note = a nonzero exit is NOT a failure of this clamp — ERR_PNPM_IGNORED_BUILDS is an
  //   observation it records. the property under test is whether the ADDON ends up usable
  const installOutput = `${install.stdout ?? ''}${install.stderr ?? ''}`;
  const buildGateBlocked = installOutput.includes('ERR_PNPM_IGNORED_BUILDS');

  // 🚨 the pin re-confirmed from the INSTALL's own output. a global install prints
  //   `[WARN] Using --global skips the package manager check`, so the pre-flight proves a
  //   DIFFERENT invocation; pnpm's close line names the version that did THIS work.
  //   the guard FAILS CLOSED: `unreadable` voids the row exactly as a mismatch would
  const packageManagerVersionRan = asPnpmVersionRanFromInstallOutput({
    output: installOutput,
    exitCode: install.status,
  });
  if (packageManagerVersionRan.kind === 'unreadable')
    MalfunctionError.throw(
      'the install exited CLEAN yet named no package-manager version, and no no-op either',
      {
        wanted: packageManagerWanted,
        target,
        projectDir,
        installOutput,
        hint: 'pnpm closes a CLEAN run with `Done in … using pnpm vN.N.N`, and a no-op with a marker in PNPM_NO_OP_MARKERS. this run exited 0 and matched neither, so it is unpinned rather than idle — most likely pnpm reworded one of the two. update the reader, never the guard. (a NONZERO exit reads as `aborted`, never as this: pnpm withholds the close line on its error path, which is measured rather than assumed)',
      },
    );

  // 🚨 an ABORTED run still owes proof of the pin — `aborted` explains the ABSENT close
  //   line, never the VERSION behind it. the asymmetry is pnpm's own:
  //
  //     - LOCAL  — pnpm enforces the `packageManager` field, so the pre-flight above
  //       (same `projectDir`, fatal on mismatch) already names which pnpm this dir uses
  //     - GLOBAL — pnpm skips that check, so the pre-flight proves a DIFFERENT
  //       invocation. with the close line withheld too, no evidence remains
  //
  //   ⚠️ unreached today — both global rows exit 0 at both majors. a guard against a
  //   future where they do not, and it fails CLOSED
  if (packageManagerVersionRan.kind === 'aborted' && target === 'global')
    MalfunctionError.throw(
      'a global install aborted, so neither its close line nor the pre-flight can name the package manager that ran',
      {
        wanted: packageManagerWanted,
        exitCode: install.status,
        target,
        projectDir,
        installOutput,
        hint: 'a global install skips the packageManager check, so `pnpm --version` proves a different invocation; and a nonzero exit withholds the close line. no evidence remains, so this row is void rather than green',
      },
    );
  // 🚨 the mismatch guard is LOCAL-ONLY, and the asymmetry is pnpm's, not a carve-out:
  //
  //   - LOCAL  — pnpm ENFORCES the `packageManager` field, so a version other than the
  //     pinned one means self-manage broke. and the local report DIFFERS by major
  //     (`PACKAGE_MANAGER_REPORT_EXPECTED.local`), so an unpinned run voids the row
  //   - GLOBAL — pnpm SKIPS that check (`Using --global skips the package manager
  //     check`), so the pin is UNENFORCEABLE here by construction. a host runs whichever
  //     pnpm it has, which is exactly the wish's condition: a human types
  //     `pnpm add -g rhachet` with THEIR pnpm
  //
  // ⚠️ so a global mismatch voids no row — `PACKAGE_MANAGER_REPORT_EXPECTED.global` is
  //   identical at both majors, and no CAPABILITY row reads that table at all. to demand
  //   the pin here made the clamp pass only on a host whose ambient pnpm happened to
  //   match, which is a property of the host rather than of the cure
  if (
    target === 'local' &&
    packageManagerVersionRan.kind === 'confirmed' &&
    packageManagerVersionRan.version !== packageManagerWanted
  )
    MalfunctionError.throw('the install ran a package manager we did not pin', {
      wanted: packageManagerWanted,
      ran: packageManagerVersionRan.version,
      target,
      projectDir,
      hint: 'pnpm enforces the `packageManager` field on a LOCAL install; if that is disabled (manage-package-manager-versions=false) this row measures a version we never named and its report rows are void',
    });

  // .why = the exit code is a SEPARATE user-faced fact from the capability, and the two
  //   diverge: a human can watch their install "fail" while the addon works fine
  const installExitCode = install.status;

  const globalProjectDir =
    target === 'global'
      ? (getOneGlobalProjectDir({ dir: globalDir, depthLeft: 2 }) ??
        MalfunctionError.throw('the global install produced no project dir', {
          globalDir,
          status: install.status,
          stderr: install.stderr?.slice(-3000) ?? null,
          hint: 'pnpm lays the global dir out differently per major; if a future major changes it again, widen getOneGlobalProjectDir rather than hard-code a path',
        }))
      : null;

  // WHERE the load is attempted from. at the direct depth the project root; at the
  // transitive depth it MUST be the parent package's own dir — pnpm isolates by default,
  // so a load from the root would fail for a reason unrelated to the build gate. mirrors
  // rhachet's loader, which runs from inside rhachet's dist
  const loadRootDir = globalProjectDir ?? projectDir;
  const loadBaseDir =
    input.depth === 'direct'
      ? loadRootDir
      : join(loadRootDir, 'node_modules', PARENT_NAME);

  // load + spawn in a CHILD process, from a probe FILE inside the load base — the addon
  // is reached through node-pty's own lookup, and no native load pollutes this jest worker
  const probePath = join(loadBaseDir, 'pty-clamp-probe.cjs');
  writeFileSync(probePath, PTY_PROBE_SOURCE);
  const probe = spawnSync(process.execPath, [probePath], {
    cwd: loadBaseDir,
    encoding: 'utf8',
    timeout: 120_000,
  });

  // 🚨 the PROBE's own outcome is settled STRUCTURALLY, before a byte of its stdout is
  //   read, and as its OWN row rather than folded into the install verdict. `spawnSync`
  //   stamps `error` on a timeout kill and on a spawn that never started; a signal death
  //   leaves `signal` set. ⚠️ let those fall through to the install guard below and an
  //   empty stdout reads as `ptyPackageDir: null` — a hung pty spawn diagnosed as a
  //   network fault (`rule.forbid.failhide`)
  if (probe.error !== undefined || probe.signal !== null)
    MalfunctionError.throw('the pty clamp probe never reached an exit', {
      version: input.version,
      depth: input.depth,
      loadBaseDir,
      signal: probe.signal,
      error: probe.error?.message ?? null,
      stderr: probe.stderr?.slice(-2000) ?? null,
      hint: 'this is a HARNESS condition, not an install one — the probe was killed (its 120s bound, or a pty spawn that hung on this host), so the install itself is UNJUDGED. debug pty-clamp-probe.cjs, whose verdict emits from `hasToken()` on data and from `child.onExit` as the fallback; do not read this as a registry or network fault',
    });

  const rawVerdict = probe.stdout?.trim() ?? '';

  // the probe exited under its own power yet wrote no verdict — a HARNESS condition,
  // separable from an install failure only here
  if (!rawVerdict.startsWith('{'))
    MalfunctionError.throw('the pty clamp probe exited without a verdict', {
      version: input.version,
      depth: input.depth,
      loadBaseDir,
      exitCode: probe.status,
      stdout: rawVerdict.slice(-2000) || null,
      stderr: probe.stderr?.slice(-2000) ?? null,
      hint: 'this is a HARNESS condition, not an install one — the probe ran to an exit and emitted no json, so the install itself is UNJUDGED. debug pty-clamp-probe.cjs rather than the registry',
    });

  const parsed: {
    ptyPackageDir: string | null;
    addonLoaded: boolean;
    spawnBytes: string | null;
    loadError: string | null;
  } = JSON.parse(rawVerdict);

  // the package must at least have materialized WHERE THE LOADER LOOKS.
  // .note = reached ONLY once the probe has spoken (the two guards above own every silent
  //   outcome), so a null here is the probe's own report of a missed lookup rather than a
  //   harness symptom wearing an install label
  if (parsed.ptyPackageDir === null)
    MalfunctionError.throw('the consumer install never materialized node-pty', {
      version: input.version,
      depth: input.depth,
      loadBaseDir,
      status: install.status,
      stderr: install.stderr?.slice(-3000) ?? null,
      stdout: install.stdout?.slice(-3000) ?? null,
      // 🚨 the probe's own reason for the miss, never dropped: `loadError` usually holds
      //   the true cause, and a confident network cure stated over it is
      //   `rule.forbid.failhide`
      loadError: parsed.loadError,
      hint:
        parsed.loadError === null
          ? 'the probe named no load error, so the lookup missed with no cause reported — that pattern fits a registry or network miss; check network access and that pnpm is on PATH'
          : `the probe DID name a load error, so the cause is reported rather than presumed — read it before any network cure: ${parsed.loadError}`,
    });

  const prebuiltOnDisk = existsSync(
    join(
      parsed.ptyPackageDir,
      asPtyPrebuildDir(),
      asPtyAddonFileName(process.platform),
    ),
  );

  // .what = whether node-gyp actually COMPILED here — `build/` exists only when the
  //   install hook ran a real compile
  // .why  = the trigger condition, read DIRECTLY. to infer it from
  //   `ERR_PNPM_IGNORED_BUILDS` would bind it to one major's wording; read off disk it
  //   holds at every package-manager version
  const builtOnDisk = existsSync(join(parsed.ptyPackageDir, 'build'));

  return {
    buildGateBlocked,
    installExitCode,
    packageManagerVersion,
    installOutput,
    prebuiltOnDisk,
    builtOnDisk,
    manifestGlobal: globalProjectDir
      ? readFileSync(join(globalProjectDir, 'package.json'), 'utf8')
      : null,
    ...parsed,
  };
};

/**
 * .what = how each package-manager major REPORTS a blocked build hook
 *
 * .why  = 🚨 the two majors block the identical hook and describe it differently.
 *   measured, both ways:
 *
 *     pnpm 10.24.0 — reads the `pnpm` field; blocks the hook; reports a WARN; exits 0
 *     pnpm 11.18.0 — ignores the `pnpm` field; blocks the hook; raises
 *                    ERR_PNPM_IGNORED_BUILDS; exits 1
 *
 *   ⚠️ DATA per major, never a constant: a clamp on the AMBIENT pnpm would write 11's
 *   answers down as our pinned 10's. no CAPABILITY row reads from this table — the
 *   tarball's prebuild decides the addon's fate
 */
const PACKAGE_MANAGER_REPORT_EXPECTED: Record<
  ConsumerInstallTarget,
  Record<
    ConsumerPackageManager,
    { buildGateBlocked: boolean; installExitCode: number }
  >
> = {
  local: {
    ours: { buildGateBlocked: false, installExitCode: 0 },
    'next-major': { buildGateBlocked: true, installExitCode: 1 },
  },
  // 🚨 the global path does NOT match the local one — the reason this table is keyed by
  //   target rather than by major alone. measured, both ways:
  //
  //     pnpm 10.24.0, `pnpm add -g` — blocks the hook, reports a WARN, exits 0
  //     pnpm 11.18.0, `pnpm add -g` — blocks the hook, reports no line at all, exits 0
  //
  //   the second row against its local twin: the identical package, gated the identical
  //   way, exits 1 under `pnpm install` and exits 0 in silence under `pnpm add -g`.
  //   `execNpmInstallGlobal` classifies a NONZERO exit, and here there is none — so the
  //   wish's literal entrypoint cannot report a false failure at either major
  global: {
    ours: { buildGateBlocked: false, installExitCode: 0 },
    'next-major': { buildGateBlocked: false, installExitCode: 0 },
  },
};

/**
 * .what = what a consumer install of node-pty@1.1.0 yields on THIS host
 * .why  = the platform branch belongs in the expectation DATA, never in a test body. ⚠️ an
 *   `if (platform !== x) return` would let a then pass with no assertion at all —
 *   vacuously green on every platform it skips (rule.forbid.failhide). as data, every
 *   platform gets a real assertion
 */
const PTY_BROKEN_EXPECTED =
  process.platform === 'linux'
    ? {
        // 1.1.0 ships prebuilds for darwin + win32 only, so linux must compile — and
        // pnpm's gate blocks it. the addon never appears
        prebuiltOnDisk: false,
        addonLoaded: false,
        // the field report's exact error, doubled slash and all
        loadErrorContains: 'prebuilds/linux-x64//pty.node',
      }
    : {
        // a prebuild shipped here even at 1.1.0, so the blocked hook was benign. that
        // asymmetry IS the root cause: the defect stayed invisible on mac and windows
        prebuiltOnDisk: true,
        addonLoaded: true,
        loadErrorContains: null,
      };

/**
 * .what = what a consumer install of the version WE declare yields on THIS host
 * .why  = same data-over-branch reason as above. an unsupported host must fail LOUD (a
 *   visible load error) rather than degrade quietly, so its row asserts as strictly
 */
const PTY_DECLARED_EXPECTED =
  getPtyPlatformSupportFromProcess() === 'supported'
    ? {
        prebuiltOnDisk: true,
        addonLoaded: true,
        loadErrorIsNull: true,
        // the SAME constant the probe emits, never a re-typed copy of it
        spawnBytesContains: PTY_PROBE_TOKEN,
      }
    : {
        // upstream ships no binary for this host (alpine/musl, freebsd, riscv), so an
        // absent addon is correct here rather than a defect
        prebuiltOnDisk: false,
        addonLoaded: false,
        loadErrorIsNull: false,
        // .note = ⚠️ `null` rather than `''`. an empty string would make the spawn row
        //   read `toContain('')`, true of EVERY string — no verification at all, on
        //   exactly the hosts where the addon cannot load. the `null` sentinel forces
        //   both legs to assert a concrete fact (rule.forbid.failhide)
        spawnBytesContains: null,
      };

describe('getPtyModuleOrNull.consumer.integration', () => {
  /**
   * .what = guards the one invariant PTY_PROBE_TOKEN's docblock states
   * .why  = ⚠️ the token is interpolated at two sites into a GENERATED file, so a quote
   *   would break that file with no type error anywhere
   * .the mutation that reddens this: put a quote in `PTY_PROBE_TOKEN`
   */
  given('[case0] the probe token itself', () => {
    when('[t0] the no-quote invariant is checked', () => {
      then('it holds no quote character of any kind', () => {
        expect(PTY_PROBE_TOKEN).not.toMatch(/['"`]/);
      });

      then('it is non-empty, so a round trip can assert on it', () => {
        expect(PTY_PROBE_TOKEN.length).toBeGreaterThan(0);
      });
    });
  });

  given(
    '[case1] the RED CONTROL — node-pty@1.1.0, the version that carried the defect',
    () => {
      const scene = useBeforeAll(async () => ({
        result: genConsumerInstall({
          version: PTY_VERSION_BROKEN,
          depth: 'direct',
          allowlist: 'absent',
        }),
      }));

      when('[t0] a consumer installs it with the build gate live', () => {
        then('NO build hook ran — the trigger condition, read off disk', () => {
          // .the mutation that reddens this: a compile that runs here — then the clamp
          //   no longer exercises the defect it guards
          expect(scene.result.builtOnDisk).toBe(false);
        });

        then(
          'the addon is present exactly on the platforms 1.1.0 shipped a prebuild for',
          () => {
            expect(scene.result.prebuiltOnDisk).toBe(
              PTY_BROKEN_EXPECTED.prebuiltOnDisk,
            );
            expect(scene.result.addonLoaded).toBe(
              PTY_BROKEN_EXPECTED.addonLoaded,
            );
          },
        );

        then(
          'the package manager reports the block exactly as its major does',
          () => {
            // the BASELINE for [case2]'s identical read: whatever the report is, it
            // predates this change, so a match there cannot be credited to our fix
            expect({
              buildGateBlocked: scene.result.buildGateBlocked,
              installExitCode: scene.result.installExitCode,
            }).toEqual(PACKAGE_MANAGER_REPORT_EXPECTED.local.ours);
          },
        );

        then(
          'the load error matches this platform exactly — the field report verbatim where absent, and NULL where present',
          () => {
            // .note = ⚠️ two legs, each a DIFFERENT concrete fact. a tidy
            //   `toContain(expected ?? '')` would degrade to `toContain('')` on the null
            //   leg — true of every string, so the row would stay green regardless
            const { loadErrorContains } = PTY_BROKEN_EXPECTED;

            // absent: the failure must reproduce the field report verbatim — this proves
            // the clamp SEES the defect
            if (loadErrorContains !== null)
              expect(scene.result.loadError).toContain(loadErrorContains);

            // present: a prebuild shipped here even at 1.1.0, so any load error is a real
            // regression on this platform
            if (loadErrorContains === null)
              expect(scene.result.loadError).toBeNull();
          },
        );
      });
    },
  );

  given(
    '[case2] the SUBJECT — the node-pty version rhachet declares today',
    () => {
      const scene = useBeforeAll(async () => ({
        version: getPtyVersionDeclared(),
        result: genConsumerInstall({
          version: getPtyVersionDeclared(),
          depth: 'direct',
          allowlist: 'absent',
        }),
      }));

      when('[t0] a consumer installs it with the build gate live', () => {
        then(
          'the build hook is STILL blocked — the cure never argues with the gate, it makes its outcome irrelevant',
          () => {
            // 🚨 the cure does NOT lift or defeat pnpm's build gate. no compile runs here,
            // as none runs at 1.1.0 — what changed is that the addon no longer DEPENDS on
            // the blocked hook
            expect(scene.result.builtOnDisk).toBe(false);
          },
        );

        then(
          'the prebuilt addon is present with NO build hook run — no allowlist, no toolchain, no step asked of the human',
          () => {
            expect(scene.result.prebuiltOnDisk).toBe(
              PTY_DECLARED_EXPECTED.prebuiltOnDisk,
            );
          },
        );

        then('it LOADS through node-pty own lookup', () => {
          expect(scene.result.addonLoaded).toBe(
            PTY_DECLARED_EXPECTED.addonLoaded,
          );
          expect(scene.result.loadError === null).toBe(
            PTY_DECLARED_EXPECTED.loadErrorIsNull,
          );
        });

        then(
          'and a REAL pty spawns through it — presence is not proof of function',
          () => {
            const { spawnBytesContains } = PTY_DECLARED_EXPECTED;

            // a supported host must produce the bytes off a live pty
            if (spawnBytesContains !== null)
              expect(scene.result.spawnBytes).toContain(spawnBytesContains);

            // an unsupported host must produce NO bytes — the addon never loaded, so a
            // spawn of any kind here would mean the probe lied about the load
            if (spawnBytesContains === null)
              expect(scene.result.spawnBytes).toBeNull();
          },
        );

        then(
          'and the install REPORT is unchanged by the cure — byte for byte the same verdict as [case1]',
          () => {
            // the report belongs to the package manager. [case1] measured the identical
            // pair at the version that PREDATES this change, so a match here proves the
            // cure moved the capability and left pnpm's protocol alone.
            // ⚠️ scoped to the pnpm we pin — see [case8] for the next major
            expect({
              buildGateBlocked: scene.result.buildGateBlocked,
              installExitCode: scene.result.installExitCode,
            }).toEqual(PACKAGE_MANAGER_REPORT_EXPECTED.local.ours);
          },
        );
      });
    },
  );

  given(
    '[case3] the RED CONTROL, AT THE REAL DEPTH — node-pty@1.1.0 reached transitively',
    () => {
      // .why = ⚠️ without this case the transitive depth is only ever tested GREEN, and a
      //   clamp would guard a depth it has never seen a defect at. the defect's home IS
      //   this depth (rule.require.clamp-edge-cases)
      const scene = useBeforeAll(async () => ({
        result: genConsumerInstall({
          version: PTY_VERSION_BROKEN,
          depth: 'transitive',
          allowlist: 'absent',
        }),
      }));

      when('[t0] a consumer installs the PARENT at the broken version', () => {
        then('no build hook ran at this depth either', () => {
          expect(scene.result.builtOnDisk).toBe(false);
        });

        then(
          'the addon is present exactly on the platforms 1.1.0 shipped a prebuild for — the SAME verdict as the direct depth',
          () => {
            // data shared with [case1]: the defect is a property of the VERSION and the
            // platform, never of the depth.
            // .the mutation that reddens this: a depth-dependent defect
            expect(scene.result.prebuiltOnDisk).toBe(
              PTY_BROKEN_EXPECTED.prebuiltOnDisk,
            );
            expect(scene.result.addonLoaded).toBe(
              PTY_BROKEN_EXPECTED.addonLoaded,
            );
          },
        );

        then(
          'and the load error is the field report verbatim where absent, NULL where present',
          () => {
            const { loadErrorContains } = PTY_BROKEN_EXPECTED;

            if (loadErrorContains !== null)
              expect(scene.result.loadError).toContain(loadErrorContains);

            if (loadErrorContains === null)
              expect(scene.result.loadError).toBeNull();
          },
        );

        then('and the report is the same at this depth', () => {
          // pnpm could plausibly account a TRANSITIVE blocked hook differently from a
          // direct one, so it is read rather than assumed
          expect({
            buildGateBlocked: scene.result.buildGateBlocked,
            installExitCode: scene.result.installExitCode,
          }).toEqual(PACKAGE_MANAGER_REPORT_EXPECTED.local.ours);
        });
      });
    },
  );

  given(
    '[case4] the REAL CONSUMER SHAPE — node-pty reached TRANSITIVELY, as through rhachet',
    () => {
      // .why = [case2] declares node-pty directly, and NO consumer ever does that (see
      //   `ConsumerDepth`). this is acceptance #1 on the path a human walks
      //
      // .note = the parent is a STUB, never a packed rhachet. the DEPTH is under test and
      //   pnpm's gate is agnostic to which package sits in the middle; a packed rhachet
      //   would add 211mb of `bin/*.bc` per run to prove the same property
      const scene = useBeforeAll(async () => ({
        result: genConsumerInstall({
          version: getPtyVersionDeclared(),
          depth: 'transitive',
          allowlist: 'absent',
        }),
      }));

      when(
        '[t0] a consumer installs the PARENT, and never names node-pty at all',
        () => {
          then('no build hook ran at this depth either', () => {
            expect(scene.result.builtOnDisk).toBe(false);
          });

          then(
            'the prebuilt addon is present under the PARENT, with no build hook run',
            () => {
              expect(scene.result.prebuiltOnDisk).toBe(
                PTY_DECLARED_EXPECTED.prebuiltOnDisk,
              );
            },
          );

          then(
            'it LOADS from INSIDE the parent — the resolution path rhachet actually uses',
            () => {
              // pnpm isolates by default, so the load is attempted from the parent's own
              // dir — where `getPtyModuleOrNull` attempts it, inside rhachet's dist
              expect(scene.result.addonLoaded).toBe(
                PTY_DECLARED_EXPECTED.addonLoaded,
              );
              expect(scene.result.loadError === null).toBe(
                PTY_DECLARED_EXPECTED.loadErrorIsNull,
              );
            },
          );

          then('and a REAL pty spawns through it at this depth', () => {
            const { spawnBytesContains } = PTY_DECLARED_EXPECTED;

            if (spawnBytesContains !== null)
              expect(scene.result.spawnBytes).toContain(spawnBytesContains);

            if (spawnBytesContains === null)
              expect(scene.result.spawnBytes).toBeNull();
          });

          then(
            '🚨 and the report a REAL consumer sees — the shape the wish describes',
            () => {
              // THIS is the shape a human is in: they asked for the parent, never for
              // node-pty. at the pnpm we pin it is the happy path with no asterisk.
              // ⚠️ [case8] measures the same install one major up, where pnpm exits 1
              expect({
                buildGateBlocked: scene.result.buildGateBlocked,
                installExitCode: scene.result.installExitCode,
              }).toEqual(PACKAGE_MANAGER_REPORT_EXPECTED.local.ours);
            },
          );
        },
      );
    },
  );

  given(
    '[case5] OUR OWN ROOT SHAPE — an allowlist key that does NOT name node-pty',
    () => {
      // .why = our own ci depends on the answer. `.github/workflows/.install.yml` runs
      //   `pnpm install --frozen-lockfile` with no fallback against THIS repo's root
      //   manifest, which carries `pnpm.onlyBuiltDependencies: ['bun']` with node-pty
      //   deliberately removed.
      // .the mutation that reddens this: a pnpm release that makes an unlisted blocked
      //   build fatal — red HERE rather than in ci
      const scene = useBeforeAll(async () => ({
        result: genConsumerInstall({
          version: getPtyVersionDeclared(),
          depth: 'direct',
          allowlist: 'present-without-node-pty',
        }),
      }));

      when(
        '[t0] a project with an allowlist key that omits node-pty installs it',
        () => {
          then(
            'the capability is unaffected — the addon still loads and spawns',
            () => {
              // the allowlist decides pnpm's REPORT, never the prebuild's presence — that
              // independence is why the fix works
              expect(scene.result.prebuiltOnDisk).toBe(
                PTY_DECLARED_EXPECTED.prebuiltOnDisk,
              );
              expect(scene.result.addonLoaded).toBe(
                PTY_DECLARED_EXPECTED.addonLoaded,
              );

              const { spawnBytesContains } = PTY_DECLARED_EXPECTED;

              if (spawnBytesContains !== null)
                expect(scene.result.spawnBytes).toContain(spawnBytesContains);

              if (spawnBytesContains === null)
                expect(scene.result.spawnBytes).toBeNull();
            },
          );

          then(
            'and the install is QUIET — exit 0, no gate error, on a cold store',
            () => {
              // ⚠️ only about the pnpm we PIN: a COLD install of this manifest exits 0
              //   with no gate error there, and inverts against the ambient pnpm 11
              expect({
                buildGateBlocked: scene.result.buildGateBlocked,
                installExitCode: scene.result.installExitCode,
              }).toEqual(PACKAGE_MANAGER_REPORT_EXPECTED.local.ours);
            },
          );
        },
      );
    },
  );

  given(
    '[case6] the `pnpm` field IS read at the version we pin — and stops being read at the next major',
    () => {
      // 🚨 the boundary this whole pin exists for. pnpm 11 stopped to read the `pnpm`
      //   field in package.json and says so outright:
      //
      //     [WARN] The "pnpm" field in package.json is no longer read by pnpm.
      //            The following keys were ignored: "pnpm.onlyBuiltDependencies".
      //
      //   at the version we PIN (10.24.0) the field IS read and no such line appears, so
      //   our own `pnpm.onlyBuiltDependencies` is live config here — which is what built
      //   node-pty in this tree and made our repo the one place immune.
      //
      // .the mutation that reddens this: a pnpm bump that moves the boundary — red HERE,
      //   beside the reason, rather than a quiet rewrite of what every other row means
      const scene = useBeforeAll(async () => ({
        ours: genConsumerInstall({
          version: getPtyVersionDeclared(),
          depth: 'direct',
          allowlist: 'ignored-explicitly',
          packageManager: 'ours',
        }),
        nextMajor: genConsumerInstall({
          version: getPtyVersionDeclared(),
          depth: 'direct',
          allowlist: 'ignored-explicitly',
          packageManager: 'next-major',
        }),
      }));

      when(
        '[t0] a manifest carries pnpm settings under the `pnpm` field',
        () => {
          then('the version we pin READS the field — no ignore notice', () => {
            // load-bearing for our own tree and ci: a bump that stops the field from
            // being read reddens here, pointed at the sentence that changed
            expect(scene.ours.installOutput).not.toContain(
              'no longer read by pnpm',
            );
          });

          then(
            'the NEXT major ignores it, and names the key it dropped',
            () => {
              // the other half of the boundary, measured rather than read off a changelog
              expect(scene.nextMajor.installOutput).toContain(
                'no longer read by pnpm',
              );
              expect(scene.nextMajor.installOutput).toContain(
                'onlyBuiltDependencies',
              );
            },
          );

          then(
            'each major reports the blocked hook exactly as its own protocol does',
            () => {
              // the divergence, stated as data per major
              expect({
                buildGateBlocked: scene.ours.buildGateBlocked,
                installExitCode: scene.ours.installExitCode,
              }).toEqual(PACKAGE_MANAGER_REPORT_EXPECTED.local.ours);

              expect({
                buildGateBlocked: scene.nextMajor.buildGateBlocked,
                installExitCode: scene.nextMajor.installExitCode,
              }).toEqual(PACKAGE_MANAGER_REPORT_EXPECTED.local['next-major']);
            },
          );

          then(
            '🚨 and the CAPABILITY is identical across the boundary — the prebuild decides, never the report',
            () => {
              // THE row the whole change turns on: the two majors disagree about the
              // field, the gate, and the exit code — and agree about the socket
              for (const result of [scene.ours, scene.nextMajor]) {
                expect(result.builtOnDisk).toBe(false);
                expect(result.prebuiltOnDisk).toBe(
                  PTY_DECLARED_EXPECTED.prebuiltOnDisk,
                );
                expect(result.addonLoaded).toBe(
                  PTY_DECLARED_EXPECTED.addonLoaded,
                );

                const { spawnBytesContains } = PTY_DECLARED_EXPECTED;

                if (spawnBytesContains !== null)
                  expect(result.spawnBytes).toContain(spawnBytesContains);

                if (spawnBytesContains === null)
                  expect(result.spawnBytes).toBeNull();
              }
            },
          );
        },
      );
    },
  );

  given(
    '[case7] 🚨 THE LOCAL UPGRADE PATH — an install with `--ignore-scripts`',
    () => {
      // 🚨 the DEFAULT path, which every prior case skipped. `execNpmInstallLocal`
      //   hard-codes `--ignore-scripts` on every local upgrade, and per `getWhichTargets`
      //   the local target is the DEFAULT for `rhx upgrade`.
      //
      //   two independent questions ride on the answer:
      //   1. does pnpm still EXIT nonzero? if so, the local path reports a FAILURE on a
      //      SUCCESSFUL install
      //   2. does the ADDON still load? the flag opts out of build hooks
      const scene = useBeforeAll(async () => ({
        result: genConsumerInstall({
          version: getPtyVersionDeclared(),
          depth: 'transitive',
          allowlist: 'absent',
          ignoreScripts: true,
        }),
        // the NEXT major is the only version where the flag is load-bearing: our pinned
        // pnpm already exits 0 without it, so a single-version row would credit the flag
        // with an outcome it did not cause
        nextMajor: genConsumerInstall({
          version: getPtyVersionDeclared(),
          depth: 'transitive',
          allowlist: 'absent',
          ignoreScripts: true,
          packageManager: 'next-major',
        }),
      }));

      when('[t0] the install runs the way a local upgrade runs it', () => {
        then(
          'the CAPABILITY survives the flag — the prebuild needs no hook',
          () => {
            // the property the cure rests on. `--ignore-scripts` blocks node-pty's
            // install hook, and that hook is a no-op anyway: it only CHECKS for a
            // prebuild and exits 0 when one is present
            expect(scene.result.prebuiltOnDisk).toBe(
              PTY_DECLARED_EXPECTED.prebuiltOnDisk,
            );
            expect(scene.result.addonLoaded).toBe(
              PTY_DECLARED_EXPECTED.addonLoaded,
            );

            const { spawnBytesContains } = PTY_DECLARED_EXPECTED;

            if (spawnBytesContains !== null)
              expect(scene.result.spawnBytes).toContain(spawnBytesContains);

            if (spawnBytesContains === null)
              expect(scene.result.spawnBytes).toBeNull();
          },
        );

        then('the capability survives the flag at the NEXT major too', () => {
          // the flag opts out of build hooks at every version, so a broken load would
          // break both. measured on both rather than assumed from one
          expect(scene.nextMajor.builtOnDisk).toBe(false);
          expect(scene.nextMajor.addonLoaded).toBe(
            PTY_DECLARED_EXPECTED.addonLoaded,
          );
        });

        then(
          '🚨 and the flag makes the local path exit CLEAN at BOTH majors',
          () => {
            // .why = `--ignore-scripts` is an OPT-OUT of build hooks, so pnpm has no
            //   BLOCKED hook to report. that matters most at the next major, where the
            //   same install WITHOUT the flag exits 1 (see [case6]) — under the flag the
            //   local upgrade path exits clean there too, so `execNpmInstallLocal` cannot
            //   throw on a successful install.
            // .the mutation that reddens this: a pnpm that exits nonzero under the flag
            //   anyway — red HERE rather than in a human's terminal
            for (const result of [scene.result, scene.nextMajor]) {
              expect(result.installOutput).not.toContain(
                'ERR_PNPM_IGNORED_BUILDS',
              );
              expect(result.buildGateBlocked).toBe(false);

              // 🚨 a DIRECT assertion on the field, never a joined-string
              //   `toContain('exit=0')` (`rule.forbid.inline-decode-friction`). an OBJECT
              //   so jest prints the version and the pnpm output alongside
              expect({
                installExitCode: result.installExitCode,
                packageManagerVersion: result.packageManagerVersion,
                installOutput: result.installOutput,
              }).toMatchObject({ installExitCode: 0 });
            }
          },
        );
      });
    },
  );

  given(
    '[case8] 🚨 A CONSUMER ON A PNPM WE DO NOT PIN — red then green, at the next major',
    () => {
      // 🚨 makes acceptance #1 a claim about the CURE rather than about our package
      //   manager. every case above installs under the pnpm we pin; a consumer runs their
      //   own. so the full red-then-green proof runs one major up, at the real depth.
      //
      // .note = both halves run under the SAME package manager, so the only variable
      //   between them is the node-pty version — that is what makes the pair a proof
      const scene = useBeforeAll(async () => ({
        broken: genConsumerInstall({
          version: PTY_VERSION_BROKEN,
          depth: 'transitive',
          allowlist: 'absent',
          packageManager: 'next-major',
        }),
        declared: genConsumerInstall({
          version: getPtyVersionDeclared(),
          depth: 'transitive',
          allowlist: 'absent',
          packageManager: 'next-major',
        }),
      }));

      when('[t0] the broken version installs under the next major', () => {
        then('no build hook ran, and the addon is absent where it was', () => {
          expect(scene.broken.builtOnDisk).toBe(false);
          expect(scene.broken.prebuiltOnDisk).toBe(
            PTY_BROKEN_EXPECTED.prebuiltOnDisk,
          );
          expect(scene.broken.addonLoaded).toBe(
            PTY_BROKEN_EXPECTED.addonLoaded,
          );
        });

        then('the defect reproduces VERBATIM here too', () => {
          const { loadErrorContains } = PTY_BROKEN_EXPECTED;

          if (loadErrorContains !== null)
            expect(scene.broken.loadError).toContain(loadErrorContains);

          if (loadErrorContains === null)
            expect(scene.broken.loadError).toBeNull();
        });
      });

      when('[t1] the version we declare installs under the next major', () => {
        then('no build hook ran here either — the gate is untouched', () => {
          expect(scene.declared.builtOnDisk).toBe(false);
        });

        then('yet the addon LOADS and a REAL pty spawns', () => {
          expect(scene.declared.prebuiltOnDisk).toBe(
            PTY_DECLARED_EXPECTED.prebuiltOnDisk,
          );
          expect(scene.declared.addonLoaded).toBe(
            PTY_DECLARED_EXPECTED.addonLoaded,
          );

          const { spawnBytesContains } = PTY_DECLARED_EXPECTED;

          if (spawnBytesContains !== null)
            expect(scene.declared.spawnBytes).toContain(spawnBytesContains);

          if (spawnBytesContains === null)
            expect(scene.declared.spawnBytes).toBeNull();
        });

        then(
          "🚨 and here the install DOES read as failed — the honest asterisk on the wish's happy path",
          () => {
            // at this major pnpm raises ERR_PNPM_IGNORED_BUILDS and exits 1 over a hook it
            // blocked and never needed to run. ours neither causes nor cures it — the
            // broken version exits the same way, so it predates this change
            expect({
              buildGateBlocked: scene.declared.buildGateBlocked,
              installExitCode: scene.declared.installExitCode,
            }).toEqual(PACKAGE_MANAGER_REPORT_EXPECTED.local['next-major']);

            expect({
              buildGateBlocked: scene.broken.buildGateBlocked,
              installExitCode: scene.broken.installExitCode,
            }).toEqual(PACKAGE_MANAGER_REPORT_EXPECTED.local['next-major']);
          },
        );
      });
    },
  );

  given(
    "[case9] 🚨 THE WISH'S LITERAL ENTRYPOINT — `pnpm add -g`, red then green",
    () => {
      // 🚨 the command the wish names by name. cases 1–8 all measure `pnpm install` — a
      //   DIFFERENT command, into a different tree, under a manifest we wrote ourselves.
      //
      //   three facts differ from the local path:
      //   1. NO consumer manifest — pnpm generates it, so a human cannot write a build
      //      allowlist even if they knew to (asserted below, read off disk)
      //   2. the layout differs by major, so the load base is discovered rather than fixed
      //   3. the REPORT differs, and at the next major it differs sharply
      //
      //   the depth is `transitive` — the wish's actual shape. the parent installs as a
      //   packed TARBALL, never a directory; see `genGlobalSpecifier` for why.
      //
      // 🚨 the `packageManager` request is ADVISORY on this path, never a pin — pnpm
      //   prints `Using --global skips the package manager check` and runs whichever
      //   pnpm the host has. so a `next-major` cell measures the next major only on a
      //   host that HAS it; elsewhere it re-measures the ambient one.
      //
      //   ⚠️ that costs the case no claim, and the reason is in the table rather than in
      //   this comment: `PACKAGE_MANAGER_REPORT_EXPECTED.global` is IDENTICAL at both
      //   majors, and no CAPABILITY row reads that table at all. the cells that follow
      //   assert the addon and the pty, which the tarball decides and the package
      //   manager cannot touch
      //
      // .the mutation that reddens this: revert `optionalDependencies.node-pty` to 1.1.0
      const scene = useBeforeAll(async () => ({
        brokenOurs: genConsumerInstall({
          version: PTY_VERSION_BROKEN,
          depth: 'transitive',
          allowlist: 'absent',
          target: 'global',
        }),
        declaredOurs: genConsumerInstall({
          version: getPtyVersionDeclared(),
          depth: 'transitive',
          allowlist: 'absent',
          target: 'global',
        }),
        declaredNextMajor: genConsumerInstall({
          version: getPtyVersionDeclared(),
          depth: 'transitive',
          allowlist: 'absent',
          target: 'global',
          packageManager: 'next-major',
        }),
        // 🚨 the RED CONTROL at the next major. it reaches a fact no other cell can — at
        //   the next major a global install of the BROKEN version exits 0 with no gate
        //   line AND leaves an addon that will not load: the failure at its most silent
        brokenNextMajor: genConsumerInstall({
          version: PTY_VERSION_BROKEN,
          depth: 'transitive',
          allowlist: 'absent',
          target: 'global',
          packageManager: 'next-major',
        }),
      }));

      when('[t0] the BROKEN version is installed globally', () => {
        then('no build hook ran — the gate is live on this path too', () => {
          // without this, a green row below could mean "the gate never fired here", and
          // the case would measure an untriggered condition
          for (const result of [scene.brokenOurs, scene.brokenNextMajor])
            expect(result.builtOnDisk).toBe(false);
        });

        then("and the defect reproduces — on the wish's own command", () => {
          for (const result of [scene.brokenOurs, scene.brokenNextMajor]) {
            expect(result.prebuiltOnDisk).toBe(
              PTY_BROKEN_EXPECTED.prebuiltOnDisk,
            );
            expect(result.addonLoaded).toBe(PTY_BROKEN_EXPECTED.addonLoaded);

            const { loadErrorContains } = PTY_BROKEN_EXPECTED;

            if (loadErrorContains !== null)
              expect(result.loadError).toContain(loadErrorContains);

            if (loadErrorContains === null) expect(result.loadError).toBeNull();
          }
        });
      });

      when('[t1] the version WE declare is installed globally', () => {
        then('no build hook ran here either', () => {
          expect(scene.declaredOurs.builtOnDisk).toBe(false);
          expect(scene.declaredNextMajor.builtOnDisk).toBe(false);
        });

        then('🚨 yet the addon LOADS and a REAL pty spawns', () => {
          // acceptance #1, on the command the wish names — so it is a
          // claim about the cure rather than about our package manager
          for (const result of [scene.declaredOurs, scene.declaredNextMajor]) {
            expect(result.prebuiltOnDisk).toBe(
              PTY_DECLARED_EXPECTED.prebuiltOnDisk,
            );
            expect(result.addonLoaded).toBe(PTY_DECLARED_EXPECTED.addonLoaded);

            const { spawnBytesContains } = PTY_DECLARED_EXPECTED;

            if (spawnBytesContains !== null)
              expect(result.spawnBytes).toContain(spawnBytesContains);

            if (spawnBytesContains === null)
              expect(result.spawnBytes).toBeNull();
          }
        });
      });

      when('[t2] the package manager reports on what it did', () => {
        then('🚨 a global install exits CLEAN — unlike the local one', () => {
          // .why = acceptance #2 on the wish's own command. `execNpmInstallGlobal`
          //   classifies a NONZERO exit; here there is none at either major, so a
          //   blocked hook cannot read as a failed global install. against [case8]:
          //   the SAME package, gated the SAME way, exits 1 under `pnpm install`
          for (const result of [scene.declaredOurs, scene.brokenOurs])
            expect({
              buildGateBlocked: result.buildGateBlocked,
              installExitCode: result.installExitCode,
            }).toEqual(PACKAGE_MANAGER_REPORT_EXPECTED.global.ours);

          // 🚨 the next major, at BOTH versions — the broken one is the worst row: it
          //   exits 0 with no gate line while the addon does not load. measured rather
          //   than assumed from the declared row
          for (const result of [scene.declaredNextMajor, scene.brokenNextMajor])
            expect({
              buildGateBlocked: result.buildGateBlocked,
              installExitCode: result.installExitCode,
            }).toEqual(PACKAGE_MANAGER_REPORT_EXPECTED.global['next-major']);
        });

        then(
          '🚨 and a build allowlist is INEXPRESSIBLE here — pnpm writes the manifest',
          () => {
            // .why = the structural fact behind acceptance #2, read off disk rather than
            //   argued from pnpm's docs. `onlyBuiltDependencies` applies in the ROOT
            //   manifest, and on a global install pnpm AUTHORS that manifest — so there
            //   is no file a human could add the key to. the `allowlist` axis is absent
            //   from this case by necessity, and this row records that
            for (const result of [
              scene.declaredOurs,
              scene.brokenOurs,
              scene.declaredNextMajor,
              scene.brokenNextMajor,
            ]) {
              // ⚠️ presence BEFORE content: a null manifest satisfies any `not.toContain`,
              // so the negative check alone would read a LOST read as a clean one
              expect(typeof result.manifestGlobal).toEqual('string');
              expect(result.manifestGlobal).toContain(PARENT_NAME);
              expect(result.manifestGlobal).not.toContain(
                'onlyBuiltDependencies',
              );
            }
          },
        );
      });
    },
  );

  // 🚨 [case10] is the BIDIRECTIONAL SYNC row for the pnpm-major boundary, and it needs no
  //   install at all — it holds this file's measured table against production's constant.
  //
  //   before it, the two owners of that boundary were linked by a PROSE cross-reference in
  //   `asNpmInstallFailureKind`, and prose cannot redden. so a bump of either side drifted
  //   unread, and the cost of the drift is a wrong verdict on a real install: a gated-but-
  //   healthy one reported as a failure, or a real failure absolved as a gate notice.
  //
  // ⚠️ the mutation that reddens this: change `PNPM_MAJOR_NONZERO_ON_BUILD_GATE` to 10, or
  //   flip either `installExitCode` in the `local` row of PACKAGE_MANAGER_REPORT_EXPECTED.
  given('[case10] the pnpm-major boundary, held by two files', () => {
    when('[t0] the measured table is read beside production’s constant', () => {
      then(
        'a nonzero local exit is expected EXACTLY at and past the boundary',
        () => {
          for (const packageManager of [
            'ours',
            'next-major',
          ] as ConsumerPackageManager[]) {
            const major = asMajorFromPackageManagerSpec({
              spec: asPackageManagerSpec({ packageManager }),
            });

            // the guard against a silent NaN — a malformed spec would make every
            // comparison below false and the row would pass with no subject
            expect(Number.isInteger(major)).toEqual(true);

            expect({
              packageManager,
              exitsNonzero:
                PACKAGE_MANAGER_REPORT_EXPECTED.local[packageManager]
                  .installExitCode !== 0,
            }).toEqual({
              packageManager,
              exitsNonzero: major >= PNPM_MAJOR_NONZERO_ON_BUILD_GATE,
            });
          }
        },
      );
    });
  });

  // 🚨 [case11] is the row that makes this whole FILE honest about what it stands in for.
  //
  //   every install above uses `pty-clamp-parent` — a stub that declares node-pty and
  //   naught else — where the wish's literal subject is a packed `rhachet`. the stub is
  //   faithful on exactly ONE condition: that no OTHER package in our tree also declares
  //   node-pty. with a second declarant, a real rhachet parent would settle node-pty
  //   through a version negotiation the one-dep stub can never reproduce, and every green
  //   row above would be measuring a tree that does not exist.
  //
  //   that condition held when the stub was written, and it is not a property anyone
  //   maintains — a single future dependency that carries node-pty would void it silently,
  //   because no install here would change and no row above would redden.
  //
  // ⚠️ this is the CHEAP half of the substitution, and it is the half that DRIFTS. the
  //   expensive half — that a packed rhachet installs as this stub does — is open, tracked
  //   in `.dream/2026_09_03.pack-rhachet-consumer-clamp.md`, and deferred on the ~211mb of
  //   compiled `bin/*.bc` a pack would carry. what is closed here is the leg that can
  //   change under us without a word.
  //
  // .note = the lockfile is the subject rather than `package.json`, on purpose. a manifest
  //   names OUR declaration alone; the lock names every declarant in the settled tree,
  //   which is the actual question.
  //
  // ⚠️ the mutation that reddens this: add a `node-pty:` specifier line under any second
  //   importer in `pnpm-lock.yaml`.
  given(
    '[case11] the stub parent stands in for rhachet on one condition',
    () => {
      when('[t0] the settled tree is read for every node-pty declarant', () => {
        then(
          'exactly one package declares it — so the stub is faithful',
          () => {
            const lockPath = join(__dirname, '../../../../pnpm-lock.yaml');
            const declarantCount = countNodePtyDeclarantsInLockfile({
              lockfile: readFileSync(lockPath, 'utf8'),
            });

            // 🚨 an OBJECT, so a red row names the path it read rather than a bare `2 !== 1`
            //   that sends its reader hunting for the subject
            expect({ declarantCount, lockPath }).toEqual({
              declarantCount: 1,
              lockPath,
            });
          },
        );
      });
    },
  );
});
