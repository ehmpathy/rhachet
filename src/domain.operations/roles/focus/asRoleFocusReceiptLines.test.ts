import { given, then, when } from 'test-fns';

import { asRoleFocusReceiptLines } from './asRoleFocusReceiptLines';

describe('asRoleFocusReceiptLines', () => {
  given('[case1] no focus change and no shed', () => {
    when('[t0] the receipt renders', () => {
      then('naught renders, so an unfocused enroll prints as it did', () => {
        expect(
          asRoleFocusReceiptLines({ changes: [], alwaysShed: [] }),
        ).toEqual([]);
      });
    });
  });

  given('[case2] a given, a narrow, a move, a widen, and a shed', () => {
    const lines = asRoleFocusReceiptLines({
      changes: [
        { role: 'reviewer', kind: 'given', from: null, to: ['flow'] },
        { role: 'mechanic', kind: 'narrow', from: null, to: ['101'] },
        { role: 'driver', kind: 'move', from: ['flow'], to: ['code.prod'] },
        { role: 'architect', kind: 'widen', from: ['terms'], to: null },
      ],
      alwaysShed: ['mechanic'],
    });

    when('[t0] the receipt renders', () => {
      then('each change names its role, its verb, and where it lands', () => {
        expect(lines).toContain('   ├─ reviewer focused at ::flow');
        expect(lines).toContain('   ├─ mechanic narrowed to ::101');
        expect(lines).toContain(
          '   ├─ driver moved from ::flow to ::code.prod',
        );
        expect(lines).toContain('   ├─ architect widened to the whole role');
      });

      then('the shed is the last leaf, and closes the branch', () => {
        expect(lines[lines.length - 1]).toEqual(
          '   └─ mechanic sheds its always block, as its focus declares',
        );
      });

      then('the receipt matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case3] a held focus re-typed as is (E2)', () => {
    const lines = asRoleFocusReceiptLines({
      changes: [
        { role: 'mechanic', kind: 'unchanged', from: ['flow'], to: ['flow'] },
      ],
      alwaysShed: [],
    });

    when('[t0] the receipt renders', () => {
      then('the no-op reads as one, never as silence', () => {
        expect(lines).toEqual([
          '🧢 focus',
          '   └─ mechanic unchanged at ::flow',
        ]);
      });

      then('the receipt matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });
});
