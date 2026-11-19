import { isHookMatcherPortable } from './isHookMatcherPortable';

const TEST_CASES = [
  { matcher: '*', expected: true, why: 'a wildcard' },
  { matcher: '', expected: true, why: 'an empty matcher' },
  { matcher: 'Bash', expected: true, why: 'one name' },
  { matcher: 'Read|Write|Edit', expected: true, why: 'an exact list by |' },
  { matcher: 'Read,Edit', expected: true, why: 'an exact list by ,' },
  {
    matcher: 'mcp__.*',
    expected: true,
    why: 'a regex both engines read alike',
  },
  { matcher: '^(Write|Edit)$', expected: true, why: 'an anchored group' },
  { matcher: 'Notebook[A-Z][a-z]+', expected: true, why: 'a bracket class' },
  {
    matcher: 'mcp__\\w+',
    expected: false,
    why: '\\w, which ere does not read',
  },
  { matcher: 'Tool\\d', expected: false, why: '\\d, which ere does not read' },
  { matcher: '\\bBash\\b', expected: false, why: 'a word boundary' },
  { matcher: '(?i)bash', expected: false, why: 'an inline flag group' },
  { matcher: '(?:Write|Edit)', expected: false, why: 'a non-capture group' },
  { matcher: 'mcp__.*?', expected: false, why: 'a lazy quantifier' },
];

describe('isHookMatcherPortable', () => {
  TEST_CASES.map((thisCase) =>
    test(`'${thisCase.matcher}' → ${thisCase.expected} (${thisCase.why})`, () => {
      expect(isHookMatcherPortable({ matcher: thisCase.matcher })).toEqual(
        thisCase.expected,
      );
    }),
  );
});
