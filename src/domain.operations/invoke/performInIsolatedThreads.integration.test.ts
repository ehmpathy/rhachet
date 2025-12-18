import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, when } from 'test-fns';

import { TEST_FIXTURE_DIRECTORY } from '@src/.test/directory';

import path from 'node:path';
import { performInIsolatedThreads } from './performInIsolatedThreads';

describe('performInIsolatedThreads', () => {
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

  given('a simple echo demo', () => {
    // declare the demo config via path
    const configPath = path.resolve(
      TEST_FIXTURE_DIRECTORY,
      './example.use.repo/example.rhachet.use.ts',
    );

    when('asked to perform a skill registered in the config 3 times', () => {
      const opts = {
        config: configPath,
        role: 'echoer',
        skill: 'echo',
        attempts: 3,
        ask: 'do it',
      };

      then('it should successfully execute do so', async () => {
        await performInIsolatedThreads({ opts });
      });
      then('it should have logged with observable prefixes', async () => {
        expect(stdoutObserved).toContain('○ i1 ›');
        expect(stdoutObserved).toContain(`🫡  on it!`);
      });
    });
  });

  given('a simple file write', () => {
    // declare the demo config via path
    const configPath = path.resolve(
      TEST_FIXTURE_DIRECTORY,
      './example.use.repo/example.rhachet.use.ts',
    );

    when('asked to perform a skill registered in the config 3 times', () => {
      const opts = {
        config: configPath,
        output:
          TEST_FIXTURE_DIRECTORY +
          `/example.use.repo/.tmp/performInIsolatedThreads/${Date.now()}.demo.md`,
        role: 'echoer',
        skill: 'write',
        attempts: 3,
        ask: 'do it',
      };

      then('it should successfully execute do so', async () => {
        await performInIsolatedThreads({ opts });
      });
      then('it should have logged with observable prefixes', async () => {
        expect(stdoutObserved).toContain('○ i1 ›');
        expect(stdoutObserved).toContain(`🫡  on it!`);
      });
      then('it should written files to the expected paths', async () => {
        const artifactsExpected = [
          genArtifactGitFile({ uri: opts.output.replace(/\.md$/, '.i1.md') }),
          genArtifactGitFile({ uri: opts.output.replace(/\.md$/, '.i2.md') }),
          genArtifactGitFile({ uri: opts.output.replace(/\.md$/, '.i3.md') }),
        ];
        await Promise.all(
          artifactsExpected.map(async (art) =>
            expect((await art.get())?.content).toEqual(opts.ask),
          ),
        );
      });
    });
  });
});
