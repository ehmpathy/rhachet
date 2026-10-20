import { given, then, when } from 'test-fns';

import { asBrainDirLayoutReportLines } from './asBrainDirLayoutReportLines';

const REPO_ACTOR_BRAIN_DIR_REL =
  '.agent/.actors/actor.via.repo=ambient/brain/.claude';

describe('asBrainDirLayoutReportLines', () => {
  given('[case1] a layout step that changed naught', () => {
    when('[t0] the lines are rendered', () => {
      then('naught prints — success is not news', () => {
        expect(
          asBrainDirLayoutReportLines({
            symlink: {
              effect: 'FOUND',
              drops: [],
              moves: [],
              overwrites: [],
            },
            settingsReplaced: [],
            excludesDropped: [],
            repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
          }),
        ).toEqual([]);
      });
    });
  });

  given(
    '[case2] a layout step that replaced a real settings.local.json',
    () => {
      when('[t0] the lines are rendered', () => {
        const lines = asBrainDirLayoutReportLines({
          symlink: null,
          settingsReplaced: [
            { name: 'settings.local.json', target: 'settings.of.repo.json' },
          ],
          excludesDropped: [],
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
        });

        then(
          'the repo actor tree names the file and says its content is gone',
          () => {
            expect(lines[0]).toEqual('🧠 brain://repo=ambient');
            expect(lines[1]).toEqual('   └─ replaced');
            expect(lines[2]).toContain(
              '└─ .claude/settings.local.json → settings.of.repo.json — a real file was here; its content is gone',
            );
            expect(lines).toMatchSnapshot();
          },
        );
      });
    },
  );

  given(
    '[case3] a layout step that replaced two names, one on a box with no grove',
    () => {
      when('[t0] the lines are rendered', () => {
        const lines = asBrainDirLayoutReportLines({
          symlink: null,
          settingsReplaced: [
            { name: 'settings.local.json', target: 'settings.of.repo.json' },
            { name: 'settings.json', target: null },
          ],
          excludesDropped: [],
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
        });

        then('each name has its own branch, the last closes the tree', () => {
          expect(lines[2]).toMatch(/^ {6}├─ \.claude\/settings\.local\.json/);
          expect(lines[3]).toMatch(/^ {6}└─ \.claude\/settings\.json — /);
          expect(lines[3]).toContain(
            'rhachet removed it and its content is gone',
          );
          expect(lines).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case4] a layout step that migrated a real <repo>/.claude dir and replaced its settings.json',
    () => {
      when('[t0] the lines are rendered', () => {
        const lines = asBrainDirLayoutReportLines({
          symlink: {
            effect: 'MIGRATED',
            drops: ['AGENTS.md'],
            moves: ['keybindings.json', 'settings.json'],
            overwrites: [],
          },
          settingsReplaced: [
            { name: 'settings.json', target: 'settings.of.grove.json' },
          ],
          excludesDropped: [],
          repoActorBrainDirRel: REPO_ACTOR_BRAIN_DIR_REL,
        });

        then(
          'the move, the drop, the link and the replace each have a group, in that order',
          () => {
            expect(lines.filter((line) => /^ {3}[├└]─ /.test(line))).toEqual([
              '   ├─ moved',
              '   ├─ dropped',
              '   ├─ linked',
              '   └─ replaced',
            ]);
            expect(lines).toMatchSnapshot();
          },
        );

        then(
          'a moved name the layout then took back reads once, under replaced, never as moved',
          () => {
            expect(lines).toContain(
              `   │  └─ .claude/keybindings.json → ${REPO_ACTOR_BRAIN_DIR_REL}/keybindings.json`,
            );
            expect(
              lines.filter((line) => line.includes('.claude/settings.json')),
            ).toHaveLength(1);
            expect(lines[lines.length - 1]).toContain(
              '└─ .claude/settings.json → settings.of.grove.json — a real file was here; its content is gone',
            );
          },
        );
      });
    },
  );
});
