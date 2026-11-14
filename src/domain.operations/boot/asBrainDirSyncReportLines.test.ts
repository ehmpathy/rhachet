import { given, then, when } from 'test-fns';

import { asBrainDirSyncReportLines } from './asBrainDirSyncReportLines';
import { BOOT_STATS_ZERO } from './BootStats';
import type { BrainDirBootRender } from './BrainDirBootRender';
import type { BrainDirSyncSymlink } from './BrainDirLayoutOutcome';

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
  bootMdChanged: false,
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
          render: genRender({ bootMdCreated: true, bootMdChanged: true }),
          symlink: genSymlink({
            effect: 'MIGRATED',
            drops: ['CLAUDE.md'],
            moves: ['settings.json', 'keep.json'],
          }),
          settingsReplaced: [],
          excludesDropped: [],
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
        render: genRender({ bootMdCreated: true, bootMdChanged: true }),
        symlink: genSymlink({ effect: 'CREATED' }),
        settingsReplaced: [],
        excludesDropped: [],
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
        settingsReplaced: [],
        excludesDropped: [],
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
            bootMdChanged: true,
            stats: { ...BOOT_STATS_ZERO, roles: 1, chars: 512 },
          }),
          symlink: null,
          settingsReplaced: [],
          excludesDropped: [],
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
          settingsReplaced: [],
          excludesDropped: [],
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
        settingsReplaced: [],
        excludesDropped: [],
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
        settingsReplaced: [],
        excludesDropped: [],
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
    '[case6] a real settings.local.json the layout replaced with its arrow',
    () => {
      when('[t0] the lines are rendered for the repo actor', () => {
        const lines = asBrainDirSyncReportLines({
          render: genRender(),
          symlink: genSymlink({ effect: 'FOUND' }),
          settingsReplaced: [
            { name: 'settings.local.json', target: 'settings.of.repo.json' },
          ],
          excludesDropped: [],
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
        });

        then('the replacement is never silent — its content is gone', () => {
          // a re-render alone says naught (case3); a replaced file is news, so the tree prints
          expect(lines).toContain('   └─ replaced');
          expect(lines.join('\n')).toContain(
            '.claude/settings.local.json → settings.of.repo.json — a real file was here; its content is gone',
          );
          expect(lines).toMatchSnapshot();
        });
      });
    },
  );

  given('[case7] a real settings.json removed on a box with no grove', () => {
    when('[t0] the lines are rendered for the repo actor', () => {
      const lines = asBrainDirSyncReportLines({
        render: genRender(),
        symlink: genSymlink({ effect: 'FOUND' }),
        settingsReplaced: [{ name: 'settings.json', target: null }],
        excludesDropped: [],
        repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
      });

      then(
        'the removal is never silent, and names why no arrow took its place',
        () => {
          expect(lines).toContain('   └─ replaced');
          expect(lines.join('\n')).toContain(
            '.claude/settings.json — a real file was here; this box has no ~/.claude/settings.json, so rhachet removed it',
          );
          expect(lines).toMatchSnapshot();
        },
      );
    });
  });

  given(
    '[case9] a hand claudeMdExcludes entry the derived list dropped',
    () => {
      when('[t0] the lines are rendered for the repo actor', () => {
        const lines = asBrainDirSyncReportLines({
          render: genRender(),
          symlink: genSymlink({ effect: 'FOUND' }),
          settingsReplaced: [],
          excludesDropped: ['docs/legacy/CLAUDE.md'],
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
        });

        then('the drop is news: the tree prints and names the entry', () => {
          expect(lines).toContain('   └─ unexcluded');
          expect(lines).toMatchSnapshot();
        });
      });
    },
  );

  given('[case8] a replaced settings file beside a corpus', () => {
    when('[t0] the corpus bytes were identical to the prior boot.md', () => {
      const lines = asBrainDirSyncReportLines({
        render: genRender({ bootMdChanged: false }),
        symlink: genSymlink({ effect: 'FOUND' }),
        settingsReplaced: [
          { name: 'settings.local.json', target: 'settings.of.repo.json' },
        ],
        excludesDropped: [],
        repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
      });

      then(
        'the boot.md row is absent — an unchanged corpus is no upgrade',
        () => {
          expect(lines.join('\n')).not.toContain('boot.md');
          expect(lines.join('\n')).not.toContain('upgraded');
        },
      );
    });

    when('[t1] the corpus bytes differed from the prior boot.md', () => {
      const lines = asBrainDirSyncReportLines({
        render: genRender({ bootMdChanged: true }),
        symlink: genSymlink({ effect: 'FOUND' }),
        settingsReplaced: [
          { name: 'settings.local.json', target: 'settings.of.repo.json' },
        ],
        excludesDropped: [],
        repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
      });

      then('the boot.md row says upgraded, after the replaced group', () => {
        expect(lines).toContain('   └─ boot.md');
        expect(lines).toContain('      └─ upgraded — 2 roles');
        expect(lines).toMatchSnapshot();
      });
    });

    when(
      '[t2] the corpus bytes differed, and no settings file was replaced',
      () => {
        const lines = asBrainDirSyncReportLines({
          render: genRender({ bootMdChanged: true }),
          symlink: genSymlink({ effect: 'FOUND' }),
          settingsReplaced: [],
          excludesDropped: [],
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
        });

        then(
          'no tree prints — a re-render alone is the daily brief edit',
          () => {
            expect(lines).toEqual([]);
          },
        );
      },
    );
  });
});
