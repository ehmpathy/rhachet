import { isActorExidDeclared } from './isActorExidDeclared';

const CASES = [
  { exid: 'slug=builder', expect: true },
  { exid: 'slug=builder._.delta=abc123', expect: true },
  { exid: 'hash=abc123', expect: false },
  { exid: 'repo=ambient', expect: false },
  { exid: 'slug=.default', expect: true },
];

describe('isActorExidDeclared', () => {
  CASES.map((thisCase) =>
    test(`${thisCase.exid} → ${thisCase.expect}`, () => {
      expect(isActorExidDeclared({ exid: thisCase.exid })).toEqual(
        thisCase.expect,
      );
    }),
  );
});
