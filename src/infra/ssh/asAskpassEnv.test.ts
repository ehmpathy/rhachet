import { given, then, when } from 'test-fns';

import { asAskpassEnv } from './asAskpassEnv';

/**
 * .what = prove the env forces ssh-add to use the gnome dialog, off the tty
 * .why  = SSH_ASKPASS_REQUIRE=force is the whole point (vision q2); a missed
 *         var would silently drop to the terminal prompt
 */
describe('asAskpassEnv', () => {
  given('[case1] a dialog path and a base env', () => {
    const base = { HOME: '/home/probe', DISPLAY: ':0' };

    when('[t0] the askpass env is built', () => {
      const env = asAskpassEnv({
        dialog: '/usr/lib/openssh/gnome-ssh-askpass',
        base,
      });

      then('SSH_ASKPASS points at the dialog', () => {
        expect(env.SSH_ASKPASS).toEqual('/usr/lib/openssh/gnome-ssh-askpass');
      });

      then('SSH_ASKPASS_REQUIRE forces the dialog (never the tty)', () => {
        expect(env.SSH_ASKPASS_REQUIRE).toEqual('force');
      });

      then('the base env passes through (DISPLAY preserved)', () => {
        expect(env.DISPLAY).toEqual(':0');
        expect(env.HOME).toEqual('/home/probe');
      });
    });
  });
});
