import { given, then, when } from 'test-fns';

import { getAllClaudeMdExcludesForActor } from './getAllClaudeMdExcludesForActor';

describe('getAllClaudeMdExcludesForActor', () => {
  const repoActorBrainDir =
    '/repo/.agent/.actors/actor.via.repo=ambient/brain/.claude';

  given('[case1] the repo actor', () => {
    when('[t0] its excludes are built', () => {
      then(
        'neither of its own door paths is excluded — its real dir, nor the <repo>/.claude link to it',
        () => {
          expect(
            getAllClaudeMdExcludesForActor({
              repoPath: '/repo',
              repoActorBrainDir,
              actorBrainDir: repoActorBrainDir,
            }),
          ).toEqual([
            '**/home/*/.claude/CLAUDE.md',
            '**/Users/*/.claude/CLAUDE.md',
            '/root/.claude/CLAUDE.md',
            '/github/home/.claude/CLAUDE.md',
            '**/CLAUDE.local.md',
          ]);
        },
      );
    });
  });

  given('[case2] a hash actor', () => {
    const actorBrainDir =
      '/repo/.agent/.actors/actor.via.hash=abc123/brain/.claude';

    when('[t0] its excludes are built', () => {
      then(
        'the repo actor doors, in both spellings, are excluded beside the home and local globs',
        () => {
          expect(
            getAllClaudeMdExcludesForActor({
              repoPath: '/repo',
              repoActorBrainDir,
              actorBrainDir,
            }),
          ).toEqual([
            '/repo/.claude/AGENTS.md',
            '/repo/.claude/CLAUDE.md',
            `${repoActorBrainDir}/AGENTS.md`,
            `${repoActorBrainDir}/CLAUDE.md`,
            '**/home/*/.claude/CLAUDE.md',
            '**/Users/*/.claude/CLAUDE.md',
            '/root/.claude/CLAUDE.md',
            '/github/home/.claude/CLAUDE.md',
            '**/CLAUDE.local.md',
            '/repo/.claude/rules/**',
            `${repoActorBrainDir}/rules/**`,
          ]);
        },
      );

      then('no entry names the hash actor own dir', () => {
        expect(
          getAllClaudeMdExcludesForActor({
            repoPath: '/repo',
            repoActorBrainDir,
            actorBrainDir,
          }).filter((entry) => entry.startsWith(actorBrainDir)),
        ).toEqual([]);
      });
    });
  });
});
