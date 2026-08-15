import { getActorOndiskDir } from './getActorOndiskDir';
import { getActorsRootDir } from './getActorsRootDir';

describe('getActorsRootDir', () => {
  it('renders the `<repoPath>/.agent/.actors` root', () => {
    expect(getActorsRootDir({ repoPath: '/repo' })).toEqual(
      '/repo/.agent/.actors',
    );
  });

  it('is the root the per-actor dir builder composes (single source of truth)', () => {
    // getActorOndiskDir must sit UNDER the root, so a relocation touches ONLY
    // getActorsRootDir, never a scattered `.agent/.actors` literal
    const root = getActorsRootDir({ repoPath: '/repo' });
    const actorDir = getActorOndiskDir({
      repoPath: '/repo',
      hash: 'abcd1234',
    });
    expect(actorDir.startsWith(root)).toBe(true);
  });
});
