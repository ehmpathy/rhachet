import { asSlugBaseOfActorExid } from './asSlugBaseOfActorExid';

const CASES = [
  { exid: 'slug=builder', expect: 'builder' },
  { exid: 'slug=builder._.delta=abc123', expect: 'builder' },
  { exid: 'slug=surf.school', expect: 'surf.school' },
  { exid: 'slug=surf.school._.delta=f00d', expect: 'surf.school' },
];

describe('asSlugBaseOfActorExid', () => {
  CASES.map((thisCase) =>
    test(`${thisCase.exid} → ${thisCase.expect}`, () => {
      expect(asSlugBaseOfActorExid({ exid: thisCase.exid })).toEqual(
        thisCase.expect,
      );
    }),
  );
});
