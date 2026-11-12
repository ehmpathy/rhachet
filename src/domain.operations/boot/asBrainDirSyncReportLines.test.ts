import { given, then, when } from 'test-fns';

import {
  asBrainDirSyncReportLines,
  type BrainDirSyncSymlink,
} from './asBrainDirSyncReportLines';
import { BOOT_STATS_ZERO } from './BootStats';
import type { BrainDirBootRender } from './BrainDirBootRender';

const REPO_ACTOR_BRAIN_DIR_REL =
  '.agent/.actors/actor.via.repo=ambient/brain/.claude';

/**
 * .what = one render, with every field the report reads
 */
const genRender = (
  overrides: Partial<BrainDirBootRender> = {},
): BrainDirBootRender => ({
  scope: { kind: 'repo' },
  bootMdPath: `/repo/${REPO_ACTOR_BRAIN_DIR_REL}/boot.md`,
  stats: { ...BOOT_STATS_ZERO, roles: 2, chars: 4096 },
  agentsMdReset: false,
  bootMdCreated: false,
  ...overrides,
});

/**
 * .what = one symlink outcome
 */
const genSymlink = (
  overrides: Partial<BrainDirSyncSymlink> = {},
): BrainDirSyncSymlink => ({
  effect: 'FOUND',
  drops: [],
  moves: [],
  overwrites: [],
  ...overrides,
});

