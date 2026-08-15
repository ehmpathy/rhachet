import { given, then, when } from 'test-fns';

import { asCloneAccrualWarnLine } from './asCloneAccrualWarnLine';

describe('asCloneAccrualWarnLine', () => {
  given('[case1] an actor over the accrual threshold', () => {
    when('[t0] the WARN line is composed', () => {
      then(
        'it names the exact live count, the hazard, and the triage move',
        () => {
          const line = asCloneAccrualWarnLine({
            liveCount: 5,
            actorHash: '9c1e0a7bf3',
          });
          // the exact text is clamped so a human-faced advisory cannot drift silently
          expect(line).toEqual(
            '⚠ this actor now has 5 live clones — a cron that retries can accrue billed brains. triage with `rhx clone list @9c1e0a7`.',
          );
        },
      );

      then('the triage hint abbreviates the actor hash to 7 chars', () => {
        const line = asCloneAccrualWarnLine({
          liveCount: 8,
          actorHash: 'abcdef0123456789',
        });
        // the reach uses a git-style short prefix, never the full hash
        expect(line).toContain('@abcdef0');
        expect(line).not.toContain('abcdef01234');
        expect(line).toContain('8 live clones');
      });
    });
  });
});
