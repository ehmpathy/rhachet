import { given, then, when } from 'test-fns';

import { getDefaultAskpassCandidates } from './getOneAskpassDialog';

/**
 * .what = prove the verified absolute paths are always tried BEFORE a PATH hit
 * .why  = getOneAskpassDialog's whole purpose is to keep the passphrase off an
 *         attacker-influenceable surface. PATH is exactly that surface, so a
 *         `which gnome-ssh-askpass` result must be a FALLBACK for non-standard
 *         installs, never a preemption of the three known-good system paths — else
 *         a prepended malicious dialog earlier on PATH could capture the passphrase
 *
 * .note = the clamp: this test goes RED under the prior `[onPath, ...standardPaths]`
 *         order (a PATH hit first) and GREEN under `[...standardPaths, onPath]`
 */
describe('getDefaultAskpassCandidates', () => {
  const STANDARD_PATHS = [
    '/usr/lib/openssh/gnome-ssh-askpass',
    '/usr/libexec/openssh/gnome-ssh-askpass',
    '/usr/lib/ssh/gnome-ssh-askpass',
  ];

  given('[case1] a PATH hit is present alongside the standard paths', () => {
    const onPath = '/attacker/bin/gnome-ssh-askpass';

    when('[t0] the candidate list is built', () => {
      const candidates = getDefaultAskpassCandidates({ onPath });

      then('the three verified absolute paths come FIRST', () => {
        expect(candidates.slice(0, 3)).toEqual(STANDARD_PATHS);
      });

      then('the PATH hit is LAST, never ahead of a verified path', () => {
        expect(candidates[candidates.length - 1]).toEqual(onPath);
        expect(candidates.indexOf(onPath)).toEqual(candidates.length - 1);
      });
    });
  });

  given('[case2] no PATH hit (which returned null)', () => {
    when('[t0] the candidate list is built', () => {
      const candidates = getDefaultAskpassCandidates({ onPath: null });

      then('only the three verified absolute paths are returned', () => {
        expect(candidates).toEqual(STANDARD_PATHS);
      });
    });
  });
});
