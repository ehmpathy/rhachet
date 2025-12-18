import { given, then, when } from 'test-fns';

import { TEST_FIXTURE_DIRECTORY } from '@src/.test/directory';

import path from 'node:path';
import { performInIsolatedThread } from './performInIsolatedThread.invoke';

describe('performInIsolatedThread', () => {
  // observe stdout
  let stdoutObserved = '';
  const originalWrite = process.stdout.write;
  beforeAll(() => {
    (process.stdout.write as any) = (chunk: any, ...args: any[]) => {
      stdoutObserved += chunk.toString();
      return (originalWrite as any).call(process.stdout, chunk, ...args);
    };
  });
  afterAll(() => {
    (process.stdout.write as any) = originalWrite;
  });

  given('a simple demo config', () => {
    // declare the demo config via path
    const configPath = path.resolve(
      TEST_FIXTURE_DIRECTORY,
      './example.use.repo/example.rhachet.use.ts',
    );

    when('asked to perform a skill registered in the config', () => {
      const opts = {
        config: configPath,
        skill: 'echo',
        role: 'echoer',
        attempt: 1,
        ask: 'do it',
      };

      then('it should successfully execute it', async () => {
        await performInIsolatedThread({ opts, peer: { attempts: 3 } });
      });
      then('it should have logged with observable prefixes', async () => {
        expect(stdoutObserved).toContain('○ i1 ›');
        expect(stdoutObserved).toContain(`🫡  on it!`);
      });
    });

    when(
      'asked to perform a skill registered in the config with 100 peer attempts',
      () => {
        const opts = {
          config: configPath,
          skill: 'echo',
          role: 'echoer',
          attempt: 1,
          ask: 'do it',
        };

        then('it should successfully execute it', async () => {
          await performInIsolatedThread({ opts, peer: { attempts: 100 } });
        });
        then(
          'it should have logged with padded observable prefixes',
          async () => {
            expect(stdoutObserved).toContain('○ i001 ›');
          },
        );
      },
    );

    when(
      'asked to perform a skill registered in the config on attempt number 3',
      () => {
        const opts = {
          config: configPath,
          skill: 'echo',
          role: 'echoer',
          attempt: 3,
          ask: 'do it',
        };

        then('it should successfully execute it', async () => {
          await performInIsolatedThread({ opts, peer: { attempts: 3 } });
        });
        then(
          'it should have logged with padded observable prefixes',
          async () => {
            expect(stdoutObserved).toContain('○ i3 ›');
          },
        );
      },
    );
  });
});
