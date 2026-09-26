import { spawnSync } from 'node:child_process';
import { accessSync, constants, realpathSync } from 'node:fs';
import { delimiter, join, sep } from 'node:path';
import { asBrainCliVersion, type BrainCliVersion } from './asBrainCliVersion';

/**
 * .what = one brain-cli executable found on PATH, with the version it reports
 * .why = the measured failure is not "no cli" — it is TWO installs and the wrong one
 *   wins PATH, so a refusal must name which file it found and what else is there
 */
export interface BrainCliPathResolution {
  path: string;
  version: BrainCliVersion | null;
}

/**
 * .what = how many resolutions are probed before the scan stops
 * .why = each probe is a spawn, and a pathological PATH should not turn one refusal
 *   into an unbounded sweep. the winner and a handful behind it are what a human acts on
 */
export const BRAIN_CLI_PATH_RESOLUTION_CAP = 8;

/**
 * .what = how long each `--version` probe may run
 */
export const BRAIN_CLI_PATH_RESOLUTION_PROBE_TIMEOUT_MS = 10_000;

/**
 * .what = whether a path names a file this process may execute
 */
const isExecutableFile = (path: string): boolean => {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

/**
 * .what = the real path behind a file, or the path itself where it cannot be read
 * .why = two PATH dirs can symlink to one file; a refusal should name it once
 */
const getOneRealPathOrSelf = (path: string): string => {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
};

/**
 * .what = every executable named `bin` on PATH, in the order PATH resolves them
 * .why = `which -a`, in-process and against a caller-supplied env
 *
 * .note = the FIRST entry is the one a bare spawn gets — the one that "wins PATH"
 * .note = a bin that already holds a separator names one file, never a PATH lookup
 */
const getAllBrainCliPathFiles = (input: {
  bin: string;
  env: NodeJS.ProcessEnv;
}): string[] => {
  // a bin with a separator is a path, not a name to look up
  if (input.bin.includes(sep) || input.bin.includes('/'))
    return isExecutableFile(input.bin) ? [input.bin] : [];

  // walk PATH in order; each real file is named once, by the first path to reach it
  const seenRealPaths = new Set<string>();
  const found: string[] = [];
  for (const dir of (input.env.PATH ?? '').split(delimiter)) {
    if (!dir) continue;

    const path = join(dir, input.bin);
    if (!isExecutableFile(path)) continue;

    const realPath = getOneRealPathOrSelf(path);
    if (seenRealPaths.has(realPath)) continue;
    seenRealPaths.add(realPath);

    found.push(path);
    if (found.length >= BRAIN_CLI_PATH_RESOLUTION_CAP) break;
  }
  return found;
};

/**
 * .what = every brain-cli on PATH, each probed for the version it reports
 * .why = a below-floor refusal names the binary it found AND any newer one behind it,
 *   so a human upgrades the install that is actually in the way rather than the one
 *   that was already fine
 *
 * .note = called only on a refusal path, so the per-candidate spawn is paid once, by a
 *   caller that has already refused
 * .note = a candidate whose probe faults or prints no clean triple carries a null
 *   version — it is still reported, since its PRESENCE is half the signal
 */
export const getAllBrainCliPathResolutions = (input: {
  bin: string;
  env: NodeJS.ProcessEnv;
}): BrainCliPathResolution[] =>
  getAllBrainCliPathFiles(input).map((path) => {
    const probe = spawnSync(path, ['--version'], {
      env: input.env,
      stdio: 'pipe',
      timeout: BRAIN_CLI_PATH_RESOLUTION_PROBE_TIMEOUT_MS,
    });
    if (probe.error || probe.status !== 0) return { path, version: null };
    return {
      path,
      version: asBrainCliVersion({ output: probe.stdout.toString().trim() }),
    };
  });
