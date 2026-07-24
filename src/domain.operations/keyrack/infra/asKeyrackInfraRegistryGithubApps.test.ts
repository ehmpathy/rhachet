import { getError, given, then, when } from 'test-fns';

import { asKeyrackInfraRegistryGithubApps } from './asKeyrackInfraRegistryGithubApps';

describe('asKeyrackInfraRegistryGithubApps', () => {
  given('[case1] an empty registry array', () => {
    when('[t0] parsed', () => {
      then('it returns an empty list', () => {
        expect(asKeyrackInfraRegistryGithubApps({ content: '[]' })).toEqual([]);
      });
    });
  });

  given('[case2] a registry with one app', () => {
    const content = JSON.stringify([
      {
        org: 'ehmpathy',
        appId: '123456',
        installationId: '78901234',
        slug: 'ehmpathy-bot',
      },
    ]);

    when('[t0] parsed', () => {
      then('it returns the validated entry', () => {
        expect(asKeyrackInfraRegistryGithubApps({ content })).toEqual([
          {
            org: 'ehmpathy',
            appId: '123456',
            installationId: '78901234',
            slug: 'ehmpathy-bot',
          },
        ]);
      });
    });
  });

  given('[case3] malformed json', () => {
    when('[t0] parsed', () => {
      then('it fails loud as unexpected shared-repo state', async () => {
        const error = await getError(() =>
          asKeyrackInfraRegistryGithubApps({ content: '{ not json' }),
        );
        expect(error.message).toContain('not valid json');
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('[case4] json of the wrong shape', () => {
    when('[t0] parsed', () => {
      then('it fails validation', async () => {
        const error = await getError(() =>
          asKeyrackInfraRegistryGithubApps({
            content: JSON.stringify([{ org: 'ehmpathy' }]),
          }),
        );
        expect(error).toBeDefined();
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
