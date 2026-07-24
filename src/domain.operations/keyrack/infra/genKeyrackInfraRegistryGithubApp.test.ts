import { given, then, when } from 'test-fns';

import { genMockGhRun } from '@src/.test/assets/genMockGhRun';

import { genKeyrackInfraRegistryGithubApp } from './genKeyrackInfraRegistryGithubApp';
import { getAllKeyrackInfraRegistryGithubApps } from './getAllKeyrackInfraRegistryGithubApps';
import type { GhRun } from './gh/runGh';

const appOne = {
  org: 'ehmpathy',
  appId: '123456',
  installationId: '78901234',
  slug: 'ehmpathy-bot',
};

const appTwo = {
  org: 'ehmpathy',
  appId: '654321',
  installationId: '43210987',
  slug: 'ehmpathy-ci',
};

/**
 * .what = base64-encode a registry-file contents-api GET response for a staged gh
 * .why = the concurrency tests stage the exact registry the read returns per attempt
 */
const asContentsGetResult = (input: {
  apps: (typeof appOne)[];
  sha: string;
}): { status: 0; stdout: string; stderr: string } => ({
  status: 0,
  stdout: JSON.stringify({
    content: Buffer.from(`${JSON.stringify(input.apps, null, 2)}\n`).toString(
      'base64',
    ),
    sha: input.sha,
  }),
  stderr: '',
});

describe('genKeyrackInfraRegistryGithubApp', () => {
  given('[case1] an empty registry', () => {
    when('[t0] an app is registered', () => {
      const ghRun = genMockGhRun({
        files: [
          {
            repo: 'ehmpathy/keyrack-infra',
            path: 'registry/github-apps.json',
            content: '[]\n',
          },
        ],
      });

      then('the app appears in the registry', () => {
        genKeyrackInfraRegistryGithubApp(
          { org: 'ehmpathy', entry: appOne },
          { ghRun },
        );
        expect(
          getAllKeyrackInfraRegistryGithubApps({ org: 'ehmpathy' }, { ghRun }),
        ).toEqual([appOne]);
      });
    });

    when('[t1] a not-yet-registered app is registered', () => {
      const ghRun = genMockGhRun({
        files: [
          {
            repo: 'ehmpathy/keyrack-infra',
            path: 'registry/github-apps.json',
            content: '[]\n',
          },
        ],
      });

      then('it reports status created', () => {
        const result = genKeyrackInfraRegistryGithubApp(
          { org: 'ehmpathy', entry: appOne },
          { ghRun },
        );
        expect(result).toEqual({ status: 'created' });
      });
    });
  });

  given('[case2] a registry that already holds the app', () => {
    when('[t0] the same app is registered again', () => {
      const ghRun = genMockGhRun({
        files: [
          {
            repo: 'ehmpathy/keyrack-infra',
            path: 'registry/github-apps.json',
            content: `${JSON.stringify([appOne], null, 2)}\n`,
          },
        ],
      });

      then('it is a no-op (no duplicate entry)', () => {
        genKeyrackInfraRegistryGithubApp(
          { org: 'ehmpathy', entry: appOne },
          { ghRun },
        );
        expect(
          getAllKeyrackInfraRegistryGithubApps({ org: 'ehmpathy' }, { ghRun }),
        ).toEqual([appOne]);
      });

      then('it reports status found', () => {
        const result = genKeyrackInfraRegistryGithubApp(
          { org: 'ehmpathy', entry: appOne },
          { ghRun },
        );
        expect(result).toEqual({ status: 'found' });
      });
    });
  });

  given(
    '[case3] a concurrent writer registers our app amid a write conflict',
    () => {
      when('[t0] the app is registered', () => {
        then('it converges to found (no duplicate, no throw)', () => {
          // deliberate, isolated mutation for a test double (mirrors genMockGhRun)
          const state = { gets: 0 };
          const ghRun: GhRun = ({ args }) => {
            // every PUT loses the optimistic-lock race (409)
            if (args[1] === '--method' && args[2] === 'PUT')
              return {
                status: 1,
                stdout: '',
                stderr: 'HTTP 409: sha does not match',
              };

            // contents GET: first read is empty; after the conflict, the concurrent
            // writer has registered appOne, so our re-read finds it already present
            state.gets += 1;
            return asContentsGetResult({
              apps: state.gets === 1 ? [] : [appOne],
              sha: `sha${state.gets}`,
            });
          };

          const result = genKeyrackInfraRegistryGithubApp(
            { org: 'ehmpathy', entry: appOne },
            { ghRun },
          );
          expect(result).toEqual({ status: 'found' });
        });
      });
    },
  );

  given(
    '[case4] a write conflict clears on retry (peer added a different app)',
    () => {
      when('[t0] the app is registered', () => {
        then('it converges to created after a retry', () => {
          const state = { gets: 0, puts: 0 };
          const ghRun: GhRun = ({ args }) => {
            if (args[1] === '--method' && args[2] === 'PUT') {
              state.puts += 1;
              // first PUT loses the race; the second PUT wins
              return state.puts === 1
                ? {
                    status: 1,
                    stdout: '',
                    stderr: 'HTTP 409: sha does not match',
                  }
                : { status: 0, stdout: '{}', stderr: '' };
            }

            // contents GET: appTwo is present throughout; appOne is never registered
            // by a peer, so our retry re-appends and wins the second PUT
            state.gets += 1;
            return asContentsGetResult({
              apps: [appTwo],
              sha: `sha${state.gets}`,
            });
          };

          const result = genKeyrackInfraRegistryGithubApp(
            { org: 'ehmpathy', entry: appOne },
            { ghRun },
          );
          expect(result).toEqual({ status: 'created' });
        });
      });
    },
  );
});
