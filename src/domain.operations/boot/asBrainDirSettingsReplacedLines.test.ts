import { given, then, when } from 'test-fns';

import { asBrainDirSettingsReplacedLines } from './asBrainDirSettingsReplacedLines';

describe('asBrainDirSettingsReplacedLines', () => {
  given('[case1] a layout that took back no real file', () => {
    when('[t0] the lines are rendered', () => {
      then('naught prints: success is not news', () => {
        const lines = asBrainDirSettingsReplacedLines({
          scope: { kind: 'actor', actorExid: 'repo=ambient' },
          settingsReplaced: [],
          dirRel: '.claude',
        });
        expect(lines).toEqual([]);
      });
    });
  });

  given(
    '[case2] an enroll that replaced the repo actor real local file',
    () => {
      when('[t0] the lines are rendered', () => {
        const lines = asBrainDirSettingsReplacedLines({
          scope: { kind: 'actor', actorExid: 'repo=ambient' },
          settingsReplaced: [
            { name: 'settings.local.json', target: 'settings.of.repo.json' },
          ],
          dirRel: '.claude',
        });

        then('the header names the repo actor dir', () => {
          expect(lines[0]).toEqual('🧠 brain://repo=ambient');
        });

        then('the row names the file by its .claude reach path', () => {
          expect(lines).toContain('   └─ replaced');
          expect(lines[2]).toContain(
            '.claude/settings.local.json → settings.of.repo.json — a real file was here; its content is gone',
          );
        });

        then('the tree matches the snapshot', () => {
          expect(lines).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case3] an enroll that removed a hash actor real file, on a box with no grove',
    () => {
      when('[t0] the lines are rendered', () => {
        const lines = asBrainDirSettingsReplacedLines({
          scope: { kind: 'actor', actorExid: 'hash=051970ec' },
          settingsReplaced: [{ name: 'settings.json', target: null }],
          dirRel: '.agent/.actors/actor.via.hash=051970ec/brain/.claude',
        });

        then('the header names the hash actor, and the row its own dir', () => {
          expect(lines[0]).toEqual('🧠 brain://hash=051970ec');
          expect(lines[2]).toContain(
            '.agent/.actors/actor.via.hash=051970ec/brain/.claude/settings.json — a real file was here; this box has no ~/.claude/settings.json',
          );
        });

        then('the tree matches the snapshot', () => {
          expect(lines).toMatchSnapshot();
        });
      });
    },
  );
});
