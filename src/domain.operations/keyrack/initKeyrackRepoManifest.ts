import { ConstraintError } from 'helpful-errors';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import { asKeyrackManifestOrgText } from '@src/access/daos/daoKeyrackRepoManifest/hydrate/asKeyrackManifestOrgText';
import { withKeyrackManifestWriteLock } from '@src/access/daos/daoKeyrackRepoManifest/withKeyrackManifestWriteLock';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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
    throw new ConstraintError(
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

  // read, merge, and write under one lock, so a parallel keyrack write is never lost
  return withKeyrackManifestWriteLock(
    { gitroot: context.gitroot, path: manifestPath },
    () =>
      existsSync(manifestPath)
        ? setExtendsIntoManifestFile({ manifestPath, org, roleKeyracks })
        : genManifestFile({ manifestPath, org, roleKeyracks }),
  );
};

/**
 * .what = merge role keyracks into the extends of an extant manifest file
 * .why = findsert semantics: add the absent, preserve the extant; the caller holds the lock
 */
const setExtendsIntoManifestFile = (input: {
  manifestPath: string;
  org: string;
  roleKeyracks: string[];
}): {
  effect: 'found' | 'updated';
  manifestPath: string;
  org: string;
  extends: string[];
} => {
  // read and parse current yaml
  const content = readFileSync(input.manifestPath, 'utf8');
  const parsed = parseYaml(content) as Record<string, unknown>;
  const orgText = asKeyrackManifestOrgText({
    org: parsed.org,
    fallback: input.org,
  });

  // merge extends: findsert semantics (add absent, preserve extant)
  const extendsCurrent = Array.isArray(parsed.extends)
    ? (parsed.extends as string[])
    : [];
  const extendsMerged = [
    ...new Set([...extendsCurrent, ...input.roleKeyracks]),
  ].sort();

  // no change needed when the merge equals what is on disk
  const extendsChanged =
    extendsMerged.length !== extendsCurrent.length ||
    extendsMerged.some((path, i) => path !== extendsCurrent[i]);
  if (!extendsChanged)
    return {
      effect: 'found',
      manifestPath: input.manifestPath,
      org: orgText,
      extends: extendsMerged,
    };

  // write the whole file back, with the merged extends
  setFileAtomic({
    path: input.manifestPath,
    content: stringifyYaml({ ...parsed, extends: extendsMerged }),
  });
  return {
    effect: 'updated',
    manifestPath: input.manifestPath,
    org: orgText,
    extends: extendsMerged,
  };
};

/**
 * .what = create a new manifest file with org, extends, and empty env sections
 * .why = the env sections are present for the human to populate; the caller holds the lock
 */
const genManifestFile = (input: {
  manifestPath: string;
  org: string;
  roleKeyracks: string[];
}): {
  effect: 'created';
  manifestPath: string;
  org: string;
  extends: string[];
} => {
  // extends only when role keyracks were discovered
  const manifest: Record<string, unknown> = {
    org: input.org,
    ...(input.roleKeyracks.length > 0 ? { extends: input.roleKeyracks } : {}),
    'env.prod': null,
    'env.prep': null,
    'env.test': null,
  };
  setFileAtomic({ path: input.manifestPath, content: stringifyYaml(manifest) });
  return {
    effect: 'created',
    manifestPath: input.manifestPath,
    org: input.org,
    extends: input.roleKeyracks,
  };
};
