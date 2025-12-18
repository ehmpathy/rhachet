import { Command } from 'commander';
import { getError, given, then, when } from 'test-fns';

import { TEST_FIXTURE_DIRECTORY } from '@src/.test/directory';
import { EXAMPLE_REGISTRY } from '@src/.test/example.use.repo/example.echoRegistry';

import path from 'node:path';
import { invokeAsk } from './invokeAsk';

describe('invokeAsk (integration)', () => {
  given(
    'a CLI program with invokeAsk registered using EXAMPLE_REGISTRY',
    () => {
      // config path is required for nested attempts to be explicitly declared
      const configPath = path.resolve(
        TEST_FIXTURE_DIRECTORY,
        './example.use.repo/example.rhachet.use.ts',
      );

      const program = new Command();
      invokeAsk({
        program,
        config: { path: configPath },
        registries: [EXAMPLE_REGISTRY],
        hooks: null,
      });

      when('invoking a valid echo skill with ask input', () => {
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

      when('invoking with an invalid skill', () => {
        then('it should throw a bad request error', async () => {
          const args = ['ask', '--role', 'echoer', '--skill', 'unknown', 'hi'];
          const error = await getError(() =>
            program.parseAsync(args, { from: 'user' }),
          );
          expect(error?.message).toContain('no skill named');
        });
      });

      when('invoking with an invalid role', () => {
        then('it should throw a missing role error', async () => {
          const args = ['ask', '--role', 'badrole', '--skill', 'echo', 'hi'];
          const error = await getError(() =>
            program.parseAsync(args, { from: 'user' }),
          );
          expect(error?.message).toContain('no role named');
        });
      });

      when('invoking a valid echo skill with attempts', () => {
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
});
