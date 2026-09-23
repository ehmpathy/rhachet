import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { isCodeDefectError } from './isCodeDefectError';

const TEST_CASES: { description: string; given: unknown; expect: boolean }[] = [
  // the four JS-defect classes — a code bug, so LOUD (r002-i010-n2/n3)
  {
    description: 'a TypeError is a code defect',
    given: new TypeError('x'),
    expect: true,
  },
  {
    description: 'a RangeError is a code defect',
    given: new RangeError('x'),
    expect: true,
  },
  {
    description: 'a ReferenceError is a code defect',
    given: new ReferenceError('x'),
    expect: true,
  },
  {
    description: 'a SyntaxError is a code defect',
    given: new SyntaxError('x'),
    expect: true,
  },
  // the classed transport/runtime faults — NOT a defect, so they degrade
  {
    description: 'a MalfunctionError (a transport fault) is not a code defect',
    given: new MalfunctionError('socket refused', {}),
    expect: false,
  },
  {
    description: 'a ConstraintError (a caller fault) is not a code defect',
    given: new ConstraintError('bad input', {}),
    expect: false,
  },
  {
    description:
      'a plain Error is not a code defect (an expected runtime throw)',
    given: new Error('pty write errno EIO'),
    expect: false,
  },
  // non-Error throws — not a defect class either
  {
    description: 'a string throw is not a code defect',
    given: 'boom',
    expect: false,
  },
  { description: 'null is not a code defect', given: null, expect: false },
  {
    description: 'undefined is not a code defect',
    given: undefined,
    expect: false,
  },
];

describe('isCodeDefectError', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isCodeDefectError(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
