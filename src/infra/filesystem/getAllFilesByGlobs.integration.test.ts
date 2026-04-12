import { given, then, when } from 'test-fns';

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { getAllFilesByGlobs } from './getAllFilesByGlobs';

describe('getAllFilesByGlobs.integration', () => {
  const testDir = resolve(__dirname, './.temp/getAllFilesByGlobs.integration');

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  beforeEach(() => {
    // clean test directory before each test
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * helper to set up test files and run the function
   */
  const runTestCase = async (testCase: {
    files: string[];
    defaultInclude: string[];
    defaultExclude: string[];
    userInclude: string[];
    userExclude: string[];
  }): Promise<string[]> => {
    // create all test files
    for (const file of testCase.files) {
      const fullPath = resolve(testDir, file);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, `content of ${file}`);
    }

    // run the function
    const result = await getAllFilesByGlobs({
      cwd: testDir,
      defaultInclude: testCase.defaultInclude,
      defaultExclude: testCase.defaultExclude,
      userInclude: testCase.userInclude,
      userExclude: testCase.userExclude,
    });

    // convert absolute paths to relative for easier assertions
    return result.map((f) => relative(testDir, f)).sort();
  };

  // === data-driven precedence test cases ===

  const TEST_CASES_PRECEDENCE = [
    // === default behavior ===
    {
      description: 'default include matches file',
      given: {
        files: ['rule.md'],
        defaultInclude: ['**/*.md'],
        defaultExclude: [],
        userInclude: [],
        userExclude: [],
      },
      expect: { found: ['rule.md'] },
    },
    {
      description: 'default exclude removes file',
      given: {
        files: ['rule.test.md'],
        defaultInclude: ['**/*.md'],
        defaultExclude: ['*.test.*'],
        userInclude: [],
        userExclude: [],
      },
      expect: { found: [] },
    },

    // === user --include extends defaults ===
    {
      description: 'user include adds pattern to defaults',
      given: {
        files: ['rule.md', 'config.yaml'],
        defaultInclude: ['**/*.md'],
        defaultExclude: [],
        userInclude: ['**/*.yaml'],
        userExclude: [],
      },
      expect: { found: ['config.yaml', 'rule.md'] },
    },

    // === RSYNC-STYLE: user --include RESCUES from default exclusions ===
    {
      description:
        'user include rescues test.sh from default *.test.* exclusion',
      given: {
        files: ['tool.sh', 'tool.test.sh'],
        defaultInclude: ['**/*.sh'],
        defaultExclude: ['*.test.*'],
        userInclude: ['**/*.test.sh'],
        userExclude: [],
      },
      expect: { found: ['tool.sh', 'tool.test.sh'] },
    },
    {
      description:
        'user include rescues git.repo.test.sh shell but not .test.ts files',
      given: {
        files: [
          'skills/git.repo.test.sh',
          'skills/git.repo.test.integration.test.ts',
          'skills/sedreplace.sh',
        ],
        defaultInclude: ['**/*.sh'],
        defaultExclude: ['*.test.*'],
        userInclude: ['**/*.test.sh'],
        userExclude: [],
      },
      expect: {
        found: ['skills/git.repo.test.sh', 'skills/sedreplace.sh'],
      },
    },
    {
      description:
        'user include rescues .test dir from default .test/** exclusion',
      given: {
        files: ['tool.sh', '.test/fixtures/sample.sh'],
        defaultInclude: ['**/*.sh'],
        defaultExclude: ['.test/**'],
        userInclude: ['.test/fixtures/**'],
        userExclude: [],
      },
      expect: { found: ['.test/fixtures/sample.sh', 'tool.sh'] },
    },
    {
      description: 'user include rescues specific file from default exclusion',
      given: {
        files: ['rule.md', 'rule.test.md', 'other.test.md'],
        defaultInclude: ['**/*.md'],
        defaultExclude: ['*.test.*'],
        userInclude: ['rule.test.md'],
        userExclude: [],
      },
      expect: { found: ['rule.md', 'rule.test.md'] },
    },
    {
      description:
        'user include has no effect if file not in default exclusion',
      given: {
        files: ['rule.md'],
        defaultInclude: ['**/*.md'],
        defaultExclude: ['*.test.*'],
        userInclude: ['**/*.md'],
        userExclude: [],
      },
      expect: { found: ['rule.md'] },
    },

    // === user --exclude ALWAYS wins (highest precedence) ===
    {
      description: 'user exclude wins over default include',
      given: {
        files: ['briefs/rule.md', 'skills/tool.sh'],
        defaultInclude: ['**/*.md', '**/*.sh'],
        defaultExclude: [],
        userInclude: [],
        userExclude: ['briefs/**'],
      },
      expect: { found: ['skills/tool.sh'] },
    },
    {
      description: 'user exclude wins over user include',
      given: {
        files: ['special.md'],
        defaultInclude: ['**/*.md'],
        defaultExclude: [],
        userInclude: ['special.md'],
        userExclude: ['special.md'],
      },
      expect: { found: [] },
    },
    {
      description: 'user exclude wins over user include rescue attempt',
      given: {
        files: ['tool.test.sh'],
        defaultInclude: ['**/*.sh'],
        defaultExclude: ['*.test.*'],
        userInclude: ['**/*.test.sh'],
        userExclude: ['**/*.test.sh'],
      },
      expect: { found: [] },
    },

    // === default exclude applies when no user include matches ===
    {
      description: 'default exclude applies without user include',
      given: {
        files: ['.test/fixture.md', 'rule.md'],
        defaultInclude: ['**/*.md'],
        defaultExclude: ['.test/**'],
        userInclude: [],
        userExclude: [],
      },
      expect: { found: ['rule.md'] },
    },
    {
      description: 'default exclude applies to non-rescued files',
      given: {
        files: ['.test/a.md', '.test/b.md', 'rule.md'],
        defaultInclude: ['**/*.md'],
        defaultExclude: ['.test/**'],
        userInclude: ['.test/a.md'],
        userExclude: [],
      },
      expect: { found: ['.test/a.md', 'rule.md'] },
    },

    // === dot files and dirs ===
    {
      description: 'dotfile excluded by default .*',
      given: {
        files: ['.hidden.md', 'visible.md'],
        defaultInclude: ['**/*.md'],
        defaultExclude: ['.*'],
        userInclude: [],
        userExclude: [],
      },
      expect: { found: ['visible.md'] },
    },
    {
      description: 'dotfile rescued by user include',
      given: {
        files: ['.hidden.md', 'visible.md'],
        defaultInclude: ['**/*.md'],
        defaultExclude: ['.*'],
        userInclude: ['.hidden.md'],
        userExclude: [],
      },
      expect: { found: ['.hidden.md', 'visible.md'] },
    },

    // === multiple patterns ===
    {
      description: 'multiple user include patterns rescue multiple exclusions',
      given: {
        files: ['a.test.md', 'b.test.sh', 'c.md'],
        defaultInclude: ['**/*.md', '**/*.sh'],
        defaultExclude: ['*.test.*'],
        userInclude: ['**/*.test.md', '**/*.test.sh'],
        userExclude: [],
      },
      expect: { found: ['a.test.md', 'b.test.sh', 'c.md'] },
    },
    {
      description: 'multiple user exclude patterns all apply',
      given: {
        files: ['a.md', 'vendor/b.md', 'draft/c.md'],
        defaultInclude: ['**/*.md'],
        defaultExclude: [],
        userInclude: [],
        userExclude: ['vendor/**', 'draft/**'],
      },
      expect: { found: ['a.md'] },
    },

    // === nested dirs ===
    {
      description: 'deeply nested file included',
      given: {
        files: ['a/b/c/d/rule.md'],
        defaultInclude: ['**/*.md'],
        defaultExclude: [],
        userInclude: [],
        userExclude: [],
      },
      expect: { found: ['a/b/c/d/rule.md'] },
    },
    {
      description: 'deeply nested excluded file rescued',
      given: {
        files: ['a/b/.test/c/fixture.md'],
        defaultInclude: ['**/*.md'],
        defaultExclude: ['**/.test/**'],
        userInclude: ['**/.test/**/fixture.md'],
        userExclude: [],
      },
      expect: { found: ['a/b/.test/c/fixture.md'] },
    },

    // === empty/edge cases ===
    {
      description: 'no files match include',
      given: {
        files: ['file.txt'],
        defaultInclude: ['**/*.md'],
        defaultExclude: [],
        userInclude: [],
        userExclude: [],
      },
      expect: { found: [] },
    },
    {
      description: 'all files excluded by user',
      given: {
        files: ['a.md', 'b.md'],
        defaultInclude: ['**/*.md'],
        defaultExclude: [],
        userInclude: [],
        userExclude: ['**/*.md'],
      },
      expect: { found: [] },
    },
    {
      description: 'user include cannot rescue from user exclude',
      given: {
        files: ['a.md'],
        defaultInclude: ['**/*.md'],
        defaultExclude: [],
        userInclude: ['a.md'],
        userExclude: ['a.md'],
      },
      expect: { found: [] },
    },
  ];

  // generate tests from data
  given('rsync-style precedence semantics', () => {
    TEST_CASES_PRECEDENCE.forEach((testCase, index) => {
      when(`[t${index}] ${testCase.description}`, () => {
        then('returns expected files', async () => {
          const result = await runTestCase(testCase.given);
          expect(result).toEqual(testCase.expect.found.sort());
        });
      });
    });
  });
});
