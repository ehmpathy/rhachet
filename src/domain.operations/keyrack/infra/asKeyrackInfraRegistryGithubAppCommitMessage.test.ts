import { given, then, when } from 'test-fns';

import { asKeyrackInfraRegistryGithubAppCommitMessage } from './asKeyrackInfraRegistryGithubAppCommitMessage';

describe('asKeyrackInfraRegistryGithubAppCommitMessage', () => {
  given('[case1] an app slug', () => {
    when('[t0] cast to a commit message', () => {
      then('it uses the chore(keyrack-infra) convention with the slug', () => {
        expect(
          asKeyrackInfraRegistryGithubAppCommitMessage({
            slug: 'ehmpathy-bot',
          }),
        ).toEqual('chore(keyrack-infra): register github app ehmpathy-bot');
      });
    });
  });
});
