import { BadRequestError } from 'helpful-errors';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { discoverRoleKeyracks } from './discoverRoleKeyracks';
import { getOrgFromPackageJson } from './getOrgFromPackageJson';

/**
 * .what = initializes or updates the keyrack manifest for a repo
 * .why = enables `rhachet init --keys` CLI command
 *
 * behavior:
 * - roles: required, which roles to extend (fail-fast if role lacks keyrack)
 * - org: auto-detect from package.json only, error if undetectable
 * - extends: discover keyracks for specified roles, merge with findsert semantics
 * - env sections: env.prod, env.prep, env.test (present for user to populate)
 *
 * .note = returns 'created' if manifest was absent
 * .note = returns 'updated' if extends were merged
 * .note = returns 'found' if manifest was present and up-to-date
 * .note = for custom org, use `keyrack init` instead
 */
export const initKeyrackRepoManifest = async (
  input: {
    roles: string[];
    at?: string | null;
  },
  context: { gitroot: string },
): Promise<{
  effect: 'created' | 'found' | 'updated';
  manifestPath: string;
  org: string;
  extends: string[];
}> => {
  // compute manifest path
  const manifestPath = (() => {
    if (!input.at) return join(context.gitroot, '.agent', 'keyrack.yml');
    if (input.at.startsWith('/')) return input.at;
    return join(context.gitroot, input.at);
  })();

  // detect org: auto-detect from package.json only
  const org = await (async () => {
    const detected = await getOrgFromPackageJson({}, context);
    if (detected) return detected;
    throw new BadRequestError(
      'unable to detect org from package.json. use `keyrack init` for custom org.',
      {
        note: 'org detection checks: package.json#organization, scoped name (@org/), repository field',
        hint: 'run `npx rhachet keyrack init --for repo --org your-org` to specify org manually',
      },
    );
  })();

  // discover role keyracks for specified roles (skip roles that lack keyrack)
  const roleKeyracks = await discoverRoleKeyracks(
    { roles: input.roles },
    context,
  );

  // check if manifest already present
  if (existsSync(manifestPath)) {
    // read and parse current yaml
    const content = readFileSync(manifestPath, 'utf8');
    const parsed = parseYaml(content) as Record<string, unknown>;

    // get current extends (if any)
    const extendsCurrent = Array.isArray(parsed.extends)
      ? (parsed.extends as string[])
      : [];

    // merge extends: findsert semantics (add absent, preserve extant)
    const extendsSet = new Set([...extendsCurrent, ...roleKeyracks]);
    const extendsMerged = [...extendsSet].sort();

    // check if extends changed
    const extendsChanged =
      extendsMerged.length !== extendsCurrent.length ||
      extendsMerged.some((path, i) => path !== extendsCurrent[i]);

    if (!extendsChanged) {
      // no changes needed
      return {
        effect: 'found',
        manifestPath,
        org: (parsed.org as string) ?? org,
        extends: extendsMerged,
      };
    }

    // update extends in manifest
    parsed.extends = extendsMerged;

    // write updated yaml
    writeFileSync(manifestPath, stringifyYaml(parsed), 'utf8');

    return {
      effect: 'updated',
      manifestPath,
      org: (parsed.org as string) ?? org,
      extends: extendsMerged,
    };
  }

  // create new manifest
  const manifest: Record<string, unknown> = {
    org,
  };

  // add extends if any role keyracks discovered
  if (roleKeyracks.length > 0) {
    manifest.extends = roleKeyracks;
  }

  // add env sections (empty for user to populate)
  manifest['env.prod'] = null;
  manifest['env.prep'] = null;
  manifest['env.test'] = null;

  // ensure parent directory present
  mkdirSync(dirname(manifestPath), { recursive: true });

  // write yaml
  writeFileSync(manifestPath, stringifyYaml(manifest), 'utf8');

  return {
    effect: 'created',
    manifestPath,
    org,
    extends: roleKeyracks,
  };
};
