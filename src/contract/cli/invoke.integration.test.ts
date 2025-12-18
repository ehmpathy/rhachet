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
  });
});
