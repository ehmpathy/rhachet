import { given, then, when } from 'test-fns';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { discoverInitExecutables } from './discoverInitExecutables';

describe('discoverInitExecutables.integration', () => {
  const testDir = resolve(
    __dirname,
    './.temp/discoverInitExecutables.integration',
  );
  const originalCwd = process.cwd();

  beforeAll(() => {
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

  given('broken symlink in inits directory', () => {
    beforeEach(() => {
      const initsDir = resolve(testDir, '.agent/repo=.this/role=any/inits');
      mkdirSync(initsDir, { recursive: true });

      // create a valid init
      writeFileSync(
        resolve(initsDir, 'valid-init.sh'),
        '#!/usr/bin/env bash\necho valid',
      );
      chmodSync(resolve(initsDir, 'valid-init.sh'), '755');

      // create a broken symlink (points to nonexistent target)
      symlinkSync(
        resolve(initsDir, 'nonexistent-target.sh'),
        resolve(initsDir, 'broken-link.sh'),
      );
    });

    when('init discovery runs', () => {
      then('does not throw ENOENT error', () => {
        expect(() => discoverInitExecutables({})).not.toThrow();
      });

      then('ignores broken symlink and finds valid init', () => {
        const result = discoverInitExecutables({});
        expect(result).toHaveLength(1);
        expect(result[0]?.slug).toBe('valid-init');
      });
    });
  });

  given('broken symlink in nested inits subdirectory (claude.hooks)', () => {
    beforeEach(() => {
      const nestedDir = resolve(
        testDir,
        '.agent/repo=.this/role=any/inits/claude.hooks',
      );
      mkdirSync(nestedDir, { recursive: true });

      // create a valid nested init
      writeFileSync(
        resolve(nestedDir, 'sessionstart.sh'),
        '#!/usr/bin/env bash\necho hook',
      );
      chmodSync(resolve(nestedDir, 'sessionstart.sh'), '755');

      // create a broken symlink in nested dir
      symlinkSync(
        resolve(nestedDir, 'nonexistent.sh'),
        resolve(nestedDir, 'broken.sh'),
      );
    });

    when('init discovery runs', () => {
      then('ignores broken symlink in nested directory', () => {
        const result = discoverInitExecutables({});
        expect(result).toHaveLength(1);
        expect(result[0]?.slug).toBe('claude.hooks/sessionstart');
      });
    });
  });

  given('broken symlink to entire inits directory', () => {
    beforeEach(() => {
      const roleDir = resolve(testDir, '.agent/repo=.this/role=any');
      mkdirSync(roleDir, { recursive: true });

      // create broken symlink for inits directory
      symlinkSync(
        resolve(roleDir, 'nonexistent-inits-source'),
        resolve(roleDir, 'inits'),
      );
    });

    when('init discovery runs', () => {
      then('handles broken inits directory symlink gracefully', () => {
        expect(() => discoverInitExecutables({})).not.toThrow();
        const result = discoverInitExecutables({});
        expect(result).toEqual([]);
      });
    });
  });

  given('mixed valid and broken symlinks across repos', () => {
    beforeEach(() => {
      // repo=.this with valid init
      const thisInitsDir = resolve(testDir, '.agent/repo=.this/role=any/inits');
      mkdirSync(thisInitsDir, { recursive: true });
      writeFileSync(
        resolve(thisInitsDir, 'local.sh'),
        '#!/usr/bin/env bash\necho local',
      );
      chmodSync(resolve(thisInitsDir, 'local.sh'), '755');

      // repo=ehmpathy with broken symlink
      const ehmpathyInitsDir = resolve(
        testDir,
        '.agent/repo=ehmpathy/role=mechanic/inits',
      );
      mkdirSync(ehmpathyInitsDir, { recursive: true });
      symlinkSync(
        resolve(ehmpathyInitsDir, 'nonexistent.sh'),
        resolve(ehmpathyInitsDir, 'broken.sh'),
      );
      writeFileSync(
        resolve(ehmpathyInitsDir, 'remote.sh'),
        '#!/usr/bin/env bash\necho remote',
      );
      chmodSync(resolve(ehmpathyInitsDir, 'remote.sh'), '755');
    });

    when('init discovery runs', () => {
      then('finds valid inits from both repos, ignores broken symlinks', () => {
        const result = discoverInitExecutables({});
        expect(result).toHaveLength(2);
        expect(result.map((s) => s.slug).sort()).toEqual(['local', 'remote']);
      });
    });
  });
});
