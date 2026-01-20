import { Command } from 'commander';
import { genBrainRepl } from 'rhachet-brains-openai';
import { getError, given, then, when } from 'test-fns';
import { z } from 'zod';

import { genMockContextConfigOfUsage } from '@src/.test/genMockContextConfigOfUsage';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import { Role } from '@src/domain.objects/Role';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';

import { EXAMPLE_REPO_WITH_RIGID_SKILL } from '../../../.test/assets/example.repo/directory';
import { testerRole } from '../../../.test/assets/example.repo/repo-with-role-with-rigid-skill/role';
import { invokeAct } from './invokeAct';

describe('invokeAct (integration)', () => {
  given('a CLI program with invokeAct registered (error handling)', () => {
    // create test role with rigid skill schema
    const testRole = new Role({
      slug: 'summarizer',
      name: 'Summarizer',
      purpose: 'test role for invokeAct integration tests',
      readme: { uri: '.test/readme.md' },
      traits: [],
      skills: {
        rigid: {
          summarize: {
            input: z.object({ content: z.string() }),
            output: z.object({ summary: z.string() }),
          },
        },
        dirs: { uri: '.agent/repo=.this/role=summarizer/skills' },
        refs: [],
      },
      briefs: { dirs: { uri: '.agent/repo=.this/role=summarizer/briefs' } },
    });

    const testRegistry: RoleRegistry = {
      slug: '.this',
      readme: { uri: '.test/readme.md' },
      roles: [testRole],
    };

    const program = new Command();
    program.exitOverride(); // prevent process.exit in tests

    // register with mock context that has no brains (to test error handling)
    const mockContext = genMockContextConfigOfUsage({
      isExplicit: true,
      explicitPath: '/fake/rhachet.use.ts',
      registries: [testRegistry],
      brains: [],
      hooks: null,
    });
    invokeAct({ program }, mockContext);

    when('act command is invoked with no brains available', () => {
      then('it throws error about no brains', async () => {
        const args = [
          'act',
          '--role',
          'summarizer',
          '--skill',
          'summarize',
          '--input',
          '{"content":"hello"}',
        ];
        const error = await getError(() =>
          program.parseAsync(args, { from: 'user' }),
        );

        expect(error?.message).toContain('no brains available');
      });
    });

    when('act command is invoked with nonexistent role', () => {
      // need brains for this test to reach the role validation logic
      const programWithBrain = new Command();
      programWithBrain.exitOverride();

      const simpleBrain = {
        repo: 'test',
        slug: 'test/brain',
        description: 'test brain',
        ask: async () => ({ content: '' }),
        act: async () => ({ result: '' }),
      };

      const brainContext = genMockContextConfigOfUsage({
        isExplicit: true,
        explicitPath: '/fake/rhachet.use.ts',
        registries: [testRegistry],
        brains: [simpleBrain as any],
        hooks: null,
      });
      invokeAct({ program: programWithBrain }, brainContext);

      then('it throws error about role not found', async () => {
        const args = [
          'act',
          '--role',
          'nonexistent',
          '--skill',
          'summarize',
          '--input',
          '{"content":"hello"}',
        ];
        const error = await getError(() =>
          programWithBrain.parseAsync(args, { from: 'user' }),
        );

        expect(error?.message).toContain('no role named');
      });
    });

    when('act command is invoked with invalid brain format', () => {
      // need brains for this test to reach the brain validation logic
      const programWithBrain = new Command();
      programWithBrain.exitOverride(); // prevent process.exit in tests

      // create a simple brain-like object (not a mock - just minimum required structure)
      const simpleBrain = {
        repo: 'test',
        slug: 'test/brain',
        description: 'test brain',
        ask: async () => ({ content: '' }),
        act: async () => ({ result: '' }),
      };

      const formatContext = genMockContextConfigOfUsage({
        isExplicit: true,
        explicitPath: '/fake/rhachet.use.ts',
        registries: [testRegistry],
        brains: [simpleBrain as any],
        hooks: null,
      });
      invokeAct({ program: programWithBrain }, formatContext);

      then('it throws error about format', async () => {
        const args = [
          'act',
          '--role',
          'summarizer',
          '--skill',
          'summarize',
          '--brain',
          'invalid-format', // missing slash
          '--input',
          '{"content":"hello"}',
        ];
        const error = await getError(() =>
          programWithBrain.parseAsync(args, { from: 'user' }),
        );

        expect(error?.message).toContain('invalid brain format');
      });
    });

    when('act command is invoked with --attempts but no --output', () => {
      // need brains for this test
      const programWithBrain = new Command();
      programWithBrain.exitOverride(); // prevent process.exit in tests

      const simpleBrain = {
        repo: 'test',
        slug: 'test/brain',
        description: 'test brain',
        ask: async () => ({ content: '' }),
        act: async () => ({ result: '' }),
      };

      const attemptsContext = genMockContextConfigOfUsage({
        isExplicit: true,
        explicitPath: '/fake/rhachet.use.ts',
        registries: [testRegistry],
        brains: [simpleBrain as any],
        hooks: null,
      });
      invokeAct({ program: programWithBrain }, attemptsContext);

      then('it throws error requiring --output', async () => {
        const args = [
          'act',
          '--role',
          'summarizer',
          '--skill',
          'summarize',
          '--attempts',
          '3',
          '--input',
          '{"content":"hello"}',
        ];
        const error = await getError(() =>
          programWithBrain.parseAsync(args, { from: 'user' }),
        );

        expect(error?.message).toContain('--attempts requires --output');
      });
    });
  });

  given(
    'a CLI program with invokeAct registered (happy path with real brain)',
    () => {
      const testAssetDir = EXAMPLE_REPO_WITH_RIGID_SKILL;
      const originalCwd = process.cwd();

      beforeAll(() => {
        // switch to test asset directory for skill discovery
        process.chdir(testAssetDir);
      });

      afterAll(() => {
        process.chdir(originalCwd);
      });

      // create real brain via genBrainRepl
      // note: external brains from npm packages don't have spec yet; cast for compatibility
      const brain = genBrainRepl({
        slug: 'openai/codex',
      }) as unknown as BrainRepl;

      const testRegistry: RoleRegistry = {
        slug: '.this',
        readme: { uri: '.test/readme.md' },
        roles: [testerRole],
      };

      const program = new Command();
      program.exitOverride();
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      beforeEach(() => {
        logSpy.mockClear();
      });

      // register with mock context that provides the tester registry and brain
      const happyContext = genMockContextConfigOfUsage({
        isExplicit: true,
        explicitPath: '/fake/rhachet.use.ts',
        registries: [testRegistry],
        brains: [brain],
        hooks: null,
      });
      invokeAct({ program }, happyContext);

      when('act command is invoked with default brain', () => {
        then('it executes the rigid skill with the default brain', async () => {
          const args = [
            'act',
            '--role',
            'tester',
            '--skill',
            'echo.review',
            '--input',
            '{"content":"hello world"}',
          ];
          await program.parseAsync(args, { from: 'user' });

          // verify skill execution was logged
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining(
              'act rigid skill repo=.this/role=tester/skill=echo.review',
            ),
          );
        });
      });

      when('act command is invoked with explicit --brain', () => {
        then('it uses the specified brain from allowlist', async () => {
          const args = [
            'act',
            '--role',
            'tester',
            '--skill',
            'echo.review',
            '--brain',
            'openai/codex',
            '--input',
            '{"content":"hello world"}',
          ];
          await program.parseAsync(args, { from: 'user' });

          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining(
              'act rigid skill repo=.this/role=tester/skill=echo.review',
            ),
          );
        });
      });

      when('act command is invoked with brain not in allowlist', () => {
        then('it throws error about brain not in allowlist', async () => {
          const args = [
            'act',
            '--role',
            'tester',
            '--skill',
            'echo.review',
            '--brain',
            'anthropic/claude',
            '--input',
            '{"content":"hello world"}',
          ];
          const error = await getError(() =>
            program.parseAsync(args, { from: 'user' }),
          );

          expect(error).toBeDefined();
          expect(error?.message).toMatch(/not.*allowlist/i);
        });
      });
    },
  );
});
