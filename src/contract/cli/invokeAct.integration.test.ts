import { Command } from 'commander';
import { getError, given, then, when } from 'test-fns';
import { z } from 'zod';

import { genMockContextConfigOfUsage } from '@src/.test/genMockContextConfigOfUsage';
import type { MockedBrainCall } from '@src/.test.assets/asMockedBrainCall';
import { genMockedBrainRepl } from '@src/.test.assets/genMockedBrainRepl';
import { Role } from '@src/domain.objects/Role';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';

import { EXAMPLE_REPO_WITH_RIGID_SKILL } from '../../../.test/assets/example.repo/directory';
import { testerRole } from '../../../.test/assets/example.repo/repo-with-role-with-rigid-skill/role';
import { invokeAct } from './invokeAct';

describe('invokeAct (integration)', () => {
  given('[case1] a CLI program with invokeAct registered, error cases', () => {
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

    when('[t0] act command is invoked with no brains available', () => {
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

    when('[t1] act command is invoked with nonexistent role', () => {
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

    when('[t2] act command is invoked with invalid brain format', () => {
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

    when('[t3] act command is invoked with --attempts but no --output', () => {
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
    '[case2] a CLI program with invokeAct registered, and two mocked brains under real refs',
    () => {
      const testAssetDir = EXAMPLE_REPO_WITH_RIGID_SKILL;
      const originalCwd = process.cwd();

      beforeAll(() => {
        // switch to test asset directory for skill discovery
        // .note = deliberate global mutation: getRoleBriefs reads the cwd; afterAll restores it
        process.chdir(testAssetDir);
      });

      afterAll(() => {
        process.chdir(originalCwd);
      });

      // two mocked repls under real brain refs, each records its own calls: the first is the
      // default; the refs keep their real shapes, since --brain parse depends on them
      // .mock = the brains, injected via genMockedBrainRepl; its docblock holds the .why and the .real
      const callsHaiku: MockedBrainCall[] = [];
      const callsCodex: MockedBrainCall[] = [];
      const echoReviewed = { echoed: 'hello world', reviewed: true };
      const brainHaiku = genMockedBrainRepl({
        repo: 'anthropic',
        slug: 'claude/code/haiku',
        output: { act: echoReviewed },
        onInvoke: (call) => callsHaiku.push(call),
      });
      const brainCodex = genMockedBrainRepl({
        repo: 'openai',
        slug: 'openai/codex',
        output: { act: echoReviewed },
        onInvoke: (call) => callsCodex.push(call),
      });

      const testRegistry: RoleRegistry = {
        slug: '.this',
        readme: { uri: '.test/readme.md' },
        roles: [testerRole],
      };

      const program = new Command();
      program.exitOverride();
      // .mock = a passthrough `jest.spyOn(console, 'log')`; no behavior is replaced
      // .why = invokeAct prints its run header through console.log and takes no log sink, so
      //   the spy is the one seam that observes it
      // .real = the brain, the skill and the cli all run for real; the spy only records
      const logSpy = jest.spyOn(console, 'log');

      beforeEach(() => {
        logSpy.mockClear();
        // .note = deliberate mutation: each mock closes over its array, so it is reset in place
        callsHaiku.length = 0;
        callsCodex.length = 0;
      });

      // register with mock context that provides the tester registry and brain
      const happyContext = genMockContextConfigOfUsage({
        isExplicit: true,
        explicitPath: '/fake/rhachet.use.ts',
        registries: [testRegistry],
        brains: [brainHaiku, brainCodex],
        hooks: null,
      });
      invokeAct({ program }, happyContext);

      when('[t0] act command is invoked with default brain', () => {
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

          // the default brain took the call, with the skill and its input
          expect(callsHaiku).toHaveLength(1);
          expect(callsHaiku[0]?.prompt).toContain('echo.review');
          expect(callsHaiku[0]?.prompt).toContain('hello world');
          expect(
            callsHaiku[0]?.briefs.every((uri) => uri.includes('role=tester')),
          ).toBe(true);
          expect(callsHaiku[0]?.briefs.length).toBeGreaterThan(0);
          expect(callsCodex).toHaveLength(0);

          // the full stdout a caller reads, so a drift anywhere on it shows in review
          // .note = the metrics are the mock's constants (genMockedBrainOutputMetrics); the hashes are content hashes
          const stdout = logSpy.mock.calls
            .map((call) => call.map(String).join(' '))
            .join('\n');
          expect(stdout).toMatchSnapshot();
        });
      });

      when('[t1] act command is invoked with explicit --brain', () => {
        // the proof: only the named brain records the call
        then(
          'it routes the call to the specified brain from allowlist',
          async () => {
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
            expect(callsCodex).toHaveLength(1);
            expect(callsHaiku).toHaveLength(0);

            // the snap pins the envelope this route prints; the call counts above pin the route
            const stdout = logSpy.mock.calls
              .map((call) => call.map(String).join(' '))
              .join('\n');
            expect(stdout).toMatchSnapshot();
          },
        );
      });

      when(
        '[t2] act command is invoked with --brain repo/slug for an anthropic brain',
        () => {
          // the anthropic slug does not open with its repo, so the flag reads as repo/rest
          then('it executes the rigid skill with the named brain', async () => {
            const args = [
              'act',
              '--role',
              'tester',
              '--skill',
              'echo.review',
              '--brain',
              'anthropic/claude/code/haiku',
              '--input',
              '{"content":"hello world"}',
            ];
            await program.parseAsync(args, { from: 'user' });

            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining(
                'act rigid skill repo=.this/role=tester/skill=echo.review',
              ),
            );
            expect(callsHaiku).toHaveLength(1);
            expect(callsCodex).toHaveLength(0);

            // the snap pins the envelope this route prints; the call counts above pin the route
            const stdout = logSpy.mock.calls
              .map((call) => call.map(String).join(' '))
              .join('\n');
            expect(stdout).toMatchSnapshot();
          });
        },
      );

      when('[t3] act command is invoked with brain not in allowlist', () => {
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
          expect(error?.message).toMatchSnapshot();
        });
      });
    },
  );
});
