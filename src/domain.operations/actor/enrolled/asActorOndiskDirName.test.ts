import { asActorOndiskDirName } from './asActorOndiskDirName';
import { getActorOndiskDir } from './getActorOndiskDir';

describe('asActorOndiskDirName', () => {
  it('renders the `actor.via.hash=<hash>` token', () => {
    expect(asActorOndiskDirName({ hash: '9c1e0000' })).toEqual(
      'actor.via.hash=9c1e0000',
    );
  });

  it('is the token the full-path builder composes (single source of truth)', () => {
    // the whole point of the transformer: getActorOndiskDir must end with the
    // exact token, so a format change touches ONLY asActorOndiskDirName
    const dir = getActorOndiskDir({ repoPath: '/repo', hash: 'abcd1234' });
    expect(dir.endsWith(asActorOndiskDirName({ hash: 'abcd1234' }))).toBe(true);
  });
});
