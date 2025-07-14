import { Command } from 'commander';
import { given, when, then, getError } from 'test-fns';

import { EXAMPLE_REGISTRY } from './.test/example.echoRegistry';
import { invokeAsk } from './invokeAsk';

describe('invokeAsk (integration)', () => {
  given(
    'a CLI program with invokeAsk registered using EXAMPLE_REGISTRY',
    () => {
      const program = new Command();
      invokeAsk({ program, registries: [EXAMPLE_REGISTRY] });

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
    },
  );
});
