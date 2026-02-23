import { BadRequestError } from 'helpful-errors';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import { RoleManifest } from '@src/domain.objects/RoleManifest';
import { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = raw schema for role definition within rhachet.repo.yml manifest
 * .why = validates role configuration from yaml files (paths as strings)
 */
const schemaRoleManifestRaw = z.object({
  /**
   * .what = unique identifier for this role (e.g., "mechanic")
   */
  slug: z.string(),

  /**
   * .what = path to role readme relative to package root
   */
  readme: z.string(),

  /**
   * .what = paths to briefs directories
   */
  briefs: z.object({
    dirs: z.union([z.string(), z.array(z.string())]),
  }),

  /**
   * .what = paths to skills directories
   */
  skills: z.object({
    dirs: z.union([z.string(), z.array(z.string())]),
  }),

  /**
   * .what = initialization configuration
   */
  inits: z
    .object({
      dirs: z.union([z.string(), z.array(z.string())]).optional(),
      exec: z.array(z.string()).optional(),
    })
    .optional(),

  /**
   * .what = path to boot.yml relative to package root
   */
  boot: z.string().optional(),

  /**
   * .what = path to keyrack.yml relative to package root
   */
  keyrack: z.string().optional(),
});

/**
 * .what = raw schema for rhachet.repo.yml manifest file
 * .why = validates yaml structure before path resolution
 */
const schemaRoleRegistryManifestRaw = z.object({
  /**
   * .what = unique identifier for this repo (e.g., "ehmpathy", "bhuild")
   * .note = matches the suffix of rhachet-roles-{slug} package name
   */
  slug: z.string(),

  /**
   * .what = path to readme file relative to package root
   */
  readme: z.string(),

  /**
   * .what = role definitions for this repo
   */
  roles: z.array(schemaRoleManifestRaw),
});

/**
 * .what = resolves a string or string[] to { uri: string } format
 * .why = converts raw yaml paths to resolved absolute paths
 */
const toUriDirs = (input: {
  dirs: string | string[];
  packageRoot: string;
}): { uri: string } | { uri: string }[] => {
  if (Array.isArray(input.dirs)) {
    return input.dirs.map((dir) => ({ uri: resolve(input.packageRoot, dir) }));
  }
  return { uri: resolve(input.packageRoot, input.dirs) };
};

/**
 * .what = reads and validates a rhachet.repo.yml manifest from a package root
 * .why = enables discovery of role registries from installed rhachet-roles-* packages
 *
 * .note = paths are resolved to absolute at instantiation
 */
export const getRoleRegistryManifest = (input: {
  packageRoot: string;
}): RoleRegistryManifest => {
  // resolve manifest path
  const manifestPath = resolve(input.packageRoot, 'rhachet.repo.yml');

  // read manifest file
  let content: string;
  try {
    content = readFileSync(manifestPath, 'utf8');
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT')
      throw new BadRequestError('rhachet.repo.yml not found', {
        packageRoot: input.packageRoot,
        manifestPath,
      });
    throw error;
  }

  // parse yaml
  let parsed: unknown;
  try {
    parsed = parseYaml(content);
  } catch (error) {
    throw new BadRequestError('rhachet.repo.yml has invalid yaml', {
      packageRoot: input.packageRoot,
      manifestPath,
      parseError: (error as Error).message,
    });
  }

  // validate against raw schema
  const result = schemaRoleRegistryManifestRaw.safeParse(parsed);
  if (!result.success)
    throw new BadRequestError('rhachet.repo.yml has invalid schema', {
      packageRoot: input.packageRoot,
      manifestPath,
      errors: result.error.issues,
    });

  // resolve paths and instantiate
  const raw = result.data;
  const roles = raw.roles.map(
    (role) =>
      new RoleManifest({
        slug: role.slug,
        readme: { uri: resolve(input.packageRoot, role.readme) },
        briefs: {
          dirs: toUriDirs({
            dirs: role.briefs.dirs,
            packageRoot: input.packageRoot,
          }),
        },
        skills: {
          dirs: toUriDirs({
            dirs: role.skills.dirs,
            packageRoot: input.packageRoot,
          }),
        },
        ...(role.inits && {
          inits: {
            ...(role.inits.dirs && {
              dirs: toUriDirs({
                dirs: role.inits.dirs,
                packageRoot: input.packageRoot,
              }),
            }),
            ...(role.inits.exec && {
              exec: role.inits.exec.map((cmd) => ({
                cmd: resolve(input.packageRoot, cmd),
              })),
            }),
          },
        }),
        ...(role.boot && {
          boot: { uri: resolve(input.packageRoot, role.boot) },
        }),
        ...(role.keyrack && {
          keyrack: { uri: resolve(input.packageRoot, role.keyrack) },
        }),
      }),
  );

  return new RoleRegistryManifest({
    slug: raw.slug,
    readme: { uri: resolve(input.packageRoot, raw.readme) },
    roles,
  });
};
