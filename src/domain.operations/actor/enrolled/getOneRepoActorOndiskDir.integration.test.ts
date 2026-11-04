import { given, then, when } from 'test-fns';

import { genSampleRepoWithActorsYml } from '@src/.test/assets/genSampleRepoWithActorsYml';

import { join } from 'node:path';
import { getOneRepoActorExid } from './getOneRepoActorExid';
import { getOneRepoActorOndiskDir } from './getOneRepoActorOndiskDir';

describe('getOneRepoActorOndiskDir', () => {
  given('[case1] a repo with no actors.yml', () => {
    const repoPath = genSampleRepoWithActorsYml({
      slug: 'repo-actor-no-manifest',
      content: null,
    });

    when('[t0] the repo actor is derived', () => {
      then('its exid is `repo=ambient`, as main ships it (case=5)', () => {
        expect(getOneRepoActorExid({ repoPath })).toEqual('repo=ambient');
      });

      then('its dir is `actor.via.repo=ambient` under .agent/.actors', () => {
        expect(getOneRepoActorOndiskDir({ repoPath })).toEqual(
          join(repoPath, '.agent', '.actors', 'actor.via.repo=ambient'),
        );
      });
    });
  });

  given("[case2] a repo whose actors.yml names `ambient: '@builder'`", () => {
    const repoPath = genSampleRepoWithActorsYml({
      slug: 'repo-actor-manifest',
      content: [
        "ambient: '@builder'",
        'actor:',
        '  - slug: builder',
        '    brain: anthropic/claude/code',
        '    roles: [ehmpathy/mechanic]',
      ].join('\n'),
    });

    when('[t0] the repo actor is derived', () => {
      then(
        'its exid is `slug=builder` — the ambient actor IS the repo actor',
        () => {
          expect(getOneRepoActorExid({ repoPath })).toEqual('slug=builder');
        },
      );

      then('its dir is `actor.via.slug=builder`', () => {
        expect(getOneRepoActorOndiskDir({ repoPath })).toEqual(
          join(repoPath, '.agent', '.actors', 'actor.via.slug=builder'),
        );
      });
    });
  });
});
