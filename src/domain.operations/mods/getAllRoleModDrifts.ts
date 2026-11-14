import type { RoleModPlan } from '@src/domain.objects/RoleModPlan';

import type { getOneRoleModStateOrRefusal } from './getOneRoleModStateOrRefusal';
import { getOneRolePackageVersion } from './getOneRolePackageVersion';

type RoleModDrift = {
  role: string;
  versionDeclared: string;
  versionInstalled: string;
  pathToSpec: string;
  plan: RoleModPlan;
};

type RoleModVerdict = {
  role: string;
  state: ReturnType<typeof getOneRoleModStateOrRefusal>['state'];
};

/**
 * .what = the drift of one mod, or null where it pins no version or its pin is installed
 * .why = names the per-role step, so the sweep reads as one map over the mods
 *
 * .note = a refused mod (no state) is the render's and the boot's to raise, so it is no drift
 */
const getOneRoleModDrift = (input: {
  cwd: string;
  verdict: RoleModVerdict;
}): RoleModDrift | null => {
  const { role, state } = input.verdict;
  const versionDeclared = state?.spec.of.version ?? null;
  if (!state || !versionDeclared) return null;

  // a pin that matches the installed version, or one whose version cannot be read, is no drift
  const versionInstalled = getOneRolePackageVersion({
    cwd: input.cwd,
    repo: state.target.repo,
  });
  if (!versionInstalled || versionInstalled === versionDeclared) return null;

  return {
    role: `${state.target.repo}/${state.target.role}`,
    versionDeclared,
    versionInstalled,
    pathToSpec: `.agent/repo=.mods/role=${role}/boot.yml`,
    plan: state.plan,
  };
};

/**
 * .what = each mod pinned to a version other than the one installed
 * .why = a release is the one moment to re-read every mod against the role it changes; the
 *        pester names each such mod, and what it does (usecase 5)
 *
 * .note = it reads the verdicts the sweep already derived, so each mod's state is derived once
 * .note = a mod with no `@version` asked for no pester, so it is never listed
 * .note = an unreadable installed version is no drift; the boot then labels the pin alone
 */
export const getAllRoleModDrifts = (input: {
  cwd: string;
  verdicts: RoleModVerdict[];
}): RoleModDrift[] =>
  input.verdicts.flatMap(
    (verdict) => getOneRoleModDrift({ cwd: input.cwd, verdict }) ?? [],
  );
