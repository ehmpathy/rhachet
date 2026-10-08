import { ConstraintError, MalfunctionError } from 'helpful-errors';
import type { PickOne } from 'type-fns';

import type { BootSource } from './BootSource';
import { getOneBootSourceFromManifest } from './getOneBootSourceFromManifest';
import { getOneBootSourceFromRegistryRole } from './getOneBootSourceFromRegistryRole';
import { getOneBootSourceFromRole } from './getOneBootSourceFromRole';

/**
 * .what = picks which SOURCE arm a boot request names, and calls it
 * .why = the sources hold schema parity, which is achievable only where they differ in DATA
 *        rather than in code path. each arm returns the same `BootSource`, so every line
 *        downstream of here has no source branch at all.
 *
 * 🔴 .note = it is an ORCHESTRATOR — every arm guard, every arm refusal, and every field
 *   lives in the arm that owns it (`rule.prefer.decomposable-architecture`), and each arm's
 *   guarantee is clamped by that arm's own test. the one guard here is on the REQUEST
 *   itself, which no single arm can see: `ifPresent` paired with an arm that cannot honor it.
 *
 * .note = returns null for exactly one case: an absent role directory under `--if-present`,
 *   which `getOneBootSourceFromRole` owns. an absent MANIFEST always throws — an
 *   explicit path that points at no file is a caller defect (requirement 5), and
 *   `--if-present` is refused alongside `--what` at the cli for that reason. the guard below
 *   holds that refusal at the domain boundary too, so a caller other than the cli gets a loud
 *   refusal rather than a flag that is quietly dropped.
 */
export const getOneBootSource = (input: {
  from: PickOne<{
    role: { slugRepo: string; slugRole: string };
    manifest: { path: string };
    registryRole: {
      slugRepo: string;
      slugRole: string;
      dirRole: string;
      dirRepo: string;
    };
  }>;
  ifPresent: boolean;
  cwd: string;
}): BootSource | null => {
  const { from, cwd } = input;

  // refuse `ifPresent` on an arm that cannot honor it — only the role arm reads it
  if (input.ifPresent && !from.role)
    throw new ConstraintError(
      'ifPresent applies only to a role boot source; a manifest or registry role is never optional',
      { from },
    );

  if (from.registryRole)
    return getOneBootSourceFromRegistryRole(from.registryRole);

  if (from.role)
    return getOneBootSourceFromRole({
      ...from.role,
      ifPresent: input.ifPresent,
      cwd,
    });

  if (from.manifest)
    return getOneBootSourceFromManifest({ path: from.manifest.path, cwd });

  // 🛑 unreachable — PickOne admits no fourth arm. a server defect, so the malfunction leaf
  // (never its parent — `rule.forbid.helpful-error-parents`)
  throw new MalfunctionError('unsupported boot source', { from });
};
