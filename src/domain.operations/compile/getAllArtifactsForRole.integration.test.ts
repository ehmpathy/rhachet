import { given, then, when } from 'test-fns';

import type { Role } from '@src/domain.objects/Role';

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { getAllArtifactsForRole } from './getAllArtifactsForRole';

describe('getAllArtifactsForRole.integration', () => {
  const testDir = resolve(
    __dirname,
    './.temp/getAllArtifactsForRole.integration',
  );

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
   * helper to create test files
   */
  const createFiles = (files: string[]): void => {
    for (const file of files) {
      const fullPath = resolve(testDir, file);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, `content of ${file}`);
    }
  };

  /**
   * helper to build a role object for testing
   */
  const buildRole = (input: {
    slug: string;
    briefsDirs?: string[];
    skillsDirs?: string[];
    initsDirs?: string[];
    readmeUri?: string;
    bootUri?: string;
    keyrackUri?: string;
  }): Role =>
    ({
      slug: input.slug,
      briefs: input.briefsDirs
        ? { dirs: input.briefsDirs.map((uri) => ({ uri })) }
        : undefined,
      skills: input.skillsDirs
        ? { dirs: input.skillsDirs.map((uri) => ({ uri })) }
        : undefined,
      inits: input.initsDirs
        ? { dirs: input.initsDirs.map((uri) => ({ uri })) }
        : undefined,
      readme: input.readmeUri ? { uri: input.readmeUri } : undefined,
      boot: input.bootUri ? { uri: input.bootUri } : undefined,
      keyrack: input.keyrackUri ? { uri: input.keyrackUri } : undefined,
    }) as Role;

  // === data-driven test cases ===

  const TEST_CASES = [
    // === briefs dirs ===
    {
      description: 'collects briefs from single dir',
      given: {
        files: ['briefs/rule.md', 'briefs/guide.md'],
        role: {
          slug: 'test-role',
          briefsDirs: ['briefs'],
        },
      },
      expect: { artifacts: ['briefs/guide.md', 'briefs/rule.md'] },
    },
    {
      description: 'collects briefs from multiple dirs',
      given: {
        files: ['briefs1/rule.md', 'briefs2/guide.md'],
        role: {
          slug: 'test-role',
          briefsDirs: ['briefs1', 'briefs2'],
        },
      },
      expect: { artifacts: ['briefs1/rule.md', 'briefs2/guide.md'] },
    },
    {
      description: 'collects .min files as briefs',
      given: {
        files: ['briefs/rule.md', 'briefs/condensed.min'],
        role: {
          slug: 'test-role',
          briefsDirs: ['briefs'],
        },
      },
      expect: { artifacts: ['briefs/condensed.min', 'briefs/rule.md'] },
    },

    // === skills dirs ===
    {
      description: 'collects skills from single dir',
      given: {
        files: ['skills/tool.sh', 'skills/config.jsonc'],
        role: {
          slug: 'test-role',
          skillsDirs: ['skills'],
        },
      },
      expect: { artifacts: ['skills/config.jsonc', 'skills/tool.sh'] },
    },
    {
      description: 'collects skills from multiple dirs',
      given: {
        files: ['skills1/tool.sh', 'skills2/config.jsonc'],
        role: {
          slug: 'test-role',
          skillsDirs: ['skills1', 'skills2'],
        },
      },
      expect: { artifacts: ['skills1/tool.sh', 'skills2/config.jsonc'] },
    },
    {
      description: 'collects template dirs in skills',
      given: {
        files: ['skills/template/file.txt', 'skills/templates/other.txt'],
        role: {
          slug: 'test-role',
          skillsDirs: ['skills'],
        },
      },
      expect: {
        artifacts: ['skills/template/file.txt', 'skills/templates/other.txt'],
      },
    },

    // === inits dirs ===
    {
      description: 'collects inits from single dir',
      given: {
        files: ['inits/setup.sh', 'inits/config.jsonc'],
        role: {
          slug: 'test-role',
          initsDirs: ['inits'],
        },
      },
      expect: { artifacts: ['inits/config.jsonc', 'inits/setup.sh'] },
    },

    // === role-level files ===
    {
      description: 'collects readme when present',
      given: {
        files: ['readme.md'],
        role: {
          slug: 'test-role',
          readmeUri: 'readme.md',
        },
      },
      expect: { artifacts: ['readme.md'] },
    },
    {
      description: 'collects boot when present',
      given: {
        files: ['boot.yml'],
        role: {
          slug: 'test-role',
          bootUri: 'boot.yml',
        },
      },
      expect: { artifacts: ['boot.yml'] },
    },
    {
      description: 'collects keyrack when present',
      given: {
        files: ['keyrack.yml'],
        role: {
          slug: 'test-role',
          keyrackUri: 'keyrack.yml',
        },
      },
      expect: { artifacts: ['keyrack.yml'] },
    },
    {
      description: 'skips absent role-level files',
      given: {
        files: ['briefs/rule.md'],
        role: {
          slug: 'test-role',
          briefsDirs: ['briefs'],
          readmeUri: 'readme.md', // file not created
        },
      },
      expect: { artifacts: ['briefs/rule.md'] },
    },

    // === combined dirs and role files ===
    {
      description: 'collects all artifact types',
      given: {
        files: [
          'briefs/rule.md',
          'skills/tool.sh',
          'inits/setup.sh',
          'readme.md',
          'boot.yml',
          'keyrack.yml',
        ],
        role: {
          slug: 'test-role',
          briefsDirs: ['briefs'],
          skillsDirs: ['skills'],
          initsDirs: ['inits'],
          readmeUri: 'readme.md',
          bootUri: 'boot.yml',
          keyrackUri: 'keyrack.yml',
        },
      },
      expect: {
        artifacts: [
          'boot.yml',
          'briefs/rule.md',
          'inits/setup.sh',
          'keyrack.yml',
          'readme.md',
          'skills/tool.sh',
        ],
      },
    },

    // === exclusions ===
    {
      description: 'excludes .test dir by default',
      given: {
        files: ['briefs/rule.md', 'briefs/.test/fixture.md'],
        role: {
          slug: 'test-role',
          briefsDirs: ['briefs'],
        },
      },
      expect: { artifacts: ['briefs/rule.md'] },
    },
    {
      description: 'excludes *.test.* files by default',
      given: {
        files: ['briefs/rule.md', 'briefs/rule.test.md'],
        role: {
          slug: 'test-role',
          briefsDirs: ['briefs'],
        },
      },
      expect: { artifacts: ['briefs/rule.md'] },
    },
    {
      description: 'excludes .route dir by default',
      given: {
        files: ['briefs/rule.md', 'briefs/.route/state.json'],
        role: {
          slug: 'test-role',
          briefsDirs: ['briefs'],
        },
      },
      expect: { artifacts: ['briefs/rule.md'] },
    },
    {
      description: 'excludes .scratch dir by default',
      given: {
        files: ['briefs/rule.md', 'briefs/.scratch/draft.md'],
        role: {
          slug: 'test-role',
          briefsDirs: ['briefs'],
        },
      },
      expect: { artifacts: ['briefs/rule.md'] },
    },
    {
      description: 'excludes .behavior dir by default',
      given: {
        files: ['briefs/rule.md', 'briefs/.behavior/spec.md'],
        role: {
          slug: 'test-role',
          briefsDirs: ['briefs'],
        },
      },
      expect: { artifacts: ['briefs/rule.md'] },
    },
    {
      description: 'excludes dotfiles by default',
      given: {
        files: ['briefs/rule.md', 'briefs/.hidden.md'],
        role: {
          slug: 'test-role',
          briefsDirs: ['briefs'],
        },
      },
      expect: { artifacts: ['briefs/rule.md'] },
    },

    // === user overrides ===
    {
      description: 'user include rescues from default exclusion',
      given: {
        files: ['briefs/rule.md', 'briefs/rule.test.md'],
        role: {
          slug: 'test-role',
          briefsDirs: ['briefs'],
        },
        include: ['**/*.test.md'],
      },
      expect: { artifacts: ['briefs/rule.md', 'briefs/rule.test.md'] },
    },
    {
      description: 'user exclude removes from output',
      given: {
        files: ['briefs/rule.md', 'briefs/draft.md'],
        role: {
          slug: 'test-role',
          briefsDirs: ['briefs'],
        },
        exclude: ['**/draft.md'],
      },
      expect: { artifacts: ['briefs/rule.md'] },
    },

    // === empty cases ===
    {
      description: 'returns empty for role with no dirs',
      given: {
        files: ['briefs/rule.md'],
        role: {
          slug: 'test-role',
        },
      },
      expect: { artifacts: [] },
    },
    {
      description: 'returns empty for empty dir',
      given: {
        files: [], // dir created but empty
        role: {
          slug: 'test-role',
          briefsDirs: ['briefs'],
        },
        createEmptyDirs: ['briefs'],
      },
      expect: { artifacts: [] },
    },
  ];

  // generate tests from data
  given('role artifact collection', () => {
    TEST_CASES.forEach((testCase, index) => {
      when(`[t${index}] ${testCase.description}`, () => {
        then('returns expected artifacts', async () => {
          // create test files
          createFiles(testCase.given.files);

          // create empty dirs if specified
          if (
            'createEmptyDirs' in testCase.given &&
            testCase.given.createEmptyDirs
          ) {
            for (const dir of testCase.given.createEmptyDirs as string[]) {
              mkdirSync(join(testDir, dir), { recursive: true });
            }
          }

          // build role
          const role = buildRole(testCase.given.role);

          // run function
          const result = await getAllArtifactsForRole({
            role,
            fromDir: testDir,
            include:
              'include' in testCase.given
                ? (testCase.given.include as string[])
                : undefined,
            exclude:
              'exclude' in testCase.given
                ? (testCase.given.exclude as string[])
                : undefined,
          });

          // assert
          expect(result.sort()).toEqual(testCase.expect.artifacts.sort());
        });
      });
    });
  });

  // === error cases ===
  given('error handling', () => {
    when('[e0] briefs dir not found', () => {
      then('throws BadRequestError', async () => {
        const role = buildRole({
          slug: 'test-role',
          briefsDirs: ['nonexistent'],
        });

        await expect(
          getAllArtifactsForRole({ role, fromDir: testDir }),
        ).rejects.toThrow('briefs dir not found');
      });
    });

    when('[e1] skills dir not found', () => {
      then('throws BadRequestError', async () => {
        const role = buildRole({
          slug: 'test-role',
          skillsDirs: ['nonexistent'],
        });

        await expect(
          getAllArtifactsForRole({ role, fromDir: testDir }),
        ).rejects.toThrow('skills dir not found');
      });
    });

    when('[e2] inits dir not found', () => {
      then('throws BadRequestError', async () => {
        const role = buildRole({
          slug: 'test-role',
          initsDirs: ['nonexistent'],
        });

        await expect(
          getAllArtifactsForRole({ role, fromDir: testDir }),
        ).rejects.toThrow('inits dir not found');
      });
    });
  });
});
