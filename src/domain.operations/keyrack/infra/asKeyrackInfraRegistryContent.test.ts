import { given, then, when } from 'test-fns';

import { asKeyrackInfraRegistryContent } from './asKeyrackInfraRegistryContent';
import { asKeyrackInfraRegistryGithubApps } from './asKeyrackInfraRegistryGithubApps';

const appOne = {
  org: 'ehmpathy',
  appId: '123456',
  installationId: '78901234',
  slug: 'ehmpathy-bot',
};

describe('asKeyrackInfraRegistryContent', () => {
  given('[case1] an empty app list', () => {
    when('[t0] cast to registry content', () => {
      then('it is a 2-space json array that ends in a newline', () => {
        expect(asKeyrackInfraRegistryContent({ apps: [] })).toEqual('[]\n');
      });
    });
  });

  given('[case2] a non-empty app list', () => {
    when('[t0] cast to registry content', () => {
      const content = asKeyrackInfraRegistryContent({ apps: [appOne] });

      then('it ends in a newline', () => {
        expect(content.endsWith('\n')).toEqual(true);
      });

      then(
        'it round-trips back to the same apps via asKeyrackInfraRegistryGithubApps',
        () => {
          expect(asKeyrackInfraRegistryGithubApps({ content })).toEqual([
            appOne,
          ]);
        },
      );

      // .note = lock the literal on-disk json so drift in the durable
      //         [{ org, appId, installationId, slug }] registry contract — the shared
      //         source of truth between infra init, auto-register, and member reads —
      //         surfaces in a pr diff instead of a silent regression. this transformer's
      //         output is the exact byte content genKeyrackInfraRegistryGithubApp writes to
      //         registry/github-apps.json, so the snapshot is the file content.
      then('the literal registry json content stays locked', () => {
        expect(content).toMatchSnapshot();
      });
    });
  });
});
