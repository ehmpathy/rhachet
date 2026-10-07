import { ConstraintError } from 'helpful-errors';

import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BootSource } from './BootSource';
import { genBootSource } from './genBootSource';

/**
 * .what = the boot source for a role default — a spec at a COMPUTED coordinate under `.agent/`
 * .why = this is the boot a caller reaches by `--repo` / `--role`, and the one arm whose
 *        absence has two legitimate readings (requirement 5).
 *
 * 🔴 .note = it is the ONLY arm that may return null, and only under `--if-present`. that
 *   flag exists for a caller who names a SET of roles, some of which may not be linked in
 *   this repo — it means "boot whichever of these are here". a manifest names ONE path the
 *   caller chose deliberately, so the same tolerance there would convert a typo into an empty
 *   boot; `getOneBootSourceFromManifest` therefore takes no such flag at all.
 *
 * .note = an absent `boot.yml` at a present role dir is NOT a concern of this arm. that spec is
 *   at a computed coordinate, so its absence means say-all — which is why `specIsDeclared`
 *   is false here and true on the manifest arm.
 *
 * .note = the existence probe is `statSync`, narrowed to ENOENT; any other fault rethrows
 *   unclassified (`rule.forbid.failhide`).
 */
export const getOneBootSourceFromRole = (input: {
  slugRepo: string;
  slugRole: string;
  ifPresent: boolean;
  cwd: string;
}): BootSource | null => {
  const { slugRepo, slugRole, cwd } = input;
  const coordinates = `--repo ${slugRepo} --role ${slugRole}`;
  const rootDir = resolve(
    cwd,
    '.agent',
    `repo=${slugRepo}`,
    `role=${slugRole}`,
  );

  // a genuine absence is a legitimate state under --if-present — a caller boots a SET of
  // roles. any other fault (EACCES, EPERM, ...) is not absence, so it rethrows unclassified
  const rootDirExists = ((): boolean => {
    try {
      statSync(rootDir);
      return true;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  })();

  if (!rootDirExists) {
    if (input.ifPresent) return null;

    // a `ConstraintError`: an absent role dir is for the caller to fix (`roles link`), which
    // is exit 2 by definition (`rule.require.exit-code-semantics`).
    const hint =
      slugRepo === '.this'
        ? `Create .agent/repo=.this/role=${slugRole}/briefs and skills directories`
        : `Run "rhachet roles link --repo ${slugRepo} --role ${slugRole}" first`;
    throw new ConstraintError(`role directory not found: ${rootDir}`, {
      rootDir,
      slugRepo,
      slugRole,
      hint,
    });
  }

  return genBootSource({
    rootDir,
    pathToSpec: resolve(rootDir, 'boot.yml'),
    dirBriefs: resolve(rootDir, 'briefs'),
    label: {
      base: rootDir,
      prefix: `.agent/repo=${slugRepo}/role=${slugRole}/`,
    },
    invocation: `roles boot ${coordinates}`,
    coordinates,
    specIsDeclared: false, // a computed coordinate — an absent boot.yml means say-all
  });
};
