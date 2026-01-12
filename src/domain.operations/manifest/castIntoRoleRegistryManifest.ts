import { stringify } from 'yaml';

import type { Role, RoleRegistry } from '@src/domain.objects';

import { relative } from 'node:path';

/**
 * .what = raw role manifest for yaml serialization (paths as strings)
 * .why = output type for castIntoRoleManifestSerializable
 */
interface RoleManifestSerializable {
  slug: string;
  readme: string;
  briefs: { dirs: string | string[] };
  skills: { dirs: string | string[] };
  inits?: {
    dirs?: string | string[];
    exec?: string[];
  };
}

/**
 * .what = registry manifest shape for yaml serialization (paths as strings)
 * .why = output type for castIntoRoleRegistryManifest
 */
interface RoleRegistryManifestSerializable {
  slug: string;
  readme: string;
  roles: RoleManifestSerializable[];
}

/**
 * .what = serialized registry manifest (yaml string)
 * .why = return type for serializeRoleRegistryManifest
 */
type RoleRegistryManifestSerialized = string;

/**
 * .what = extracts uri strings from dirs config
 * .why = normalizes single vs array format to string array
 */
const extractDirUris = (
  dirs: { uri: string } | { uri: string }[],
): string[] => {
  if (Array.isArray(dirs)) return dirs.map((d) => d.uri);
  return [dirs.uri];
};

/**
 * .what = makes a path relative to the package root
 * .why = manifest paths must be relative for portability
 */
const makeRelative = (input: {
  absolutePath: string;
  packageRoot: string;
}): string => {
  const rel = relative(input.packageRoot, input.absolutePath);
  return rel;
};

/**
 * .what = transforms a Role to RoleManifest format
 * .why = reusable transform for each role in the registry
 */
const castIntoRoleManifestSerializable = (input: {
  role: Role;
  packageRoot: string;
}): RoleManifestSerializable => {
  const { role, packageRoot } = input;

  // transform briefs dirs
  const briefsDirs = extractDirUris(role.briefs.dirs).map((uri) =>
    makeRelative({ absolutePath: uri, packageRoot }),
  );

  // transform skills dirs
  const skillsDirs = extractDirUris(role.skills.dirs).map((uri) =>
    makeRelative({ absolutePath: uri, packageRoot }),
  );

  // build base manifest
  const manifest: RoleManifestSerializable = {
    slug: role.slug,
    readme: makeRelative({ absolutePath: role.readme.uri, packageRoot }),
    briefs: {
      dirs: briefsDirs.length === 1 ? briefsDirs[0]! : briefsDirs,
    },
    skills: {
      dirs: skillsDirs.length === 1 ? skillsDirs[0]! : skillsDirs,
    },
  };

  // add inits if present
  if (role.inits) {
    const inits: RoleManifestSerializable['inits'] = {};

    if (role.inits.dirs) {
      const initsDirs = extractDirUris(role.inits.dirs).map((uri) =>
        makeRelative({ absolutePath: uri, packageRoot }),
      );
      inits.dirs = initsDirs.length === 1 ? initsDirs[0]! : initsDirs;
    }

    if (role.inits.exec && role.inits.exec.length > 0) {
      inits.exec = role.inits.exec.map((e) =>
        makeRelative({ absolutePath: e.cmd, packageRoot }),
      );
    }

    if (Object.keys(inits).length > 0) {
      manifest.inits = inits;
    }
  }

  return manifest;
};

/**
 * .what = generates a RoleRegistryManifest from a RoleRegistry
 * .why = enables `npx rhachet repo introspect` to output rhachet.repo.yml
 *
 * .note = all paths are converted to relative paths from packageRoot
 */
export const castIntoRoleRegistryManifest = (input: {
  registry: RoleRegistry;
  packageRoot: string;
}): RoleRegistryManifestSerializable => {
  const { registry, packageRoot } = input;

  return {
    slug: registry.slug,
    readme: makeRelative({ absolutePath: registry.readme.uri, packageRoot }),
    roles: registry.roles.map((role) =>
      castIntoRoleManifestSerializable({ role, packageRoot }),
    ),
  };
};

/**
 * .what = serializes a RoleRegistryManifest to yaml string
 * .why = enables write to rhachet.repo.yml file
 */
export const serializeRoleRegistryManifest = (input: {
  manifest: RoleRegistryManifestSerializable;
}): RoleRegistryManifestSerialized => {
  return stringify(input.manifest, { lineWidth: 0 });
};
