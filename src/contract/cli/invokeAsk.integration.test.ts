import { Command } from 'commander';
import { getError, given, then, when } from 'test-fns';

import { TEST_FIXTURE_DIRECTORY } from '@src/.test/directory';
import { EXAMPLE_REGISTRY } from '@src/.test/example.use.repo/example.echoRegistry';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import { Role } from '@src/domain.objects/Role';

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { invokeAsk } from './invokeAsk';

describe('invokeAsk (integration)', () => {
  // config path is required for nested attempts to be explicitly declared
  const configPath = path.resolve(
    TEST_FIXTURE_DIRECTORY,
    './example.use.repo/example.rhachet.use.ts',
  );

  given(
    'a CLI program with invokeAsk registered, with EXAMPLE_REGISTRY (stitch-mode)',
    () => {
      const program = new Command();
      invokeAsk({
        program,
        config: { path: configPath },
        registries: [EXAMPLE_REGISTRY],
        brains: [],
        hooks: null,
      });

      when('a valid echo skill is invoked with ask input', () => {
        then('it should execute the skill successfully', async () => {
          const args = [
            'ask',
            '--role',
            'echoer',
            '--skill',
            'echo',
            '--ask',
            'hello',
          ];
          await program.parseAsync(args, { from: 'user' });
        });
      });

      when('an invalid skill is provided', () => {
        then('it should throw a bad request error', async () => {
          const args = ['ask', '--role', 'echoer', '--skill', 'unknown', 'hi'];
          const error = await getError(() =>
            program.parseAsync(args, { from: 'user' }),
          );
          expect(error?.message).toContain('no skill named');
        });
      });

      when('an invalid role is provided', () => {
        then('it should throw a missing role error', async () => {
          const args = ['ask', '--role', 'badrole', '--skill', 'echo', 'hi'];
          const error = await getError(() =>
            program.parseAsync(args, { from: 'user' }),
          );
          expect(error?.message).toContain('no role named');
        });
      });

      when('a valid echo skill with attempts is invoked', () => {
        then('it should execute the skill successfully', async () => {
          const args = [
            'ask',
            '--role',
            'echoer',
            '--skill',
            'echo',
            '--ask',
            'hello',
            '--attempts',
            '3',
          ];
          await program.parseAsync(args, { from: 'user' });
        });
      });
    },
  );

  given(
    'a CLI program with invokeAsk registered (actor mode, no --skill)',
    () => {
      // create a mock brain for testing
      const mockBrain: BrainRepl = {
        repo: 'mock',
        slug: 'test-brain',
        description: 'mock brain for testing',
        ask: jest.fn().mockResolvedValue('mock response'),
        act: jest.fn().mockResolvedValue({ result: 'mock result' }),
      } as unknown as BrainRepl;

      // create test role with proper structure
      const testRole = new Role({
        slug: 'tester',
        name: 'Tester',
        purpose: 'test role for integration tests',
        readme: 'a role for testing invokeAsk',
        traits: [],
        skills: {
          dirs: { uri: '.agent/repo=.this/role=tester/skills' },
          refs: [],
        },
        briefs: { dirs: { uri: '.agent/repo=.this/role=tester/briefs' } },
      });

      const testRegistry = {
        slug: '.this',
        readme: 'test registry for invokeAsk tests',
        roles: [testRole],
      };

      // create .agent/ directory structure for tester role
      const briefsDir = path.resolve(
        process.cwd(),
        '.agent/repo=.this/role=tester/briefs',
      );

      beforeAll(() => {
        if (!existsSync(briefsDir)) {
          mkdirSync(briefsDir, { recursive: true });
          writeFileSync(
            path.join(briefsDir, 'testing.brief.md'),
            '# Testing Brief\n\nGuidelines for testing.\n',
          );
        }
      });

      afterAll(() => {
        const agentDir = path.resolve(
          process.cwd(),
          '.agent/repo=.this/role=tester',
        );
        rmSync(agentDir, { recursive: true, force: true });
      });

      const program = new Command();
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      beforeEach(() => {
        logSpy.mockClear();
        jest.clearAllMocks();
      });

      invokeAsk({
        program,
        config: { path: configPath },
        registries: [testRegistry],
        brains: [mockBrain],
        hooks: null,
      });

      when('a valid role and prompt are provided (no --skill)', () => {
        then('it should invoke actor.ask with the prompt', async () => {
          const args = ['ask', '--role', 'tester', '--ask', 'hello world'];
          await program.parseAsync(args, { from: 'user' });

          expect(mockBrain.ask).toHaveBeenCalledTimes(1);
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('ask role="tester"'),
          );
        });
      });

      when('an invalid role is provided (no --skill)', () => {
        then('it should throw a missing role error', async () => {
          const args = ['ask', '--role', 'badrole', '--ask', 'hi'];
          const error = await getError(() =>
            program.parseAsync(args, { from: 'user' }),
          );
          expect(error?.message).toContain('no role named');
        });
      });

      when('no prompt is provided (no --skill)', () => {
        then('it should throw requiring --ask', async () => {
          const args = ['ask', '--role', 'tester'];
          const error = await getError(() =>
            program.parseAsync(args, { from: 'user' }),
          );
          expect(error?.message).toContain('--ask is required');
        });
      });
    },
  );

  given('a CLI program with no brains (actor mode)', () => {
    const program = new Command();

    invokeAsk({
      program,
      config: { path: configPath },
      registries: [EXAMPLE_REGISTRY],
      brains: [],
      hooks: null,
    });

    when('ask command is invoked without --skill', () => {
      then('it should throw error about no brains', async () => {
        const args = ['ask', '--role', 'echoer', '--ask', 'hello'];
        const error = await getError(() =>
          program.parseAsync(args, { from: 'user' }),
        );
        expect(error?.message).toContain('no brains available');
      });
    });
  });
});
