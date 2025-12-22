import path from 'path';
import { given, then, when } from 'test-fns';

import { TEST_FIXTURE_DIRECTORY } from '@src/.test/directory';

import { invoke } from './invoke';

describe('invoke', () => {
  given('a valid config path pointing to a basic test registry', () => {
    const configPath = path.resolve(
      TEST_FIXTURE_DIRECTORY,
      './example.use.repo/example.rhachet.use.ts',
    );

    when('asked to readme a role', () => {
      const args = [
        '--config',
        configPath,
        'readme',
        '--registry',
        'echo',
        '--role',
        'echoer',
      ];

      let logSpy: jest.SpiedFunction<typeof console.log>;

      beforeAll(() => {
        logSpy = jest.spyOn(console, 'log');
      });

      afterAll(() => {
        logSpy.mockRestore();
      });

      then('it should print the expected readme from the role', async () => {
        await invoke({ args });

        const callArgs = logSpy.mock.calls.flat();
        const printed = callArgs.join('\n');
        expect(printed).toContain('knows how to echo input back to the user.');
      });
    });

    when('asked to "roles init" with a valid role', () => {
      const args = [
        '--config',
        configPath,
        'roles',
        'init',
        '--role',
        'echoer',
      ];

      let logSpy: jest.SpiedFunction<typeof console.log>;

      beforeAll(() => {
        logSpy = jest.spyOn(console, 'log');
      });

      afterAll(() => {
        logSpy.mockRestore();
      });

      then(
        'it should route to "roles init" subcommand (not bare "init")',
        async () => {
          // this test ensures that "roles init" is correctly routed through
          // the full command structure, not caught by the bare "init" check
          await invoke({ args });

          const callArgs = logSpy.mock.calls.flat();
          const printed = callArgs.join('\n');
          // roles init should show the init message (echoer has no init commands)
          // the key assertion is that it doesn't error with "unknown command 'roles'"
          expect(printed).toContain('Role "echoer"');
          expect(printed).toContain('has no initialization commands');
        },
      );
    });
  });
});
