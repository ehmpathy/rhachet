import { asShellEscapedSecret } from './asShellEscapedSecret';

const TEST_CASES = [
  {
    description: 'wraps normal secret in single quotes',
    given: { secret: 'secret' },
    expect: "'secret'",
  },
  {
    description: 'escapes single quote with end-escape-start pattern',
    given: { secret: "sec'ret" },
    expect: "'sec'\\''ret'",
  },
  {
    description: 'uses ANSI-C syntax for newlines',
    given: { secret: 'line1\nline2' },
    expect: "$'line1\\nline2'",
  },
  {
    description: 'preserves backslash in plain quotes',
    given: { secret: 'back\\slash' },
    expect: "'back\\slash'",
  },
  {
    description: 'handles multiple single quotes',
    given: { secret: "it's a test's test" },
    expect: "'it'\\''s a test'\\''s test'",
  },
  {
    description: 'handles empty secret',
    given: { secret: '' },
    expect: "''",
  },
  {
    description: 'handles secret with only single quote',
    given: { secret: "'" },
    expect: "''\\'''",
  },
  {
    description: 'handles tab character with ANSI-C syntax',
    given: { secret: 'col1\tcol2' },
    expect: "$'col1\\tcol2'",
  },
  {
    description: 'handles carriage return with ANSI-C syntax',
    given: { secret: 'line1\r\nline2' },
    expect: "$'line1\\r\\nline2'",
  },
  {
    description: 'escapes backslash in ANSI-C mode when newlines present',
    given: { secret: 'path\\name\nline2' },
    expect: "$'path\\\\name\\nline2'",
  },
  {
    description: 'escapes single quote in ANSI-C mode when newlines present',
    given: { secret: "it's\nmultiline" },
    expect: "$'it\\'s\\nmultiline'",
  },
  {
    description: 'handles mixed special chars in ANSI-C mode',
    given: { secret: "line1\nit's\\complex" },
    expect: "$'line1\\nit\\'s\\\\complex'",
  },
];

describe('asShellEscapedSecret', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const result = asShellEscapedSecret(thisCase.given);
      expect(result).toEqual(thisCase.expect);
    }),
  );

  test('snapshot of all cases', () => {
    const results = TEST_CASES.map((thisCase) => ({
      input: thisCase.given.secret,
      output: asShellEscapedSecret(thisCase.given),
    }));
    expect(results).toMatchSnapshot();
  });
});
