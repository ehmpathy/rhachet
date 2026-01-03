import { getError, given, then, when } from 'test-fns';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { findUniqueInitExecutable } from './findUniqueInitExecutable';

describe('findUniqueInitExecutable', () => {
  const testDir = resolve(__dirname, './.temp/findUniqueInitExecutable');
  const originalCwd = process.cwd();

  beforeAll(() => {
    // create test directory
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
  });

  beforeEach(() => {
    // clean up .agent directory before each test
    const agentDir = resolve(testDir, '.agent');
    if (existsSync(agentDir)) {
      rmSync(agentDir, { recursive: true, force: true });
    }
  });

  given('init exists in exactly one location', () => {
    beforeEach(() => {
      const initsDir = resolve(testDir, '.agent/repo=.this/role=any/inits');
      mkdirSync(initsDir, { recursive: true });
      writeFileSync(
        resolve(initsDir, 'init.claude.sh'),
        '#!/usr/bin/env bash\necho init',
      );
      chmodSync(resolve(initsDir, 'init.claude.sh'), '755');
    });

    when('finding by slugInit only', () => {
      then('returns the unique init', () => {
        const result = findUniqueInitExecutable({ slugInit: 'init.claude' });
        expect(result.slug).toBe('init.claude');
        expect(result.slugRepo).toBe('.this');
        expect(result.slugRole).toBe('any');
      });
    });

    when('finding with explicit repo filter', () => {
      then('returns the init', () => {
        const result = findUniqueInitExecutable({
          slugInit: 'init.claude',
          slugRepo: '.this',
        });
        expect(result.slug).toBe('init.claude');
      });
    });

    when('finding with explicit role filter', () => {
      then('returns the init', () => {
        const result = findUniqueInitExecutable({
          slugInit: 'init.claude',
          slugRole: 'any',
        });
        expect(result.slug).toBe('init.claude');
      });
    });
  });

  given('nested init exists (key usecase for --command)', () => {
    beforeEach(() => {
      const nestedDir = resolve(
        testDir,
        '.agent/repo=ehmpathy/role=mechanic/inits/claude.hooks',
      );
      mkdirSync(nestedDir, { recursive: true });
      writeFileSync(
        resolve(nestedDir, 'sessionstart.notify-permissions.sh'),
        '#!/usr/bin/env bash\necho notify',
      );
      chmodSync(
        resolve(nestedDir, 'sessionstart.notify-permissions.sh'),
        '755',
      );
    });

    when('finding by full nested path slug', () => {
      then('returns the nested init', () => {
        const result = findUniqueInitExecutable({
          slugInit: 'claude.hooks/sessionstart.notify-permissions',
        });
        expect(result.slug).toBe(
          'claude.hooks/sessionstart.notify-permissions',
        );
        expect(result.slugRepo).toBe('ehmpathy');
        expect(result.slugRole).toBe('mechanic');
      });
    });

    when('finding by partial path (should fail)', () => {
      then('throws error about not found', async () => {
        const error = await getError(() =>
          findUniqueInitExecutable({
            slugInit: 'sessionstart.notify-permissions',
          }),
        );
        expect(error?.message).toContain(
          'no init "sessionstart.notify-permissions" found',
        );
      });
    });
  });

  given('init does not exist but other inits do', () => {
    beforeEach(() => {
      const initsDir = resolve(testDir, '.agent/repo=.this/role=any/inits');
      mkdirSync(initsDir, { recursive: true });
      writeFileSync(resolve(initsDir, 'init.claude.sh'), '#!/usr/bin/env bash');
      writeFileSync(
        resolve(initsDir, 'init.permissions.sh'),
        '#!/usr/bin/env bash',
      );
      writeFileSync(resolve(initsDir, 'init.hooks.sh'), '#!/usr/bin/env bash');
      chmodSync(resolve(initsDir, 'init.claude.sh'), '755');
      chmodSync(resolve(initsDir, 'init.permissions.sh'), '755');
      chmodSync(resolve(initsDir, 'init.hooks.sh'), '755');
    });

    when('finding nonexistent init', () => {
      then('error lists available inits', async () => {
        const error = await getError(() =>
          findUniqueInitExecutable({ slugInit: 'nonexistent' }),
        );
        expect(error?.message).toContain('available inits:');
        expect(error?.message).toContain('init.claude');
        expect(error?.message).toContain('init.permissions');
        expect(error?.message).toContain('init.hooks');
      });

      then('error includes tip about linking roles', async () => {
        const error = await getError(() =>
          findUniqueInitExecutable({ slugInit: 'nonexistent' }),
        );
        expect(error?.message).toContain('tip:');
        expect(error?.message).toContain('npx rhachet roles link');
        expect(error?.message).toContain('--role');
      });
    });
  });

  given('init does not exist', () => {
    beforeEach(() => {
      // create empty .agent structure
      mkdirSync(resolve(testDir, '.agent/repo=.this/role=any/inits'), {
        recursive: true,
      });
    });

    when('finding nonexistent init', () => {
      then('throws error with init name', async () => {
        const error = await getError(() =>
          findUniqueInitExecutable({ slugInit: 'nonexistent' }),
        );
        expect(error?.message).toContain('no init "nonexistent" found');
      });

      then('error mentions "any linked role"', async () => {
        const error = await getError(() =>
          findUniqueInitExecutable({ slugInit: 'nonexistent' }),
        );
        expect(error?.message).toContain('in any linked role');
      });
    });

    when('finding with repo filter that has no match', () => {
      then('error mentions the repo filter', async () => {
        const error = await getError(() =>
          findUniqueInitExecutable({
            slugInit: 'nonexistent',
            slugRepo: '.this',
          }),
        );
        expect(error?.message).toContain('--repo .this');
      });
    });

    when('finding with role filter that has no match', () => {
      then('error mentions the role filter', async () => {
        const error = await getError(() =>
          findUniqueInitExecutable({
            slugInit: 'nonexistent',
            slugRole: 'any',
          }),
        );
        expect(error?.message).toContain('--role any');
      });
    });

    when('finding with both repo and role filters', () => {
      then('error mentions both filters', async () => {
        const error = await getError(() =>
          findUniqueInitExecutable({
            slugInit: 'nonexistent',
            slugRepo: '.this',
            slugRole: 'any',
          }),
        );
        expect(error?.message).toContain('--repo .this');
        expect(error?.message).toContain('--role any');
      });
    });
  });

  given('init exists in multiple locations', () => {
    beforeEach(() => {
      // same init in two roles
      const dirs = [
        '.agent/repo=.this/role=mechanic/inits',
        '.agent/repo=.this/role=designer/inits',
      ];

      for (const dir of dirs) {
        mkdirSync(resolve(testDir, dir), { recursive: true });
        writeFileSync(
          resolve(testDir, dir, 'init.claude.sh'),
          '#!/usr/bin/env bash',
        );
        chmodSync(resolve(testDir, dir, 'init.claude.sh'), '755');
      }
    });

    when('finding without disambiguation', () => {
      then('throws error about multiple matches', async () => {
        const error = await getError(() =>
          findUniqueInitExecutable({ slugInit: 'init.claude' }),
        );
        expect(error?.message).toContain('multiple inits found');
      });

      then('error lists all matching locations', async () => {
        const error = await getError(() =>
          findUniqueInitExecutable({ slugInit: 'init.claude' }),
        );
        expect(error?.message).toContain('role=mechanic');
        expect(error?.message).toContain('role=designer');
      });

      then('error suggests disambiguation flags', async () => {
        const error = await getError(() =>
          findUniqueInitExecutable({ slugInit: 'init.claude' }),
        );
        expect(error?.message).toContain('--repo');
        expect(error?.message).toContain('--role');
      });
    });

    when('disambiguating with slugRole', () => {
      then('returns the correct init', () => {
        const result = findUniqueInitExecutable({
          slugInit: 'init.claude',
          slugRole: 'mechanic',
        });
        expect(result.slug).toBe('init.claude');
        expect(result.slugRole).toBe('mechanic');
      });
    });
  });

  given('init exists in multiple repos', () => {
    beforeEach(() => {
      // same init in two repos
      const dirs = [
        '.agent/repo=.this/role=any/inits',
        '.agent/repo=ehmpathy/role=mechanic/inits',
      ];

      for (const dir of dirs) {
        mkdirSync(resolve(testDir, dir), { recursive: true });
        writeFileSync(
          resolve(testDir, dir, 'init.claude.sh'),
          '#!/usr/bin/env bash',
        );
        chmodSync(resolve(testDir, dir, 'init.claude.sh'), '755');
      }
    });

    when('finding without disambiguation', () => {
      then('throws error about multiple matches', async () => {
        const error = await getError(() =>
          findUniqueInitExecutable({ slugInit: 'init.claude' }),
        );
        expect(error?.message).toContain('multiple inits found');
      });

      then('error lists both repos', async () => {
        const error = await getError(() =>
          findUniqueInitExecutable({ slugInit: 'init.claude' }),
        );
        expect(error?.message).toContain('repo=.this');
        expect(error?.message).toContain('repo=ehmpathy');
      });
    });

    when('disambiguating with slugRepo', () => {
      then('returns the correct init', () => {
        const result = findUniqueInitExecutable({
          slugInit: 'init.claude',
          slugRepo: 'ehmpathy',
        });
        expect(result.slug).toBe('init.claude');
        expect(result.slugRepo).toBe('ehmpathy');
      });
    });
  });

  given('init only in external repo (not .this)', () => {
    beforeEach(() => {
      const initsDir = resolve(
        testDir,
        '.agent/repo=ehmpathy/role=mechanic/inits',
      );
      mkdirSync(initsDir, { recursive: true });
      writeFileSync(
        resolve(initsDir, 'init.claude.sh'),
        '#!/usr/bin/env bash\necho init',
      );
      chmodSync(resolve(initsDir, 'init.claude.sh'), '755');
    });

    when('finding by slugInit only', () => {
      then('returns the init from external repo', () => {
        const result = findUniqueInitExecutable({ slugInit: 'init.claude' });
        expect(result.slug).toBe('init.claude');
        expect(result.slugRepo).toBe('ehmpathy');
        expect(result.slugRole).toBe('mechanic');
      });
    });

    when('finding with explicit external slugRepo', () => {
      then('returns the init', () => {
        const result = findUniqueInitExecutable({
          slugInit: 'init.claude',
          slugRepo: 'ehmpathy',
        });
        expect(result.slugRepo).toBe('ehmpathy');
      });
    });

    when('finding with wrong slugRepo filter', () => {
      then('throws error mentioning the filter', async () => {
        const error = await getError(() =>
          findUniqueInitExecutable({
            slugInit: 'init.claude',
            slugRepo: '.this',
          }),
        );
        expect(error?.message).toContain('no init "init.claude" found');
        expect(error?.message).toContain('--repo .this');
      });
    });
  });

  given('no .agent directory exists', () => {
    when('finding any init', () => {
      then('throws helpful error', async () => {
        const error = await getError(() =>
          findUniqueInitExecutable({ slugInit: 'anything' }),
        );
        expect(error?.message).toContain('no init "anything" found');
      });
    });
  });
});
