import { given, then, when } from 'test-fns';

import { asReadonlyOutsideSettingsNoteLines } from './asReadonlyOutsideSettingsNoteLines';

describe('asReadonlyOutsideSettingsNoteLines', () => {
  given('[case1] no read-only target', () => {
    when('[t0] the notes are rendered', () => {
      then('it renders no lines', () => {
        expect(
          asReadonlyOutsideSettingsNoteLines({
            repoPath: '/repo',
            targets: [],
          }),
        ).toEqual([]);
      });
    });
  });

  given('[case2] two actors whose arrows reach the one home file', () => {
    when('[t0] the notes are rendered', () => {
      const lines = asReadonlyOutsideSettingsNoteLines({
        repoPath: '/repo',
        targets: [
          {
            path: '/repo/.agent/.actors/actor.via.repo=ambient/brain/.claude/settings.json',
            landsAt: '/home/kai/.claude/settings.json',
          },
          {
            path: '/repo/.agent/.actors/actor.via.hash=7dcf1989/brain/.claude/settings.json',
            landsAt: '/home/kai/.claude/settings.json',
          },
        ],
      });
      then('one note prints, for the first actor that reached it', () => {
        expect(lines).toEqual([
          '⚠️ left a read-only file outside the repo untouched',
          '   ├─ path = .agent/.actors/actor.via.repo=ambient/brain/.claude/settings.json',
          '   ├─ lands at = /home/kai/.claude/settings.json (read-only)',
          "   └─ hint = naught to do; the actor's hooks live in its settings.of.repo.json, and rhachet never writes outside the repo",
          '',
        ]);
      });
      then('the block matches snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });
});
