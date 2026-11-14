import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleFileTree } from '@src/.test/assets/genSampleFileTree';

import { getAllActorExidsOndisk } from './getAllActorExidsOndisk';

describe('getAllActorExidsOndisk', () => {
  given('[case1] a repo with no actors root', () => {
    const scene = useBeforeAll(async () => ({
      repoPath: genTempDir({ slug: 'actor-exids-none' }),
    }));

    when('[t0] the exids are read', () => {
      then('none are found', () => {
        expect(getAllActorExidsOndisk({ repoPath: scene.repoPath })).toEqual(
          [],
        );
      });
    });
  });

  given(
    '[case2] actor dirs of each form, a stray dir, a file, and a corrupt record',
    () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genTempDir({ slug: 'actor-exids-mixed' });
        genSampleFileTree({
          dir: repoPath,
          files: {
            '.agent/.actors/actor.via.slug=scholar/actor.json': 'not json',
            '.agent/.actors/actor.via.slug=builder._.delta=f00d/actor.json':
              '{}',
            '.agent/.actors/actor.via.hash=abc123/.keep': '',
            '.agent/.actors/actor.via.repo=ambient/.keep': '',
            '.agent/.actors/stray/.keep': '',
            '.agent/.actors/.gitignore': '*\n',
          },
        });
        return { repoPath };
      });

      when('[t0] the exids are read', () => {
        then(
          'every actor dir is named, low→high, and no record is parsed',
          () => {
            expect(
              getAllActorExidsOndisk({ repoPath: scene.repoPath }),
            ).toEqual([
              'hash=abc123',
              'repo=ambient',
              'slug=builder._.delta=f00d',
              'slug=scholar',
            ]);
          },
        );
      });
    },
  );
});
