import { Command } from 'commander';
import { getError, given, then, when } from 'test-fns';
import { z } from 'zod';

import { genMockContextConfigOfUsage } from '@src/.test/genMockContextConfigOfUsage';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import { Role } from '@src/domain.objects/Role';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';

import { invokeAct } from './invokeAct';

// mock filesystem dependencies for CLI unit tests
jest.mock('@src/domain.operations/invoke/discoverSkillExecutables', () => ({
  discoverSkillExecutables: jest
    .fn()
    .mockReturnValue([
      { path: '/fake/.agent/skills/summarize.sh', name: 'summarize.sh' },
    ]),
}));

jest.mock('@src/domain.operations/role/getRoleBriefs', () => ({
  getRoleBriefs: jest.fn().mockResolvedValue([]),
}));

describe('invokeAct', () => {
  // create test role
  const testRole = new Role({
    slug: 'tester',
    name: 'Tester',
    purpose: 'test role for CLI tests',
    readme: { uri: '.test/readme.md' }, // 'a role for testing invokeAct',
    traits: [],
    skills: {
      rigid: {
        summarize: {
          input: z.object({ content: z.string() }),
          output: z.object({ summary: z.string() }),
        },
      },
      dirs: { uri: '.agent/repo=.this/role=tester/skills' },
      refs: [],
    },
    briefs: { dirs: { uri: '.agent/repo=.this/role=tester/briefs' } },
  });

  // create mock brain
  // note: slug is the full namespaced identifier (e.g., 'anthropic/claude')
  const mockBrain = {
    repo: 'anthropic',
    slug: 'anthropic/claude',
    description: 'mock brain for tests',
    act: jest.fn().mockResolvedValue({ summary: 'test summary' }),
    ask: jest.fn().mockResolvedValue('test response'),
  } as unknown as BrainRepl;

  // create mock registry
  const mockRegistry: RoleRegistry = {
    slug: '.this',
    readme: { uri: '.test/readme.md' },
    roles: [testRole],
  };

  given('invokeAct is registered on a CLI program', () => {
    let program: Command;
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
      program = new Command();
      program.exitOverride(); // prevent process.exit
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.clearAllMocks();

      // register with mock context
      const mockContext = genMockContextConfigOfUsage({
        isExplicit: true,
        explicitPath: '/fake/rhachet.use.ts',
        registries: [mockRegistry],
        brains: [mockBrain],
        hooks: null,
      });
      invokeAct({ program }, mockContext);
    });

    afterEach(() => {
      logSpy.mockRestore();
    });

    when('act command is called with valid args', () => {
      then('executes the skill with brain', async () => {
        await program.parseAsync(
          [
            'act',
            '--role',
            'tester',
            '--skill',
            'summarize',
            '--input',
            '{"content":"hello"}',
          ],
          { from: 'user' },
        );

        expect(mockBrain.act).toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'act rigid skill repo=.this/role=tester/skill=summarize',
          ),
        );
      });
    });

    when('act command is called with explicit brain ref', () => {
      then('uses the specified brain', async () => {
        await program.parseAsync(
          [
            'act',
            '--role',
            'tester',
            '--skill',
            'summarize',
            '--brain',
            'anthropic/claude',
            '--input',
            '{"content":"hello"}',
          ],
          { from: 'user' },
        );

        expect(mockBrain.act).toHaveBeenCalled();
      });
    });

    when('act command is called with invalid brain format', () => {
      then('throws error about format', async () => {
        const error = await getError(() =>
          program.parseAsync(
            [
              'act',
              '--role',
              'tester',
              '--skill',
              'summarize',
              '--brain',
              'invalid',
              '--input',
              '{"content":"hello"}',
            ],
            { from: 'user' },
          ),
        );

        expect(error).toBeDefined();
        expect(error.message).toContain('invalid brain format');
      });
    });

    when('act command is called with nonexistent role', () => {
      then('throws error about role not found', async () => {
        const error = await getError(() =>
          program.parseAsync(
            [
              'act',
              '--role',
              'nonexistent',
              '--skill',
              'summarize',
              '--input',
              '{"content":"hello"}',
            ],
            { from: 'user' },
          ),
        );

        expect(error).toBeDefined();
        expect(error.message).toContain('no role named');
      });
    });
  });

  given('invokeAct with no brains available', () => {
    let program: Command;

    beforeEach(() => {
      program = new Command();
      program.exitOverride();

      // register with mock context that has no brains
      const noBrainsContext = genMockContextConfigOfUsage({
        isExplicit: true,
        explicitPath: '/fake/rhachet.use.ts',
        registries: [mockRegistry],
        brains: [],
        hooks: null,
      });
      invokeAct({ program }, noBrainsContext);
    });

    when('act command is called', () => {
      then('throws error about no brains', async () => {
        const error = await getError(() =>
          program.parseAsync(
            [
              'act',
              '--role',
              'tester',
              '--skill',
              'summarize',
              '--input',
              '{"content":"hello"}',
            ],
            { from: 'user' },
          ),
        );

        expect(error).toBeDefined();
        expect(error.message).toContain('no brains available');
      });
    });
  });
});
