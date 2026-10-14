import { given, then, when } from 'test-fns';

import { asBrainGroveAbsentLine } from './asBrainGroveAbsentLine';

describe('asBrainGroveAbsentLine', () => {
  given('[case1] a box with no grove to link', () => {
    when('[t0] the line is rendered', () => {
      then('it names the absent path, the lost defaults, and the fix', () => {
        expect(
          asBrainGroveAbsentLine({
            groveSource: '/home/rook/.claude/settings.json',
          }),
        ).toEqual(
          'ℹ no grove at /home/rook/.claude/settings.json — box defaults did not apply; create it to share them with every clone',
        );
      });
    });
  });
});
