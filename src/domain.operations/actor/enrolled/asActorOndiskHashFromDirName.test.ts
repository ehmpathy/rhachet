import { asActorOndiskDirName } from './asActorOndiskDirName';
import { asActorOndiskHashFromDirName } from './asActorOndiskHashFromDirName';

describe('asActorOndiskHashFromDirName', () => {
  it('parses the hash out of a bare dir-name token', () => {
    expect(
      asActorOndiskHashFromDirName({ dirName: 'actor.via.hash=9c1e0000' }),
    ).toEqual('9c1e0000');
  });

  it('is the exact inverse of asActorOndiskDirName (round-trip)', () => {
    // the whole point of the pair: construct then parse yields the original hash,
    // so the `actor.via.hash=` format is single-owned in BOTH directions
    const hash = 'abcd1234';
    const roundTripped = asActorOndiskHashFromDirName({
      dirName: asActorOndiskDirName({ hash }),
    });
    expect(roundTripped).toEqual(hash);
  });

  it('reads the token when embedded as a path segment (symlink target)', () => {
    expect(
      asActorOndiskHashFromDirName({
        dirName: '../actor.via.hash=9c1e0000/clones/serial=7f3a',
      }),
    ).toEqual('9c1e0000');
  });

  it('returns null when the name is not the token', () => {
    expect(asActorOndiskHashFromDirName({ dirName: 'serial=7f3a' })).toBeNull();
    expect(asActorOndiskHashFromDirName({ dirName: '.slugs' })).toBeNull();
  });
});
