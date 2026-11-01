import { Command } from 'commander';
import { getError, given, then, when } from 'test-fns';
import { z } from 'zod';

import { genMockContextConfigOfUsage } from '@src/.test/genMockContextConfigOfUsage';
import { Role } from '@src/domain.objects/Role';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';

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

    when('act command is invoked with brain not in allowlist', () => {
      // the allowlist check runs before any brain call, so plain brain shapes prove it with no
      //   live call (the tier-3 peer, invokeAct.live, needs a live brain for the rest). they
      //   carry the identities of the live allowlist, so the near-miss input below is the same
      //   one it was refused against before the split
      const programWithBrain = new Command();
      programWithBrain.exitOverride(); // prevent process.exit in tests

      const brainHaikuShape = {
        repo: 'anthropic',
        slug: 'claude/code/haiku',
        description: 'a brain shape the refusal never calls',
        ask: async () => ({ content: '' }),
        act: async () => ({ result: '' }),
      };
      const brainCodexShape = {
        repo: 'openai',
        slug: 'openai/codex',
        description: 'a brain shape the refusal never calls',
        ask: async () => ({ content: '' }),
        act: async () => ({ result: '' }),
      };
      const testerRegistry: RoleRegistry = {
        slug: '.this',
        readme: { uri: '.test/readme.md' },
        roles: [testerRole],
      };

      const allowlistContext = genMockContextConfigOfUsage({
        isExplicit: true,
        explicitPath: '/fake/rhachet.use.ts',
        registries: [testerRegistry],
        brains: [brainHaikuShape as any, brainCodexShape as any],
        hooks: null,
      });
      invokeAct({ program: programWithBrain }, allowlistContext);

      then('it throws error about brain not in allowlist', async () => {
        // `anthropic/claude` is a prefix of an allowed slug: a near miss that a prefix match
        //   would let through
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
          programWithBrain.parseAsync(args, { from: 'user' }),
        );

        expect(error?.message).toMatch(/not.*allowlist/i);
      });
    });
  });
});
