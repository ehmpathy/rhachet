import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { getRoleRegistryManifest } from './getRoleRegistryManifest';

describe('getRoleRegistryManifest', () => {
  given('[case1] valid manifest file', () => {
    const tempDir = path.join(os.tmpdir(), `rhachet-test-${Date.now()}`);
    const validManifest = `
slug: ehmpathy
readme: README.md
roles:
  - slug: mechanic
    readme: src/roles/mechanic/readme.md
    briefs:
      dirs: src/roles/mechanic/briefs
    skills:
      dirs: src/roles/mechanic/skills
    inits:
      dirs: src/roles/mechanic/inits
      exec:
        - setup.init.sh
`;

    beforeAll(() => {
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'rhachet.repo.yml'), validManifest);
    });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] manifest is read', () => {
      then('returns a RoleRegistryManifest instance', () => {
        const result = getRoleRegistryManifest({ packageRoot: tempDir });
        expect(result).toBeInstanceOf(RoleRegistryManifest);
      });

      then('slug is "ehmpathy"', () => {
        const result = getRoleRegistryManifest({ packageRoot: tempDir });
        expect(result.slug).toEqual('ehmpathy');
      });

      then('readme is resolved to absolute path', () => {
        const result = getRoleRegistryManifest({ packageRoot: tempDir });
        expect(result.readme).toEqual({ uri: path.join(tempDir, 'README.md') });
      });

      then('roles array has one role', () => {
        const result = getRoleRegistryManifest({ packageRoot: tempDir });
        expect(result.roles).toHaveLength(1);
      });

      then('role.slug is "mechanic"', () => {
        const result = getRoleRegistryManifest({ packageRoot: tempDir });
        expect(result.roles[0]?.slug).toEqual('mechanic');
      });

      then('role.inits.exec is resolved to absolute path', () => {
        const result = getRoleRegistryManifest({ packageRoot: tempDir });
        expect(result.roles[0]?.inits?.exec).toEqual([
          { cmd: path.join(tempDir, 'setup.init.sh') },
        ]);
      });
    });
  });

  given('[case2] manifest with multiple roles', () => {
    const tempDir = path.join(os.tmpdir(), `rhachet-test-${Date.now()}-multi`);
    const multiRoleManifest = `
slug: bhuild
readme: README.md
roles:
  - slug: behaver
    readme: src/roles/behaver/readme.md
    briefs:
      dirs:
        - src/roles/behaver/briefs
        - src/roles/behaver/extra-briefs
    skills:
      dirs: src/roles/behaver/skills
  - slug: reviewer
    readme: src/roles/reviewer/readme.md
    briefs:
      dirs: src/roles/reviewer/briefs
    skills:
      dirs: src/roles/reviewer/skills
`;

    beforeAll(() => {
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'rhachet.repo.yml'),
        multiRoleManifest,
      );
    });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] manifest is read', () => {
      then('roles array has two roles', () => {
        const result = getRoleRegistryManifest({ packageRoot: tempDir });
        expect(result.roles).toHaveLength(2);
      });

      then('first role.briefs.dirs is resolved array of uri objects', () => {
        const result = getRoleRegistryManifest({ packageRoot: tempDir });
        expect(result.roles[0]?.briefs.dirs).toEqual([
          { uri: path.join(tempDir, 'src/roles/behaver/briefs') },
          { uri: path.join(tempDir, 'src/roles/behaver/extra-briefs') },
        ]);
      });

      then('second role.slug is "reviewer"', () => {
        const result = getRoleRegistryManifest({ packageRoot: tempDir });
        expect(result.roles[1]?.slug).toEqual('reviewer');
      });
    });
  });

  given('[case3] manifest file does not exist', () => {
    const tempDir = path.join(os.tmpdir(), `rhachet-test-${Date.now()}-absent`);

    beforeAll(() => {
      fs.mkdirSync(tempDir, { recursive: true });
    });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] getRoleRegistryManifest is called', () => {
      then('throws BadRequestError with "not found" message', async () => {
        const error = await getError(() =>
          getRoleRegistryManifest({ packageRoot: tempDir }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('rhachet.repo.yml not found');
      });
    });
  });

  given('[case4] manifest file has invalid yaml', () => {
    const tempDir = path.join(
      os.tmpdir(),
      `rhachet-test-${Date.now()}-badyaml`,
    );
    const invalidYaml = `
slug: ehmpathy
readme: README.md
roles:
  - slug: mechanic
    briefs:
      - this: is: invalid: yaml: syntax
`;

    beforeAll(() => {
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'rhachet.repo.yml'), invalidYaml);
    });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] getRoleRegistryManifest is called', () => {
      then('throws BadRequestError with "invalid yaml" message', async () => {
        const error = await getError(() =>
          getRoleRegistryManifest({ packageRoot: tempDir }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('invalid yaml');
      });
    });
  });

  given('[case5] manifest file has invalid schema', () => {
    const tempDir = path.join(
      os.tmpdir(),
      `rhachet-test-${Date.now()}-badschema`,
    );
    const invalidSchema = `
slug: ehmpathy
readme: README.md
roles:
  - slug: mechanic
    # lacks required briefs and skills
`;

    beforeAll(() => {
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'rhachet.repo.yml'), invalidSchema);
    });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] getRoleRegistryManifest is called', () => {
      then('throws BadRequestError with "invalid schema" message', async () => {
        const error = await getError(() =>
          getRoleRegistryManifest({ packageRoot: tempDir }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('invalid schema');
      });
    });
  });

  given('[case6] manifest with optional inits omitted', () => {
    const tempDir = path.join(
      os.tmpdir(),
      `rhachet-test-${Date.now()}-noinits`,
    );
    const noInitsManifest = `
slug: minimal
readme: README.md
roles:
  - slug: basic
    readme: readme.md
    briefs:
      dirs: briefs
    skills:
      dirs: skills
`;

    beforeAll(() => {
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'rhachet.repo.yml'), noInitsManifest);
    });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] manifest is read', () => {
      then('role.inits is undefined', () => {
        const result = getRoleRegistryManifest({ packageRoot: tempDir });
        expect(result.roles[0]?.inits).toBeUndefined();
      });
    });
  });
});
