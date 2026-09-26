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
            actorHash: '9c1e0a7b',
          });
          // the exact text is clamped so a human-faced advisory cannot drift silently
          expect(line).toEqual(
            '⚠ this actor now has 5 live clones — a cron that retries can accrue billed brains. triage with `rhx clone list @9c1e0a7b`.',
          );
        },
      );

      then('the triage hint carries the WHOLE hash, so it pastes', () => {
        const line = asCloneAccrualWarnLine({
          liveCount: 8,
          actorHash: 'abcdef01',
        });
        // `genEnrollmentHash` mints 8 chars, so that value IS the actor's entire name —
        // an elided prefix addresses no actor. this line hands a human a command to RUN,
        // so the `@<hash>` inside it must be pasteable (rule.require.errors-name-the-fix)
        //
        // the CLOSING backtick is what gives this clamp teeth: a truncated render would
        // emit `@abcdef0` + backtick and miss, where a bare `toContain('@abcdef01')`
        // would pass on any render that merely starts with the hash
        expect(line).toContain('`rhx clone list @abcdef01`');
        expect(line).toContain('8 live clones');
      });
    });
  });
});
