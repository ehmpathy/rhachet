import { getCloneDir } from './getCloneDir';

describe('getCloneDir', () => {
  test('nests the clone under its actor dir, keyed by serial', () => {
    const dir = getCloneDir({
      actorDir: '/repo/.agent/.actors/actor.via.hash=9c1e',
      serial: '7f3a',
    });
    expect(dir).toEqual(
      '/repo/.agent/.actors/actor.via.hash=9c1e/clones/serial=7f3a',
    );
  });

  test('is a pure derivation — same input, same output', () => {
    const input = { actorDir: '/a/b', serial: 'abc' };
    expect(getCloneDir(input)).toEqual(getCloneDir(input));
  });
});
