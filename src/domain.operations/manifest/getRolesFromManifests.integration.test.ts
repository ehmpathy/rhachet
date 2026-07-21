import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genTestTempDir } from '@src/.test/infra';

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getRoleRegistryManifest } from './getRoleRegistryManifest';
import { getRolesFromManifests } from './getRolesFromManifests';

/**
 * .what = writes a rhachet.repo.yml under a package root
 * .why = seeds real registry manifests so getRolesFromManifests can be
 *        exercised over the add-path lookup (e5/e14 not-found, e8-style ambiguity)
 */
const writeManifest = (input: {
  root: string;
  slug: string;
  roles: string[];
}): void => {
  mkdirSync(input.root, { recursive: true });
  const rolesYml = input.roles
    .map(
      (role) =>
        `  - slug: ${role}\n    readme: ${role}/readme.md\n    briefs:\n      dirs: ${role}/briefs\n    skills:\n      dirs: ${role}/skills`,
    )
    .join('\n');
  writeFileSync(
    resolve(input.root, 'rhachet.repo.yml'),
    `slug: ${input.slug}\nreadme: README.md\nroles:\n${rolesYml}\n`,
  );
};

describe('getRolesFromManifests (integration) — add-path lookup', () => {
  const testDir = genTestTempDir({
    base: __dirname,
    name: 'getRolesFromManifests',
  });

  // loads both seeded manifests as a real array for each lookup
  const loadManifests = (): ReturnType<typeof getRoleRegistryManifest>[] => [
    getRoleRegistryManifest({
      packageRoot: resolve(testDir.path, 'pkg-ehmpathy'),
    }),
    getRoleRegistryManifest({
      packageRoot: resolve(testDir.path, 'pkg-bhuild'),
    }),
  ];

  // two package manifests: ehmpathy has mechanic+reviewer, bhuild has reviewer
  beforeAll(() => {
    testDir.setup();
    writeManifest({
      root: resolve(testDir.path, 'pkg-ehmpathy'),
      slug: 'ehmpathy',
      roles: ['mechanic', 'reviewer'],
    });
    writeManifest({
      root: resolve(testDir.path, 'pkg-bhuild'),
      slug: 'bhuild',
      roles: ['reviewer'],
    });
  });
  afterAll(() => testDir.teardown());

  given('[case1] a known unqualified slug present in one manifest', () => {
    when('[t0] the slug is looked up', () => {
      then('returns the matching repo + role', () => {
        const found = getRolesFromManifests({
          specifiers: ['mechanic'],
          manifests: loadManifests(),
        });
        expect(found).toHaveLength(1);
        expect(found[0]?.repo.slug).toEqual('ehmpathy');
        expect(found[0]?.role.slug).toEqual('mechanic');
      });
    });
  });

  given('[case2] an unknown slug absent from all manifests (e5, e14)', () => {
    when('[t0] the unknown slug is looked up on the add path', () => {
      then('throws BadRequestError with a not-found message', async () => {
        const error = await getError(() =>
          getRolesFromManifests({
            specifiers: ['nonesuch'],
            manifests: loadManifests(),
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message.toLowerCase()).toContain('not found');
      });
    });
  });

  given('[case3] an unqualified slug present in two manifests', () => {
    when(
      '[t0] the ambiguous slug is looked up without a repo qualifier',
      () => {
        then('throws BadRequestError about ambiguity', async () => {
          const error = await getError(() =>
            getRolesFromManifests({
              specifiers: ['reviewer'],
              manifests: loadManifests(),
            }),
          );
          expect(error).toBeInstanceOf(BadRequestError);
          expect(error.message).toContain('ambiguous');
        });
      },
    );
  });

  given('[case4] a qualified specifier for a multi-manifest slug', () => {
    when('[t0] the repo-qualified slug is looked up', () => {
      then('returns only the qualified repo + role', () => {
        const found = getRolesFromManifests({
          specifiers: ['bhuild/reviewer'],
          manifests: loadManifests(),
        });
        expect(found).toHaveLength(1);
        expect(found[0]?.repo.slug).toEqual('bhuild');
        expect(found[0]?.role.slug).toEqual('reviewer');
      });
    });
  });
});
