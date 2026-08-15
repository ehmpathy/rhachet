import { asCloneDirName } from './asCloneDirName';
import { asCloneSerialFromDirName } from './asCloneSerialFromDirName';

describe('asCloneSerialFromDirName', () => {
  it('parses the serial out of a bare dir-name token', () => {
    expect(asCloneSerialFromDirName({ dirName: 'serial=7f3a' })).toEqual(
      '7f3a',
    );
  });

  it('is the exact inverse of asCloneDirName (round-trip)', () => {
    // construct then parse yields the original serial, so the `serial=` format is
    // single-owned in BOTH directions
    const serial = '7f3a-1234';
    const roundTripped = asCloneSerialFromDirName({
      dirName: asCloneDirName({ serial }),
    });
    expect(roundTripped).toEqual(serial);
  });

  it('reads the token when embedded as a path segment (symlink target)', () => {
    expect(
      asCloneSerialFromDirName({
        dirName: '../actor.via.hash=9c1e0000/clones/serial=7f3a',
      }),
    ).toEqual('7f3a');
  });

  it('returns null when the name is not the token', () => {
    expect(
      asCloneSerialFromDirName({ dirName: 'actor.via.hash=9c1e0000' }),
    ).toBeNull();
    expect(asCloneSerialFromDirName({ dirName: '.slugs' })).toBeNull();
  });
});
