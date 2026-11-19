import { ConstraintError } from 'helpful-errors';

import { asHookFaultFieldLines } from './asHookFaultFieldLines';
import { asHookSyncRowLines } from './asHookSyncRowLines';

const TEST_CASES = [
  {
    description: 'rows with no leaves render as flat branches',
    given: {
      rows: [
        { head: 'a → brain: +1', leaves: [] },
        { head: 'b → brain: +2', leaves: [] },
      ],
    },
    expect: { lines: ['   ├─ a → brain: +1', '   └─ b → brain: +2'] },
  },
  {
    description:
      'a fault row beside a peer carries its leaves under a continued stem',
    given: {
      rows: [
        { head: '✗ a → brain: fault', leaves: ['matcher = x', 'hint = y'] },
        { head: 'b → brain: +1', leaves: [] },
      ],
    },
    expect: {
      lines: [
        '   ├─ ✗ a → brain: fault',
        '   │  ├─ matcher = x',
        '   │  └─ hint = y',
        '   └─ b → brain: +1',
      ],
    },
  },
  {
    description: 'the last row carries its leaves under an open stem',
    given: {
      rows: [{ head: '✗ a → brain: fault', leaves: ['hint = y'] }],
    },
    expect: { lines: ['   └─ ✗ a → brain: fault', '      └─ hint = y'] },
  },
];

describe('asHookSyncRowLines', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const lines = asHookSyncRowLines({
        rows: thisCase.given.rows,
        indent: '   ',
      });
      expect(lines).toEqual(thisCase.expect.lines);
    }),
  );
});

describe('asHookFaultFieldLines', () => {
  test('renders each metadata field, the hint last, a line break as json', () => {
    const lines = asHookFaultFieldLines({
      error: new ConstraintError('refused', {
        hint: 'fix it',
        matcher: 'Bash\\d',
        command: 'echo a\necho b',
      }),
    });
    expect(lines).toEqual([
      'matcher = Bash\\d',
      'command = "echo a\\necho b"',
      'hint = fix it',
    ]);
  });

  test('an error with no metadata renders no lines', () => {
    expect(asHookFaultFieldLines({ error: new Error('plain') })).toEqual([]);
  });
});
