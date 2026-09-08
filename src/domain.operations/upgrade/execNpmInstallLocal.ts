import type { ContextCli } from '@src/domain.objects/ContextCli';

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { assertNpmInstallSucceeded } from './assertNpmInstallSucceeded';
import {
  execNpmInstall,
  type NpmInstallLifecycleHooks,
} from './execNpmInstall';
import type { spawnNpmInstall } from './spawnNpmInstall';

/**
 * .what = detects package manager based on lock files
 * .why = use pnpm if pnpm-lock.yaml present, npm if package-lock.json present
 *
 * .note = prefers pnpm-lock.yaml over package-lock.json if both exist
 *
 * ⚠️ a LOCKFILE read, deliberately — where the global target runs `getPnpmPresence`, a
 *   live tri-state probe with a bound and a retry. the asymmetry is a real position, not
 *   an oversight: a `pnpm-lock.yaml` in the project is direct evidence pnpm produced this
 *   tree, so the answer is already on disk and a probe would re-derive it. the global
 *   target has no such artifact to read — it asks about a store no project owns, so only
 *   a live PATH read can answer at all.
 *
 * 🚨 the cost, stated: a lockfile present with pnpm absent or wedged on PATH gets no
 *   `unreadable` notice. it falls to `asNpmInstallFailureKind`'s `unclassified` row, which
 *   is honest but coarser than what the global target surfaces.
 */
export const detectPackageManager = (input: {
  cwd: string;
}): 'pnpm' | 'npm' => {
  const hasPnpmLock = existsSync(join(input.cwd, 'pnpm-lock.yaml'));
  const hasNpmLock = existsSync(join(input.cwd, 'package-lock.json'));

  // prefer pnpm if its lock file exists
  if (hasPnpmLock) return 'pnpm';

  // fallback to npm if its lock file exists
  if (hasNpmLock) return 'npm';

  // default to pnpm if no lock file found
  return 'pnpm';
};

/**
 * .what = executes local package install for packages at latest version
 * .why = enables upgrade of rhachet and role packages in project
 *
 * .note = appends @latest to each package name
 * .note = detects pnpm vs npm via lock file presence
 *
 * .note = the run, the replay, and the classification all belong to `execNpmInstall`; the
 *   three-row read of the outcome, and the throw it may raise, belong to
 *   `assertNpmInstallSucceeded`. the global target shares both. this operation owns only
 *   what is local-specific: which package manager the project's own lock file implies
 */
export const execNpmInstallLocal = (
  input: {
    packages: string[];
    /**
     * .what = whether to run the lifecycle hooks the installed packages declare
     * .why  = passed THROUGH, never chosen here. this operation knows which package
     *   manager the lock file implies; it does not know what is in `packages`, so it is
     *   the wrong owner for a per-dependency-class trade
     *   (see `NpmInstallLifecycleHooks`)
     */
    lifecycleHooks: NpmInstallLifecycleHooks;
  },
  context: ContextCli,
  options?: {
    /**
     * .what = the lockfile read this operation composes
     * .why = a REAL `existsSync` is a filesystem boundary, so a unit row that drives it must
     *   either cross that boundary or `jest.mock('node:fs')` — and the second is the mock
     *   antipattern (`rule.forbid.unit.remote-boundaries`). the seam lets the composition be
     *   proven with a typed fake, while the real read is exercised at the integration tier.
     */
    detect?: typeof detectPackageManager;

    /**
     * .what = the install communicator, handed through to `execNpmInstall`
     * .why = same reason, one layer down — see `execNpmInstall`'s own `spawn` option
     */
    spawn?: typeof spawnNpmInstall;
  },
): void => {
  // handle empty input
  if (input.packages.length === 0) return;

  // detect package manager
  const detect = options?.detect ?? detectPackageManager;
  const pm = detect({ cwd: context.cwd });

  // build package list with @latest
  const packagesLatest = input.packages.map((p) => `${p}@latest`);

  const outcome = execNpmInstall(
    {
      packageManager: pm,
      target: 'local',
      packagesLatest,
      lifecycleHooks: input.lifecycleHooks,
      cwd: context.cwd,
    },
    { spawn: options?.spawn },
  );

  // throws on a cause it cannot absolve; returns on a clean exit or an absolved build gate
  assertNpmInstallSucceeded({
    outcome,
    target: 'local',
    packageManager: pm,
    packages: input.packages,
  });
};
