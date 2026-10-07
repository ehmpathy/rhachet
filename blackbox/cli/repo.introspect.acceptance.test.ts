import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet repo introspect', () => {
  given('[case0] --help is invoked', () => {
    when('[t0] repo introspect --help', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['repo', 'introspect', '--help'],
          cwd: process.cwd(),
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains command description', () => {
        expect(result.stdout).toContain('introspect');
      });

      then('help output matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

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

      then('yml content matches snapshot', () => {
        const manifestPath = resolve(repo.path, 'rhachet.repo.yml');
        const content = readFileSync(manifestPath, 'utf-8');
        expect(content).toMatchSnapshot();
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

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] rhachet-roles package without getRoleRegistry export', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = await genTestTempRepo({ fixture: 'with-roles-package' });
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

      then('error output matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case3] rhachet-roles package with executable .sh skill', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = await genTestTempRepo({ fixture: 'with-roles-package' });

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

      then('yml content matches snapshot', () => {
        const manifestPath = resolve(repo.path, 'rhachet.repo.yml');
        const content = readFileSync(manifestPath, 'utf-8');
        expect(content).toMatchSnapshot();
      });
    });
  });

  given('[case4] rhachet-roles package with non-executable .sh skill', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = await genTestTempRepo({ fixture: 'with-roles-package' });

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

      then('error output matches snapshot', () => {
        const normalized = result.stderr.replace(
          new RegExp(repo.path, 'g'),
          '<testDir>',
        );
        expect(normalized).toMatchSnapshot();
      });
    });
  });

  given('[case5] rhachet-roles package with multiple non-executable .sh skills', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = await genTestTempRepo({ fixture: 'with-roles-package' });

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

      then('error output matches snapshot', () => {
        const normalized = result.stderr.replace(
          new RegExp(repo.path, 'g'),
          '<testDir>',
        );
        expect(normalized).toMatchSnapshot();
      });
    });
  });

  given('[case6] rhachet-roles package with orphan .md.min in briefs', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = await genTestTempRepo({ fixture: 'with-roles-package' });

      // create briefs directory and add orphan .md.min (no .md source)
      const briefsDir = resolve(tempRepo.path, 'roles/mechanic/briefs');
      mkdirSync(briefsDir, { recursive: true });
      writeFileSync(
        resolve(briefsDir, 'orphan.md.min'),
        'orphan brief without source',
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

      // 🚨 exit 2, never 1. the orphan sits in the CALLER's brief tree, so it is theirs to
      //   settle — `assertZeroOrphanMinifiedBriefs` raises a `ConstraintError` to say so.
      //   a bare `Error` there reaches the cli unclassified, the frame guesses
      //   `MalfunctionError`, and the human is told OUR install is damaged (exit 1).
      //   `not.toEqual(0)` was green under that defect, so the exact code is locked here.
      then('exits with status 2 — the caller settles it, not us', () => {
        expect(result.status).toEqual(2);
      });

      then('stderr names the orphan file', () => {
        expect(result.stderr).toContain('orphan.md.min');
      });

      then('error output matches snapshot', () => {
        const normalized = result.stderr
          .replace(new RegExp(repo.path, 'g'), '<testDir>')
          .replace(/\/home\/[^\s]+\/src\//g, '<src>/')
          .replace(/\/home\/[^\s]+\/node_modules\//g, '<node_modules>/');
        expect(normalized).toMatchSnapshot();
      });
    });
  });

  given('[case7] rhachet-roles package with role that has boot and keyrack', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = await genTestTempRepo({ fixture: 'with-roles-package' });

      // create boot.yml and keyrack.yml for the role
      const roleDir = resolve(tempRepo.path, 'roles/mechanic');
      mkdirSync(roleDir, { recursive: true });
      writeFileSync(resolve(roleDir, 'boot.yml'), 'model: claude-sonnet\n');
      writeFileSync(
        resolve(roleDir, 'keyrack.yml'),
        'org: testorg\nenv.test:\n  - TEST_KEY\n',
      );

      // update index.js to include boot and keyrack in role definition
      const indexPath = resolve(tempRepo.path, 'index.js');
      const indexContent = `
const path = require('path');
const packageRoot = __dirname;
const registry = {
  slug: 'test',
  readme: { uri: path.join(packageRoot, 'readme.md') },
  roles: [
    {
      slug: 'mechanic',
      name: 'Mechanic',
      purpose: 'fix things',
      readme: { uri: path.join(packageRoot, 'roles/mechanic/readme.md') },
      traits: [],
      briefs: { dirs: { uri: path.join(packageRoot, 'roles/mechanic/briefs') } },
      skills: {
        dirs: { uri: path.join(packageRoot, 'roles/mechanic/skills') },
        refs: [],
      },
      hooks: {
        onBrain: {
          onBoot: [
            {
              command: './node_modules/.bin/rhachet run --skill say-hello',
              timeout: 'PT60S',
            },
          ],
        },
      },
      boot: { uri: path.join(packageRoot, 'roles/mechanic/boot.yml') },
      keyrack: { uri: path.join(packageRoot, 'roles/mechanic/keyrack.yml') },
    },
  ],
};
exports.getRoleRegistry = () => registry;
`;
      writeFileSync(indexPath, indexContent);

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

      then('yml contains boot path', () => {
        const manifestPath = resolve(repo.path, 'rhachet.repo.yml');
        const content = readFileSync(manifestPath, 'utf-8');
        expect(content).toContain('boot:');
        expect(content).toContain('roles/mechanic/boot.yml');
      });

      then('yml contains keyrack path', () => {
        const manifestPath = resolve(repo.path, 'rhachet.repo.yml');
        const content = readFileSync(manifestPath, 'utf-8');
        expect(content).toContain('keyrack:');
        expect(content).toContain('roles/mechanic/keyrack.yml');
      });

      then('yml content matches snapshot', () => {
        const manifestPath = resolve(repo.path, 'rhachet.repo.yml');
        const content = readFileSync(manifestPath, 'utf-8');
        expect(content).toMatchSnapshot();
      });
    });
  });

  given('[case8] rhachet-roles package with only .ts/.md files in skills', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = await genTestTempRepo({ fixture: 'with-roles-package' });

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

      then('yml content matches snapshot', () => {
        const manifestPath = resolve(repo.path, 'rhachet.repo.yml');
        const content = readFileSync(manifestPath, 'utf-8');
        expect(content).toMatchSnapshot();
      });
    });
  });

  given('[case9] rhachet-roles package with bootable content and no boot hook', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-roles-package-no-hook' }),
    );

    when('[t0] repo introspect', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['repo', 'introspect'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      /**
       * 🔴 .what = a role with bootable briefs and NO boot hook is boot-complete, so
       *   `repo introspect` reports it and exits 0. there is no refusal to assert here.
       *
       * .why = the brain dir's `boot.md` renders a role's briefs off its ROLESET, so a
       *   boot hook is not what carries them to a brain.
       *
       * .note = the briefs' boot path is proven in `brain-dir-boot.journey`, against a live brain.
       */
      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stderr holds no boot hook complaint', () => {
        expect(result.stderr).not.toContain('bootable content');
      });

      then('creates rhachet.repo.yml', () => {
        const manifestPath = resolve(repo.path, 'rhachet.repo.yml');
        expect(existsSync(manifestPath)).toBe(true);
      });

      then('yml content matches snapshot', () => {
        const manifestPath = resolve(repo.path, 'rhachet.repo.yml');
        const content = readFileSync(manifestPath, 'utf-8');
        expect(content).toContain('slug: mechanic');
        expect(content).toMatchSnapshot();
      });
    });
  });

  given('[case10] rhachet-roles package with forbidden npx hook', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = await genTestTempRepo({ fixture: 'with-roles-package' });

      // update index.js to use npx rhachet (forbidden pattern)
      const indexPath = resolve(tempRepo.path, 'index.js');
      const indexContent = `
const path = require('path');
const packageRoot = __dirname;
const registry = {
  slug: 'test',
  readme: { uri: path.join(packageRoot, 'readme.md') },
  roles: [
    {
      slug: 'mechanic',
      name: 'Mechanic',
      purpose: 'fix things',
      readme: { uri: path.join(packageRoot, 'roles/mechanic/readme.md') },
      traits: [],
      briefs: { dirs: { uri: path.join(packageRoot, 'roles/mechanic/briefs') } },
      skills: {
        dirs: { uri: path.join(packageRoot, 'roles/mechanic/skills') },
        refs: [],
      },
      hooks: {
        onBrain: {
          onBoot: [
            {
              command: 'npx rhachet run --skill say-hello',
              timeout: 'PT60S',
            },
          ],
        },
      },
    },
  ],
};
exports.getRoleRegistry = () => registry;
`;
      writeFileSync(indexPath, indexContent);

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

      then('stderr includes stop hand error header', () => {
        // 🚨 the glyph is separated from the message by the class name — see [case9]'s twin
        //   assertion for why the old adjacent form was a DOUBLED glyph, never a header
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stderr).toContain('hooks with forbidden npx patterns');
        expect(result.stderr).not.toContain('✋ hooks with forbidden');
      });

      then('stderr includes role slug', () => {
        expect(result.stderr).toContain('mechanic');
      });

      then('stderr includes hook location', () => {
        expect(result.stderr).toContain('onBrain.onBoot[0]');
      });

      then('stderr includes forbidden command', () => {
        expect(result.stderr).toContain('npx rhachet run --skill say-hello');
      });

      then('stderr includes hint with direct path', () => {
        expect(result.stderr).toContain('./node_modules/.bin/rhachet');
      });

      then('error output matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  /**
   * .what = the budget gate at `repo introspect` — pre-publish, in the author's own tree
   * .why = the render is a human surface, snapped through the contract: the cli frame, class
   *   prefix, and exit code are invisible to the operation-tier snapshot
   *   (`rule.require.contract-snapshot-exhaustiveness`)
   */
  given('[case11] a role whose boot.yml declares a budget its payload exceeds', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = await genTestTempRepo({ fixture: 'with-roles-package' });

      // a spec with a cap no real payload can meet, beside a brief that blows it
      const dirRole = resolve(tempRepo.path, 'roles/mechanic');
      const dirBriefs = resolve(dirRole, 'briefs');
      mkdirSync(dirBriefs, { recursive: true });
      writeFileSync(
        resolve(dirBriefs, 'heavy.md'),
        '# heavy brief\n\n'.concat('a sentence that costs tokens. '.repeat(40)),
      );
      writeFileSync(
        resolve(dirRole, 'boot.yml'),
        'budget:\n  tokens: 20\nalways:\n  briefs:\n    say:\n      - briefs/*.md\n',
      );

      // the registry must DECLARE the spec, or gate 1 has no budget to read
      writeFileSync(
        resolve(tempRepo.path, 'index.js'),
        `
const path = require('path');
const packageRoot = __dirname;
const registry = {
  slug: 'test',
  readme: { uri: path.join(packageRoot, 'readme.md') },
  roles: [
    {
      slug: 'mechanic',
      name: 'Mechanic',
      purpose: 'fix things',
      readme: { uri: path.join(packageRoot, 'roles/mechanic/readme.md') },
      traits: [],
      boot: { uri: path.join(packageRoot, 'roles/mechanic/boot.yml') },
      briefs: { dirs: { uri: path.join(packageRoot, 'roles/mechanic/briefs') } },
      skills: {
        dirs: { uri: path.join(packageRoot, 'roles/mechanic/skills') },
        refs: [],
      },
      hooks: {
        onBrain: {
          onBoot: [
            {
              command: './node_modules/.bin/rhachet run --skill say-hello',
              timeout: 'PT60S',
            },
          ],
        },
      },
    },
  ],
};
exports.getRoleRegistry = () => registry;
`,
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

      // exit 2: the spec is the author's own file, so the author settles it (`rule.require.exit-code-semantics`)
      then('exits with status 2 — the author settles it, not us', () => {
        expect(result.status).toEqual(2);
      });

      // the halt refuses before it renders, so stdout holds no payload
      then('stdout carries no payload — the halt spent naught', () => {
        expect(result.stdout).not.toContain('heavy.md');
      });

      then('stderr names this gate, and the role it refused', () => {
        expect(result.stderr).toContain('repo introspect');
        expect(result.stderr).toContain('role=mechanic');
      });

      // the halt names the spec path, since the author can write it
      then('🔴 stderr names the SPEC PATH the author must open', () => {
        expect(result.stderr).toContain('roles/mechanic/boot.yml');
      });

      // the snapshot masks the temp dir, so only this assertion catches an absolute path
      then('the spec path is repo-relative — no absolute prefix', () => {
        expect(result.stderr).not.toContain(`${repo.path}/roles`);
      });

      // the strategies sort cheapest-first by cost to the reader
      then('stderr names the four strategies, cheapest first', () => {
        const at = (word: string): number => result.stderr.indexOf(word);
        expect(at('catalogize')).toBeGreaterThan(-1);
        expect(at('catalogize')).toBeLessThan(at('condense'));
        expect(at('condense')).toBeLessThan(at('reference'));
        expect(at('reference')).toBeLessThan(at('eliminate'));
      });

      // the gate sees cost, never value, so it ranks no resource
      then('stderr names NO individual resource — the choice is the author’s', () => {
        expect(result.stderr).not.toContain('heavy.md');
        expect(result.stderr).toContain('you choose which');
      });

      // `narrow` is a subject-mode remedy; this spec is `all` mode
      then('stderr omits `narrow` — this spec is not subject-scoped', () => {
        expect(result.stderr).not.toContain('narrow');
      });

      then('the whole refusal matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  /**
   * .what = a role that boots itself from a hook is refused at publish
   * .why = briefs reach a session through the brain dir boot.md render, so a `roles boot
   *   --role` hook is redundant. consumers already drop it before their settings write; the
   *   supplier's publish is where the fix is owned, so the refusal lands there
   */
  given('[case12] rhachet-roles package whose role boots itself from a hook', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = await genTestTempRepo({ fixture: 'with-roles-package' });
      writeFileSync(
        resolve(tempRepo.path, 'index.js'),
        `
const path = require('path');
const packageRoot = __dirname;
const registry = {
  slug: 'test',
  readme: { uri: path.join(packageRoot, 'readme.md') },
  roles: [
    {
      slug: 'mechanic',
      name: 'Mechanic',
      purpose: 'fix things',
      readme: { uri: path.join(packageRoot, 'roles/mechanic/readme.md') },
      traits: [],
      briefs: { dirs: { uri: path.join(packageRoot, 'roles/mechanic/briefs') } },
      skills: {
        dirs: { uri: path.join(packageRoot, 'roles/mechanic/skills') },
        refs: [],
      },
      hooks: {
        onBrain: {
          onBoot: [
            {
              command: './node_modules/.bin/rhachet roles boot --manifest .behavior/boot.yml',
              timeout: 'PT60S',
            },
            {
              command: './node_modules/.bin/rhachet roles boot --role mechanic',
              timeout: 'PT60S',
            },
          ],
        },
      },
    },
  ],
};
exports.getRoleRegistry = () => registry;
`,
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

      // the hook is the supplier's own declaration, so the fix is theirs — exit 2
      then('exits with status 2', () => {
        expect(result.status).toEqual(2);
      });

      then('stderr names the class, the role, and the hook', () => {
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stderr).toContain('hooks that boot their own role');
        expect(result.stderr).toContain('mechanic');
        expect(result.stderr).toContain('onBrain.onBoot[1]');
      });

      // a `--manifest` boot carries a payload boot.md never renders, so it is not flagged
      then('stderr does not flag the --manifest boot', () => {
        expect(result.stderr).not.toContain('onBrain.onBoot[0]');
        expect(result.stderr).not.toContain('--manifest');
      });

      then('no manifest is written', () => {
        expect(existsSync(resolve(repo.path, 'rhachet.repo.yml'))).toBe(false);
      });

      then('error output matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });
});
