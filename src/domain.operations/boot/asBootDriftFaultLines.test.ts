import { given, then } from 'test-fns';

import { asBootDriftFaultLines } from './asBootDriftFaultLines';

describe('asBootDriftFaultLines', () => {
  given('[case1] no fault', () => {
    then('it says naught', () => {
      expect(asBootDriftFaultLines({ faults: [] })).toEqual([]);
    });
  });

  given('[case2] two faults', () => {
    then('one qualified header, a row per fault, and the fix', () => {
      const lines = asBootDriftFaultLines({
        faults: [
          {
            revisionDir: '/repo/.agent/.actors/a/boots/sha256=0123456789abcdef',
            reason:
              'drift not written (EACCES) — its clones keep their prior drift',
            cause: new Error('EACCES'),
          },
          {
            revisionDir: '/repo/.agent/.actors/a/boots/sha256=fedcba9876543210',
            reason: 'is gone, yet a clone refers to it — respawn that clone',
            cause: new Error('gone'),
          },
        ],
      });
      expect(lines[0]).toEqual(
        '💥 MalfunctionError: a boot drift was not written',
      );
      expect(lines.at(-1)).toContain('rhx init');
      expect(lines).toMatchSnapshot();
    });
  });
});
