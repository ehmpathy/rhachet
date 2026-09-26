import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { spawnSync } from 'node:child_process';
import { asBrainCliVersion, type BrainCliVersion } from './asBrainCliVersion';
import {
  type BrainCliPathResolution,
  getAllBrainCliPathResolutions,
} from './getAllBrainCliPathResolutions';
import { isBrainCliVersionAtOrAboveFloor } from './isBrainCliVersionAtOrAboveFloor';

/**
 * .what = the lowest brain-cli version an enroll spawns
 * .why = below it, the cli lacks the claudeMdExcludes option the brain dir boot rests
 *   on, so a clone would load the wrong corpus in silence
 */
export const BRAIN_CLI_VERSION_FLOOR: BrainCliVersion = {
  major: 2,
  minor: 1,
  patch: 277,
};

/**
 * .what = how long the `--version` probe may run before it counts as a malfunction
 */
export const BRAIN_CLI_VERSION_PROBE_TIMEOUT_MS = 10_000;

const asVersionWords = (version: BrainCliVersion): string =>
  `${version.major}.${version.minor}.${version.patch}`;

/**
 * .what = what a caller wants done where the brain-cli is absent from PATH
 * .why = the two callers differ on exactly this one question, and on no other:
 *   - an ENROLL is about to SPAWN that binary, so an absent one is fatal → `refuse`
 *   - a BOOT SWEEP writes a corpus a LATER reader reads. with no binary on this host
 *     there is no reader, so the floor binds nobody and a refusal would block an
 *     otherwise-correct write (a ci box that never installs the cli, above all) →
 *     `permit`
 *
 * .note = named rather than defaulted, so each call site states its own answer
 *   (`rule.forbid.unexpected-defaults`)
 */
export type BrainCliAbsencePolicy = 'refuse' | 'permit';

/**
 * .what = the refusal a below-floor brain-cli earns, with the PATH detail that makes it
 *   actionable
 * .why = the measured failure is two installs and the wrong one wins PATH. an error that
 *   says only "upgrade claude" sends a human to upgrade the install that was already
 *   fine, so the refusal names the file it FOUND and any newer one it shadows
 *
 * .note = the scan runs only here, on a path that has already decided to throw
 */
const genBrainCliBelowFloorRefusal = (input: {
  bin: string;
  env: NodeJS.ProcessEnv;
  version: BrainCliVersion;
}) => {
  const resolutions = getAllBrainCliPathResolutions({
    bin: input.bin,
    env: input.env,
  });

  // the first resolution is the one a bare spawn gets — the version above came from it
  const winner = resolutions[0] ?? null;
  const shadowed = resolutions.slice(1);

  // the first one behind it that WOULD have cleared the floor, if any
  const better =
    shadowed.find(
      (
        candidate,
      ): candidate is BrainCliPathResolution & { version: BrainCliVersion } =>
        candidate.version !== null &&
        isBrainCliVersionAtOrAboveFloor({
          version: candidate.version,
          floor: BRAIN_CLI_VERSION_FLOOR,
        }),
    ) ?? null;

  const atWords = winner ? ` at ${winner.path}` : '';
  return new ConstraintError(
    `brain-cli '${input.bin}' is ${asVersionWords(input.version)}${atWords}, below the floor ${asVersionWords(BRAIN_CLI_VERSION_FLOOR)}`,
    {
      bin: input.bin,
      version: asVersionWords(input.version),
      floor: asVersionWords(BRAIN_CLI_VERSION_FLOOR),
      resolvedPath: winner?.path ?? null,
      shadowed: shadowed.map((candidate) => ({
        path: candidate.path,
        version: candidate.version ? asVersionWords(candidate.version) : null,
      })),
      hint: better
        ? `a newer ${asVersionWords(better.version)} sits at ${better.path}, but ${winner?.path ?? input.bin} wins your PATH — put that dir first, or upgrade the one that wins: pnpm add -g @anthropic-ai/claude-code@latest`
        : 'upgrade it: pnpm add -g @anthropic-ai/claude-code@latest (or, without pnpm: claude update)',
    },
  );
};

/**
 * .what = refuse a caller whose brain-cli sits below the version floor
 * .why = a guard that fails soft lets the spawn through, so every probe outcome
 *   other than a parsed version at or above the floor throws
 *
 * .note = `onAbsent` decides the ONE outcome the two callers read differently; every
 *   other outcome — a faulted probe, an unparseable output, a version below the floor —
 *   throws for both
 */
export const assertBrainCliVersionFloor = (input: {
  bin: string;
  env: NodeJS.ProcessEnv;
  onAbsent: BrainCliAbsencePolicy;
}): { version: BrainCliVersion | null } => {
  // probe the binary the spawn resolves on PATH
  const probe = spawnSync(input.bin, ['--version'], {
    env: input.env,
    stdio: 'pipe',
    timeout: BRAIN_CLI_VERSION_PROBE_TIMEOUT_MS,
  });

  // a binary absent from PATH — fatal to a caller that would spawn it, moot to one that
  // only writes a corpus for it
  const probeErrorCode = (probe.error as NodeJS.ErrnoException | undefined)
    ?.code;
  if (probeErrorCode === 'ENOENT') {
    if (input.onAbsent === 'permit') return { version: null };
    throw new ConstraintError(`brain-cli '${input.bin}' not found on PATH`, {
      bin: input.bin,
      hint: 'install it: pnpm add -g @anthropic-ai/claude-code --allow-build=@anthropic-ai/claude-code (or, without pnpm: npm install -g @anthropic-ai/claude-code)',
    });
  }

  // a probe that fails or hangs is a malfunction, never a pass
  if (probe.error || probe.status !== 0)
    throw new MalfunctionError(`brain-cli '${input.bin} --version' failed`, {
      bin: input.bin,
      status: probe.status,
      signal: probe.signal,
      error: probe.error?.message ?? null,
      stderr: probe.stderr?.toString().trim() ?? '',
    });

  // an output with no clean x.y.z is never coerced to a version
  const output = probe.stdout.toString().trim();
  const version = asBrainCliVersion({ output });
  if (!version)
    throw new MalfunctionError(
      `brain-cli '${input.bin} --version' output has no version`,
      {
        bin: input.bin,
        output,
      },
    );

  // below the floor is the caller's to upgrade
  if (
    !isBrainCliVersionAtOrAboveFloor({
      version,
      floor: BRAIN_CLI_VERSION_FLOOR,
    })
  )
    throw genBrainCliBelowFloorRefusal({
      bin: input.bin,
      env: input.env,
      version,
    });

  return { version };
};
