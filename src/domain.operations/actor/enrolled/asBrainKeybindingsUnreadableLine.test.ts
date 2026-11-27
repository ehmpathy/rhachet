import { given, then, when } from 'test-fns';

import { asBrainKeybindingsUnreadableLine } from './asBrainKeybindingsUnreadableLine';

describe('asBrainKeybindingsUnreadableLine', () => {
  given('[case1] a home keybindings path', () => {
    when('[t0] the line is rendered', () => {
      const line = asBrainKeybindingsUnreadableLine({
        keybindingsSource: '/home/x/.claude/keybindings.json',
      });

      then(
        'it names the path verbatim, the causes, the effect, and the fix',
        () => {
          expect(line).toEqual(
            "ℹ keybindings at /home/x/.claude/keybindings.json could not be read (a link loop, or no read permission) — the clone keeps claude's default keys; fix the file, then enroll again",
          );
        },
      );
    });
  });
});
