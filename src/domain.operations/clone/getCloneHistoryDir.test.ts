import { getCloneDir } from './getCloneDir';
import { getCloneHistoryDir } from './getCloneHistoryDir';

describe('getCloneHistoryDir', () => {
  test('nests history/ under the clone dir', () => {
    const dir = getCloneHistoryDir({
      cloneDir: '/repo/.agent/.actors/actor.via.hash=9c1e/clones/serial=7f3a',
    });
    expect(dir).toEqual(
      '/repo/.agent/.actors/actor.via.hash=9c1e/clones/serial=7f3a/history',
    );
  });

  test('composes with getCloneDir as the single-owner pair', () => {
    // the two builders own adjacent segments; composed, they yield the full path.
    // this pins that a rename of either segment is one edit at one owner
    const cloneDir = getCloneDir({
      actorDir: '/a/b/actor.via.hash=9c1e',
      serial: 'abc',
    });
    expect(getCloneHistoryDir({ cloneDir })).toEqual(
      '/a/b/actor.via.hash=9c1e/clones/serial=abc/history',
    );
  });

  test('is a pure derivation — same input, same output', () => {
    const input = { cloneDir: '/a/b' };
    expect(getCloneHistoryDir(input)).toEqual(getCloneHistoryDir(input));
  });
});
