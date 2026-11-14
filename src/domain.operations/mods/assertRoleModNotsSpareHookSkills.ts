import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { basename } from 'node:path';
import { asRoleModRefusalError } from './asRoleModRefusalError';
import { asRoleResourceKind } from './asRoleResourceKind';

/**
 * .what = the skill a hook command invokes, by the role-relative path or the skill name, and
 *         the repo and role the command pins it to, where it pins any
 * .why = three command forms name a skill — `rhachet run --skill <skill>` (or `rhx run
 *        --skill`), `rhx <skill>`, and `bash .agent/repo=<r>/role=<r>/skills/<path>` — so those
 *        are the three read (F16); a pin scopes the call to one role, so a hook that calls
 *        another role's skill of the same name is no conflict
 *
 * .note = the `--skill` form is read first, so `rhx run --skill x` names `x`, never `run`
 * .note = `--repo` and `--role` pin a `--skill` call; the bash form pins by its path
 * .note = `node -e`, a bare binary, and a skill an `inits/*.sh` executable calls inside its body
 *   are read as no skill; a skill a hook reaches through them is F10's residual, caught when
 *   the hook first fails
 */
const asHookSkillRef = (input: {
  command: string;
}): {
  skill: { name: string } | { path: string };
  pin: { repo: string | null; role: string | null };
} | null => {
  const viaBash = input.command.match(
    /(?:^|\s)bash\s+\.agent\/repo=(?<repo>[^/]+)\/role=(?<role>[^/]+)\/(?<path>skills\/\S+\.sh)/,
  );
  if (viaBash?.groups?.path)
    return {
      skill: { path: viaBash.groups.path },
      pin: {
        repo: viaBash.groups.repo ?? null,
        role: viaBash.groups.role ?? null,
      },
    };
  const pin = {
    repo:
      input.command.match(/(?:^|\s)--repo[\s=]+([A-Za-z0-9._-]+)/)?.[1] ?? null,
    role:
      input.command.match(/(?:^|\s)--role[\s=]+([A-Za-z0-9._-]+)/)?.[1] ?? null,
  };
  const viaRunSkill = input.command.match(
    /(?:^|\s)--skill[\s=]+([A-Za-z0-9._-]+)/,
  );
  if (viaRunSkill?.[1]) return { skill: { name: viaRunSkill[1] }, pin };
  const viaRhx = input.command.match(/(?:^|[\s/])rhx\s+([A-Za-z0-9._-]+)/);
  if (viaRhx?.[1]) return { skill: { name: viaRhx[1] }, pin };
  return null;
};

/**
 * .what = refuses a `not` of a skill that one of the role's own hooks invokes
 * .why = the hook would fail at its next event, far from the mod that broke it (usecase 9);
 *        the fix is to shadow the skill, which keeps the hook a target
 *
 * .note = a call pinned to another repo or role reaches that role's skill, never this one
 */
export const assertRoleModNotsSpareHookSkills = (input: {
  ref: RoleLinkRef;
  nots: string[];
  hookCommands: string[];
}): void => {
  const skillsNotted = input.nots.filter(
    (path) => asRoleResourceKind({ path }) === 'skills',
  );
  if (skillsNotted.length === 0) return;

  for (const command of input.hookCommands) {
    const call = asHookSkillRef({ command });
    if (!call) continue;
    const isPinnedElsewhere =
      (call.pin.repo !== null && call.pin.repo !== input.ref.repo) ||
      (call.pin.role !== null && call.pin.role !== input.ref.role);
    if (isPinnedElsewhere) continue;
    const { skill } = call;
    const conflict = skillsNotted.find((path) =>
      'path' in skill
        ? path === skill.path
        : basename(path, '.sh') === skill.name,
    );
    if (!conflict) continue;
    throw asRoleModRefusalError({
      role: input.ref.role,
      problem: `its not of ${conflict} removes a skill one of the role's hooks invokes`,
      subject: command,
      nearest: null,
      fix: `shadow ${conflict} rather than not it, so the hook still finds it`,
    });
  }
};
