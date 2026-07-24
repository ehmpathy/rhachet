import { given, then, when } from 'test-fns';

import { asKeyrackInfraRegistryGithubApp } from './asKeyrackInfraRegistryGithubApp';

describe('asKeyrackInfraRegistryGithubApp', () => {
  given('[case1] an org and a discovered install', () => {
    const install = {
      appId: '123456',
      installationId: '78901234',
      slug: 'ehmpathy-bot',
    };

    when('[t0] cast to a registry entry', () => {
      then('it merges the org with the install ids', () => {
        expect(
          asKeyrackInfraRegistryGithubApp({ org: 'ehmpathy', install }),
        ).toEqual({
          org: 'ehmpathy',
          appId: '123456',
          installationId: '78901234',
          slug: 'ehmpathy-bot',
        });
      });
    });
  });
});
