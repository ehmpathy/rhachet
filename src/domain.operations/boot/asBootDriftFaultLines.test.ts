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
            path: '/repo/.agent/.actors/a/boots/serial=aaaa',
            reason:
              'drift not written (EACCES) — the clone keeps its prior drift',
            cause: new Error('EACCES'),
          },
          {
            path: '/repo/.agent/.actors/a/boots/serial=bbbb',
            reason:
              'drift not written, the current boot could not be read (EISDIR) — the clone keeps its prior drift',
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
