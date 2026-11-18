import { RoleModTarget } from '@src/domain.objects/RoleModTarget';

import { asRoleModRefusalError } from './asRoleModRefusalError';

/**
 * .what = whether a pin names one exact release, as `1.39.5` or `2.0.0-rc.1`
 * .why = a range (`^1.2.0`), a tag (`latest`) or a `v` prefix never equals an installed version
 */
const isExactReleaseVersion = (input: { version: string }): boolean =>
  /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(input.version);

/**
 * .what = the fix for a mod whose boot.yml declares no `of:`
 * .why = the linked repos that hold the role are the only legal `of:` values, so the fix
 *        names them rather than a placeholder the human must fill in
 */
const asRoleModFixForAbsentOf = (input: {
  roleDir: string;
  reposLinked: string[];
}): string => {
  // no linked repo holds the role: the placeholder, and the link that would supply one
  if (input.reposLinked.length === 0)
    return `add \`of: <repo>/${input.roleDir}\` — no linked repo holds role=${input.roleDir}, so link it first via \`rhx init --roles <repo>/${input.roleDir}\``;

  // each linked repo that holds the role is one legal `of:`
  const forms = input.reposLinked
    .map((repo) => `\`of: ${repo}/${input.roleDir}\``)
    .join(' or ');
  return `add ${forms} — the role this mod is over (and, optionally, \`@<version>\`)`;
};

/**
 * .what = cast a mod's `of:` value to the role it names
 * .why = `of: ehmpathy/mechanic@1.39.5` carries a repo, a role, and an optional version, in
 *        the form of a package spec; one cast owns that grammar
 *
 * .note = forms: `role` · `repo/role` · `role@version` · `repo/role@version`
 * .note = the role slug must equal the mod dir's slug; a mod dir names one slug, and `of:`
 *   picks which repo's role of that slug it is over
 */
export const asRoleModTargetFromOf = (input: {
  of: unknown;
  roleDir: string;
  reposLinked: string[];
}): RoleModTarget => {
  // an absent or non-string `of` names no role; the fix names each linked repo that holds it
  if (typeof input.of !== 'string' || input.of.trim().length === 0)
    throw asRoleModRefusalError({
      role: input.roleDir,
      problem: 'its boot.yml declares no `of:`',
      subject: 'boot.yml',
      nearest: null,
      fix: asRoleModFixForAbsentOf({
        roleDir: input.roleDir,
        reposLinked: input.reposLinked,
      }),
    });

  // split the version from the role path
  const [rolePath, version, ...extra] = input.of.trim().split('@');
  const parts = (rolePath ?? '').split('/');
  const isMalformed =
    extra.length > 0 ||
    version === '' ||
    parts.length > 2 ||
    parts.some((part) => part.length === 0);
  if (isMalformed)
    throw asRoleModRefusalError({
      role: input.roleDir,
      problem: `its \`of: ${input.of}\` is not a role spec`,
      subject: 'boot.yml',
      nearest: null,
      fix: 'write `of: <repo>/<role>` or `of: <repo>/<role>@<version>`',
    });

  // a pin is an exact release, never a range or a tag: the pester compares it to the installed
  //   version by equality, so a `^1.2.0` or a `latest` would pester on every stop
  if (version !== undefined && !isExactReleaseVersion({ version }))
    throw asRoleModRefusalError({
      role: input.roleDir,
      problem: `its \`of: ${input.of}\` pins \`${version}\`, which is not an exact release`,
      subject: 'boot.yml',
      nearest: null,
      fix: 'pin the exact installed version, as `@1.39.5`, or drop the `@` to pin none',
    });

  // the role slug must match the mod dir's own slug
  const role = parts.length === 2 ? parts[1]! : parts[0]!;
  if (role !== input.roleDir)
    throw asRoleModRefusalError({
      role: input.roleDir,
      problem: `its \`of: ${input.of}\` names role=${role}, but the mod dir is role=${input.roleDir}`,
      subject: 'boot.yml',
      nearest: null,
      fix: `move the mod to .agent/repo=.mods/role=${role}/, or set \`of:\` to a ${input.roleDir} role`,
    });

  return new RoleModTarget({
    repo: parts.length === 2 ? parts[0]! : null,
    role,
    version: version ?? null,
  });
};
