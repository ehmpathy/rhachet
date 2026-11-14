import { asActorExidsUndeclared } from './asActorExidsUndeclared';

describe('asActorExidsUndeclared', () => {
  test('names a slug dir and a derived dir whose base left the manifest', () => {
    expect(
      asActorExidsUndeclared({
        exids: [
          'hash=abc123',
          'repo=ambient',
          'slug=builder',
          'slug=builder._.delta=f00d',
          'slug=scholar',
          'slug=scholar._.delta=beef',
        ],
        slugsDeclared: ['builder'],
      }),
    ).toEqual(['slug=scholar', 'slug=scholar._.delta=beef']);
  });

  test('never names a hash or repo actor, even with no slug declared', () => {
    expect(
      asActorExidsUndeclared({
        exids: ['hash=abc123', 'repo=ambient'],
        slugsDeclared: [],
      }),
    ).toEqual([]);
  });
});
