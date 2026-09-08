import { given, then, when } from 'test-fns';

import { matchesAnyMarker } from './matchesAnyMarker';

describe('matchesAnyMarker', () => {
  given('[case1] a marker set where one member matches', () => {
    const markers = [/ERR_DLOPEN_FAILED/, /NODE_MODULE_VERSION/];

    when('[t0] the text carries the second marker', () => {
      then('it is a match — the quantifier is ANY, never every', () => {
        expect(
          matchesAnyMarker({
            markers,
            text: 'was compiled against a different NODE_MODULE_VERSION',
          }),
        ).toEqual(true);
      });
    });

    when('[t1] the text carries no marker', () => {
      then('it is not a match', () => {
        expect(
          matchesAnyMarker({ markers, text: 'read is not a function' }),
        ).toEqual(false);
      });
    });
  });

  given('[case2] an EMPTY marker set', () => {
    when('[t0] some text is asked against it', () => {
      then('it is not a match — no marker can vouch for it', () => {
        // `.every` over an empty set answers true, so this row pins the quantifier
        expect(matchesAnyMarker({ markers: [], text: 'some text' })).toEqual(
          false,
        );
      });
    });
  });

  given('[case3] 🚨 a STATEFUL marker — one that carries the /g flag', () => {
    // the clamp: `.test` advances a `/g` marker's `lastIndex`, and markers are
    // module-level constants, so the state would leak across classifiers. goes RED
    // against a `.test` body, green against `.search`.
    const markerStateful = /EACCES/g;

    when('[t0] the SAME marker is asked twice, against the same text', () => {
      then('both answers agree — the read leaves no residue', () => {
        const text = 'EACCES: permission denied';

        expect({
          first: matchesAnyMarker({ markers: [markerStateful], text }),
          second: matchesAnyMarker({ markers: [markerStateful], text }),
        }).toEqual({ first: true, second: true });
      });
    });

    when('[t1] a PRIOR call left residue, then a new text is asked', () => {
      then('the new read is decided by the text alone', () => {
        // a `.test` body leaves `lastIndex` past the token in the shorter text below
        matchesAnyMarker({
          markers: [markerStateful],
          text: 'npm ERR! EACCES: permission denied, mkdir',
        });

        expect(
          matchesAnyMarker({ markers: [markerStateful], text: 'EACCES' }),
        ).toEqual(true);
      });
    });
  });
});
