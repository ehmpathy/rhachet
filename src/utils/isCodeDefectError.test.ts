import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then } from 'test-fns';

import { runInNewContext } from 'node:vm';
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
  // a defect from another realm fails `instanceof`, yet is the same bug
  {
    description: 'a TypeError minted in another realm is a code defect',
    given: runInNewContext('new TypeError("x")'),
    expect: true,
  },
  {
    description:
      'a plain object that only names itself TypeError is not a code defect',
    given: { name: 'TypeError', message: 'x' },
    expect: false,
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
    given(thisCase.description, () => {
      then('it classifies the throw as expected', () => {
        expect(isCodeDefectError({ error: thisCase.given })).toEqual(
          thisCase.expect,
        );
      });
    }),
  );
});