describe('asBrainDirSyncReportLines', () => {
  given(
    '[case1] a full migration — moves, drops, a fresh link, a new corpus',
    () => {
      when('[t0] the lines are rendered', () => {
        const lines = asBrainDirSyncReportLines({
          render: genRender({ bootMdCreated: true }),
          symlink: genSymlink({
            effect: 'MIGRATED',
            drops: ['CLAUDE.md'],
            moves: ['settings.json', 'keep.json'],
          }),
          untracked: [],
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
        });

        then('every group sits under one header, in the one order', () => {
          expect(lines).toMatchSnapshot();
        });

        then('each group is reached by a branch, never a bare line', () => {
          // the whole point of the tree: no row may read as debug chatter wedged between
          //   two adjacent treestructs (`rule.require.treestruct-output`)
          for (const line of lines.slice(1))
            expect(line.startsWith('   ')).toBe(true);
        });
      });
    },
  );

  given('[case2] a link this run created, with naught to migrate', () => {
    when('[t0] the lines are rendered', () => {
      const lines = asBrainDirSyncReportLines({
        render: genRender({ bootMdCreated: true }),
        symlink: genSymlink({ effect: 'CREATED' }),
        untracked: [],
        repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
      });

      then('it names the link and the corpus, and naught else', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });

  given('[case3] a link already in place, and a corpus re-rendered', () => {
    when('[t0] the lines are rendered', () => {
      const lines = asBrainDirSyncReportLines({
        render: genRender(),
        symlink: genSymlink({ effect: 'FOUND' }),
        untracked: [],
        repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
      });

      then('it says NAUGHT — success is not news', () => {
        // the report is silent OR it halts. a re-render that changed no fact a human can
        //   act on has no news, and the failure path is loud elsewhere
        expect(lines).toEqual([]);
      });
    });
  });

  given(
    '[case4] an actor brain dir, which has no <repo>/.claude beneath it',
    () => {
      when('[t0] a first render, with no symlink', () => {
        const lines = asBrainDirSyncReportLines({
          render: genRender({
            scope: { kind: 'actor', actorExid: 'hash=051970ec' },
            bootMdCreated: true,
            stats: { ...BOOT_STATS_ZERO, roles: 1, chars: 512 },
          }),
          symlink: null,
          untracked: [],
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
        });

        then(
          'the header names the actor, and the role word is singular',
          () => {
            expect(lines).toMatchSnapshot();
          },
        );
      });

      when('[t1] a re-render, with no symlink', () => {
        const lines = asBrainDirSyncReportLines({
          render: genRender({
            scope: { kind: 'actor', actorExid: 'hash=051970ec' },
          }),
          symlink: null,
          untracked: [],
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
        });

        then('it says NAUGHT', () => {
          expect(lines).toEqual([]);
        });
      });
    },
  );

  given('[case4b] a move that replaced an entry the default dir held', () => {
    when('[t0] the lines are rendered', () => {
      const lines = asBrainDirSyncReportLines({
        render: genRender(),
        symlink: genSymlink({
          effect: 'MIGRATED',
          moves: ['settings.json', 'rules'],
          overwrites: ['settings.json'],
        }),
        untracked: [],
        repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
      });

      then(
        'only the replaced row is marked — the other is a plain move',
        () => {
          // rhachet owns the dir, so a name in both is overwritten rather than refused.
          //   the human still learns WHICH row replaced a file they may want to diff
          expect(lines).toMatchSnapshot();
        },
      );
    });
  });

  given('[case5] an AGENTS.md reset, with no other change', () => {
    when('[t0] the lines are rendered', () => {
      const lines = asBrainDirSyncReportLines({
        render: genRender({ agentsMdReset: true }),
        symlink: genSymlink({ effect: 'FOUND' }),
        untracked: [],
        repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
      });

      then(
        'the reset is never silent — the human lost hand edits (S11)',
        () => {
          expect(lines).toMatchSnapshot();
        },
      );
    });
  });

  given(
    '[case6] a sync that dropped a machine-named link from git index',
    () => {
      when('[t0] the lines are rendered, with no other change', () => {
        const lines = asBrainDirSyncReportLines({
          render: genRender(),
          symlink: genSymlink({ effect: 'FOUND' }),
          untracked: [`${REPO_ACTOR_BRAIN_DIR_REL}/settings.of.grove.json`],
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
        });

        then(
          'the untrack is never silent — it lands as a staged deletion',
          () => {
            expect(lines).toContain(
              `   │  └─ ${REPO_ACTOR_BRAIN_DIR_REL}/settings.of.grove.json — names this machine; kept on disk, commit its deletion`,
            );
            expect(lines).toContain(
              `   │     └─ cure — a teammate whose pull git refuses runs \`git checkout -- ${REPO_ACTOR_BRAIN_DIR_REL}/settings.of.grove.json\`, then pulls`,
            );
            expect(lines).toMatchSnapshot();
          },
        );
      });
    },
  );

  given('[case7] a sync that dropped two paths from git index', () => {
    when('[t0] the lines are rendered', () => {
      const lines = asBrainDirSyncReportLines({
        render: genRender(),
        symlink: genSymlink({ effect: 'FOUND' }),
        untracked: [
          `${REPO_ACTOR_BRAIN_DIR_REL}/a.json`,
          `${REPO_ACTOR_BRAIN_DIR_REL}/b.json`,
        ],
        repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
      });

      then(
        'each cure nests beneath its own path, never between two paths',
        () => {
          const untrackedAt = lines.indexOf('   ├─ untracked');
          expect(lines.slice(untrackedAt, untrackedAt + 5)).toEqual([
            '   ├─ untracked',
            `   │  ├─ ${REPO_ACTOR_BRAIN_DIR_REL}/a.json — names this machine; kept on disk, commit its deletion`,
            `   │  │  └─ cure — a teammate whose pull git refuses runs \`git checkout -- ${REPO_ACTOR_BRAIN_DIR_REL}/a.json\`, then pulls`,
            `   │  └─ ${REPO_ACTOR_BRAIN_DIR_REL}/b.json — names this machine; kept on disk, commit its deletion`,
            `   │     └─ cure — a teammate whose pull git refuses runs \`git checkout -- ${REPO_ACTOR_BRAIN_DIR_REL}/b.json\`, then pulls`,
          ]);
        },
      );
    });
  });
});
