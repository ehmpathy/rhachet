import { given, then } from 'test-fns';

import { asBootDriftFaultLines } from './asBootDriftFaultLines';

describe('asBootDriftFaultLines', () => {
  given('[case1] no fault', () => {
    then('it says naught', () => {
      expect(asBootDriftFaultLines({ faults: [] })).toEqual([]);
    });
  });

  given('[case2] two faults', () => {
    then('one caution header, a row per fault, and the fix', () => {
      const lines = asBootDriftFaultLines({
        faults: [
          {
            path: '/repo/.agent/.actors/a/boots/sha256=0123456789abcdef',
            reason:
              'drift not written (EACCES) — its clones keep their prior drift',
            cause: new Error('EACCES'),
          },
          {
            // a gone revision is a row of the sync report, never a fault; an unreadable ref is
            path: '/repo/.agent/.actors/a/clones',
            reason: 'a spawn ref could not be read (EISDIR)',
            cause: new Error('EISDIR'),
          },
        ],
      });
      // a caution, never an error frame: the enroll that prints it exits as a success
      expect(lines[0]).toMatch(/^🟡 a boot drift was not written/);
      expect(lines.join('\n')).not.toContain('MalfunctionError');
      expect(lines.at(-1)).toContain('rhx init');
      expect(lines).toMatchSnapshot();
    });
  });
});
