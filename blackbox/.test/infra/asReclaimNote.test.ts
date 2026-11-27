import { given, then, when } from 'test-fns';

import { asReclaimNote } from './asReclaimNote';

describe('asReclaimNote', () => {
  given('[case1] a run whose tests left session daemons', () => {
    when('[t0] three keyrack daemons were reclaimed', () => {
      then('it counts them as a note, never as an error', () => {
        const note = asReclaimNote({
          reclaimed: [1, 2, 3].map((pid) => ({ pid, command: 'node -e startKeyrackDaemon' })),
        });
        expect(note).toContain('ℹ reclaimed 3 keyrack daemons');
        expect(note).not.toContain('Error');
        expect(note).toMatchSnapshot();
      });
    });

    when('[t1] one daemon was reclaimed', () => {
      then('the count reads singular', () => {
        const note = asReclaimNote({
          reclaimed: [{ pid: 1, command: 'node -e startKeyrackDaemon' }],
        });
        expect(note).toContain('ℹ reclaimed 1 keyrack daemon this run');
        expect(note).toMatchSnapshot();
      });
    });
  });
});
