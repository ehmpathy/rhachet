import { BadRequestError, getError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';

import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getRoleRegistryManifest } from './getRoleRegistryManifest';

describe('getRoleRegistryManifest', () => {
  given('[case1] a package with valid rhachet.repo.yml', () => {
    const scene = useBeforeAll(async () => {
      const packageRoot = join(tmpdir(), `rhachet-test-manifest-${Date.now()}`);
      mkdirSync(packageRoot, { recursive: true });

      const validManifest = `
slug: test-repo
readme: readme.md
roles:
  - slug: mechanic
    readme: roles/mechanic/readme.md
    briefs:
      dirs: roles/mechanic/briefs
    skills:
      dirs: roles/mechanic/skills
    inits:
      dirs: roles/mechanic/inits
`;
      writeFileSync(join(packageRoot, 'rhachet.repo.yml'), validManifest);

      return { packageRoot };
    });

    when('[t0] getRoleRegistryManifest is called', () => {
      then('returns a RoleRegistryManifest instance', () => {
        const result = getRoleRegistryManifest({
          packageRoot: scene.packageRoot,
        });
        expect(result).toBeInstanceOf(RoleRegistryManifest);
      });

      then('manifest has correct slug', () => {
        const result = getRoleRegistryManifest({
          packageRoot: scene.packageRoot,
        });
        expect(result.slug).toEqual('test-repo');
      });

      then('manifest has correct readme path', () => {
        const result = getRoleRegistryManifest({
          packageRoot: scene.packageRoot,
        });
        expect(result.readme.uri).toContain('readme.md');
      });

      then('manifest has roles array with one role', () => {
        const result = getRoleRegistryManifest({
          packageRoot: scene.packageRoot,
        });
        expect(result.roles).toHaveLength(1);
        expect(result.roles[0]!.slug).toEqual('mechanic');
      });
    });
  });

  given('[case2] a package without rhachet.repo.yml', () => {
    const scene = useBeforeAll(async () => {
      const packageRoot = join(
        tmpdir(),
        `rhachet-test-no-manifest-${Date.now()}`,
      );
      mkdirSync(packageRoot, { recursive: true });
      // no manifest file created
      return { packageRoot };
    });

    when('[t0] getRoleRegistryManifest is called', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          getRoleRegistryManifest({ packageRoot: scene.packageRoot }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
      });

      then('error message contains "not found"', async () => {
        const error = await getError(() =>
          getRoleRegistryManifest({ packageRoot: scene.packageRoot }),
        );
        expect(error.message).toContain('not found');
      });

      then('error message contains "rhachet.repo.yml"', async () => {
        const error = await getError(() =>
          getRoleRegistryManifest({ packageRoot: scene.packageRoot }),
        );
        expect(error.message).toContain('rhachet.repo.yml');
      });
    });
  });

  given('[case3] a package with invalid yaml in rhachet.repo.yml', () => {
    const scene = useBeforeAll(async () => {
      const packageRoot = join(
        tmpdir(),
        `rhachet-test-invalid-yaml-${Date.now()}`,
      );
      mkdirSync(packageRoot, { recursive: true });

      const invalidYaml = `
slug: test-repo
readme: readme.md
roles:
  - slug: mechanic
    briefs: [invalid: yaml: here
`;
      writeFileSync(join(packageRoot, 'rhachet.repo.yml'), invalidYaml);

      return { packageRoot };
    });

    when('[t0] getRoleRegistryManifest is called', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          getRoleRegistryManifest({ packageRoot: scene.packageRoot }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
      });

      then('error message contains "invalid yaml"', async () => {
        const error = await getError(() =>
          getRoleRegistryManifest({ packageRoot: scene.packageRoot }),
        );
        expect(error.message).toContain('invalid yaml');
      });

      then('error message contains "rhachet.repo.yml"', async () => {
        const error = await getError(() =>
          getRoleRegistryManifest({ packageRoot: scene.packageRoot }),
        );
        expect(error.message).toContain('rhachet.repo.yml');
      });
    });
  });

  given('[case4] a package with invalid schema in rhachet.repo.yml', () => {
    const scene = useBeforeAll(async () => {
      const packageRoot = join(
        tmpdir(),
        `rhachet-test-invalid-schema-${Date.now()}`,
      );
      mkdirSync(packageRoot, { recursive: true });

      // valid yaml but invalid schema (lacks required fields)
      const invalidSchema = `
slug: test-repo
readme: readme.md
roles:
  - slug: mechanic
`;
      writeFileSync(join(packageRoot, 'rhachet.repo.yml'), invalidSchema);

      return { packageRoot };
    });

    when('[t0] getRoleRegistryManifest is called', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          getRoleRegistryManifest({ packageRoot: scene.packageRoot }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
      });

      then('error message contains "invalid schema"', async () => {
        const error = await getError(() =>
          getRoleRegistryManifest({ packageRoot: scene.packageRoot }),
        );
        expect(error.message).toContain('invalid schema');
      });
    });
  });

  given('[case5] a package with multiple roles in rhachet.repo.yml', () => {
    const scene = useBeforeAll(async () => {
      const packageRoot = join(
        tmpdir(),
        `rhachet-test-multi-roles-${Date.now()}`,
      );
      mkdirSync(packageRoot, { recursive: true });

      const multiRoleManifest = `
slug: ehmpathy
readme: readme.md
roles:
  - slug: mechanic
    readme: roles/mechanic/readme.md
    briefs:
      dirs: roles/mechanic/briefs
    skills:
      dirs: roles/mechanic/skills
  - slug: reviewer
    readme: roles/reviewer/readme.md
    briefs:
      dirs: roles/reviewer/briefs
    skills:
      dirs: roles/reviewer/skills
    inits:
      dirs: roles/reviewer/inits
`;
      writeFileSync(join(packageRoot, 'rhachet.repo.yml'), multiRoleManifest);

      return { packageRoot };
    });

    when('[t0] getRoleRegistryManifest is called', () => {
      then('returns manifest with multiple roles', () => {
        const result = getRoleRegistryManifest({
          packageRoot: scene.packageRoot,
        });
        expect(result.roles).toHaveLength(2);
      });

      then('first role is mechanic', () => {
        const result = getRoleRegistryManifest({
          packageRoot: scene.packageRoot,
        });
        expect(result.roles[0]!.slug).toEqual('mechanic');
      });

      then('second role is reviewer', () => {
        const result = getRoleRegistryManifest({
          packageRoot: scene.packageRoot,
        });
        expect(result.roles[1]!.slug).toEqual('reviewer');
      });
    });
  });
});
