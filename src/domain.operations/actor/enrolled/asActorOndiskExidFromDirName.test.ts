import { given, then, when } from 'test-fns';

import { asActorOndiskDirName } from './asActorOndiskDirName';
import { asActorOndiskExidFromDirName } from './asActorOndiskExidFromDirName';

describe('asActorOndiskExidFromDirName', () => {
  given('[case1] a hash actor dir name', () => {
    when('[t0] it is a bare dir-name token', () => {
      then('the exid is parsed out of it', () => {
        expect(
          asActorOndiskExidFromDirName({ dirName: 'actor.via.hash=9c1e0000' }),
        ).toEqual('hash=9c1e0000');
      });
    });
    when('[t1] it is embedded as a path segment (a symlink target)', () => {
      then('the exid is still read', () => {
        expect(
          asActorOndiskExidFromDirName({
            dirName: '../actor.via.hash=9c1e0000/clones/serial=7f3a',
          }),
        ).toEqual('hash=9c1e0000');
      });
    });
    when('[t2] it was built by asActorOndiskDirName', () => {
      then('the parse is its exact inverse (round-trip)', () => {
        // the whole point of the pair: construct then parse yields the original exid,
        // so the `actor.via.` format is single-owned in BOTH directions
        const exid = 'hash=abcd1234';
        expect(
          asActorOndiskExidFromDirName({
            dirName: asActorOndiskDirName({ exid }),
          }),
        ).toEqual(exid);
      });
    });
  });

  given('[case2] the repo actor dir name', () => {
    when('[t0] it is parsed', () => {
      then('the exid is repo=ambient', () => {
        expect(
          asActorOndiskExidFromDirName({ dirName: 'actor.via.repo=ambient' }),
        ).toEqual('repo=ambient');
      });
    });
  });

  given('[case3] a name that is not an actor exid token', () => {
    when('[t0] it is no actor dir at all', () => {
      then('null', () => {
        expect(
          asActorOndiskExidFromDirName({ dirName: 'serial=7f3a' }),
        ).toBeNull();
        expect(asActorOndiskExidFromDirName({ dirName: '.slugs' })).toBeNull();
      });
    });
    when('[t1] it is a slug dir, which enroll never mints', () => {
      then('null', () => {
        expect(
          asActorOndiskExidFromDirName({ dirName: 'actor.via.slug=.default' }),
        ).toBeNull();
        expect(
          asActorOndiskExidFromDirName({ dirName: 'actor.via.slug=mechanic' }),
        ).toBeNull();
      });
    });
  });
});
