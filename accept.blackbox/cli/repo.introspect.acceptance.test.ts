import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet repo introspect', () => {
  given('[case1] repo with rhachet.use.ts that defines roles', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-roles-package' }),
    );

    when('[t0] repo introspect with default output', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['repo', 'introspect'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('creates rhachet.repo.yml at package root', () => {
        const manifestPath = resolve(repo.path, 'rhachet.repo.yml');
        expect(existsSync(manifestPath)).toBe(true);
      });

      then('yml contains role slug', () => {
        const manifestPath = resolve(repo.path, 'rhachet.repo.yml');
        const content = readFileSync(manifestPath, 'utf-8');
        expect(content).toContain('slug:');
      });

      then('yml contains roles array', () => {
        const manifestPath = resolve(repo.path, 'rhachet.repo.yml');
        const content = readFileSync(manifestPath, 'utf-8');
        expect(content).toContain('roles:');
      });
    });

    when('[t1] repo introspect --output - (stdout)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['repo', 'introspect', '--output', '-'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains yaml content', () => {
        expect(result.stdout).toContain('slug:');
        expect(result.stdout).toContain('roles:');
      });
    });
  });

  given('[case2] rhachet-roles package without getRoleRegistry export', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = genTestTempRepo({ fixture: 'with-roles-package' });
      // overwrite index.js to remove getRoleRegistry export
      const fs = require('fs');
      fs.writeFileSync(
        resolve(tempRepo.path, 'index.js'),
        'exports.foo = 1;',
      );
      return tempRepo;
    });

    when('[t0] repo introspect', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['repo', 'introspect'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about getRoleRegistry', () => {
        expect(result.stderr).toContain('getRoleRegistry');
      });
    });
  });

  given('[case3] rhachet-roles package with executable .sh skill', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = genTestTempRepo({ fixture: 'with-roles-package' });

      // create skills directory and add executable skill
      const skillsDir = resolve(tempRepo.path, 'roles/mechanic/skills');
      mkdirSync(skillsDir, { recursive: true });
      const skillPath = resolve(skillsDir, 'test-skill.sh');
      writeFileSync(skillPath, '#!/bin/bash\necho "test"');
      chmodSync(skillPath, 0o755);

      return tempRepo;
    });

    when('[t0] repo introspect', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['repo', 'introspect'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('creates rhachet.repo.yml', () => {
        const manifestPath = resolve(repo.path, 'rhachet.repo.yml');
        expect(existsSync(manifestPath)).toBe(true);
      });
    });
  });

  given('[case4] rhachet-roles package with non-executable .sh skill', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = genTestTempRepo({ fixture: 'with-roles-package' });

      // create skills directory and add non-executable skill
      const skillsDir = resolve(tempRepo.path, 'roles/mechanic/skills');
      mkdirSync(skillsDir, { recursive: true });
      const skillPath = resolve(skillsDir, 'broken-skill.sh');
      writeFileSync(skillPath, '#!/bin/bash\necho "broken"');
      // intentionally NOT chmod

      return { ...tempRepo, skillPath };
    });

    when('[t0] repo introspect', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['repo', 'introspect'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr includes path to non-executable skill', () => {
        expect(result.stderr).toContain('broken-skill.sh');
      });

      then('stderr includes fix hint', () => {
        expect(result.stderr).toContain('chmod +x');
      });
    });
  });

  given('[case5] rhachet-roles package with multiple non-executable .sh skills', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = genTestTempRepo({ fixture: 'with-roles-package' });

      // create skills directory and add multiple non-executable skills
      const skillsDir = resolve(tempRepo.path, 'roles/mechanic/skills');
      mkdirSync(skillsDir, { recursive: true });

      const skillPath1 = resolve(skillsDir, 'broken1.sh');
      const skillPath2 = resolve(skillsDir, 'broken2.sh');
      writeFileSync(skillPath1, '#!/bin/bash\necho "broken1"');
      writeFileSync(skillPath2, '#!/bin/bash\necho "broken2"');
      // intentionally NOT chmod

      return tempRepo;
    });

    when('[t0] repo introspect', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['repo', 'introspect'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr lists all non-executable paths', () => {
        expect(result.stderr).toContain('broken1.sh');
        expect(result.stderr).toContain('broken2.sh');
      });
    });
  });

  given('[case6] rhachet-roles package with only .ts/.md files in skills', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = genTestTempRepo({ fixture: 'with-roles-package' });

      // create skills directory with non-.sh files only
      const skillsDir = resolve(tempRepo.path, 'roles/mechanic/skills');
      mkdirSync(skillsDir, { recursive: true });
      writeFileSync(resolve(skillsDir, 'helper.ts'), 'export const x = 1;');
      writeFileSync(resolve(skillsDir, 'readme.md'), '# Skills');

      return tempRepo;
    });

    when('[t0] repo introspect', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['repo', 'introspect'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('creates rhachet.repo.yml', () => {
        const manifestPath = resolve(repo.path, 'rhachet.repo.yml');
        expect(existsSync(manifestPath)).toBe(true);
      });
    });
  });
});
