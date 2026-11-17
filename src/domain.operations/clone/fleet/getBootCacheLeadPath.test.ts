import { given, then, when } from 'test-fns';

import { getBootCacheLeadPath } from './getBootCacheLeadPath';

describe('getBootCacheLeadPath', () => {
  given('[case1] a repo path and a boot hash', () => {
    when('[t0] the lead path is computed', () => {
      then('it sits under the actors root, keyed by the boot hash', () => {
        expect(
          getBootCacheLeadPath({ repoPath: '/repo', bootHash: 'abc123' }),
        ).toEqual('/repo/.agent/.actors/.boot.leads/abc123.json');
      });
    });
  });

  given('[case2] two boots of different content in one repo', () => {
    when('[t0] each lead path is computed', () => {
      then(
        'each boot holds its own lead, so two role sets never wait on each other',
        () => {
          expect(
            getBootCacheLeadPath({ repoPath: '/repo', bootHash: 'aaa' }),
          ).not.toEqual(
            getBootCacheLeadPath({ repoPath: '/repo', bootHash: 'bbb' }),
          );
        },
      );
    });
  });
});
