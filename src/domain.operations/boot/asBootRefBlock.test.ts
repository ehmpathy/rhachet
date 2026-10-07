import { given, then, when } from 'test-fns';

import { asBootRefBlock } from './asBootRefBlock';

describe('asBootRefBlock', () => {
  given('[case1] an empty roster', () => {
    when('[t0] no paths are reffed', () => {
      then('it emits no block at all', () => {
        expect(
          asBootRefBlock({ tag: 'briefs.ref', indent: '', paths: [] }),
        ).toEqual([]);
      });
    });
  });

  given('[case2] a roster that shares one directory', () => {
    const paths = ['a/b/one.md', 'a/b/two.md'];

    when('[t0] the block renders', () => {
      then('the shared base is hoisted into the header', () => {
        expect(
          asBootRefBlock({ tag: 'briefs.ref', indent: '', paths })[0],
        ).toEqual('<briefs.ref base="a/b/">');
      });

      then('each line carries its name alone', () => {
        expect(
          asBootRefBlock({ tag: 'briefs.ref', indent: '', paths }),
        ).toEqual([
          '<briefs.ref base="a/b/">',
          'one.md',
          'two.md',
          '</briefs.ref>',
          '',
        ]);
      });
    });
  });

  given('[case3] a roster whose siblings share a NAME STEM only', () => {
    // 🔴 the clamp on the segment-wise comparison. a character-wise prefix would cut
    //    `term=a` and leave a base no reader could open
    const paths = ['x/term=absent.md', 'x/term=accrual.md'];

    when('[t0] the block renders', () => {
      then('it hoists the directory, never the stem', () => {
        expect(
          asBootRefBlock({ tag: 'briefs.ref', indent: '', paths })[0],
        ).toEqual('<briefs.ref base="x/">');
      });

      then('each name survives intact', () => {
        const lines = asBootRefBlock({ tag: 'briefs.ref', indent: '', paths });
        expect(lines).toContain('term=absent.md');
        expect(lines).toContain('term=accrual.md');
      });
    });
  });

  given('[case4] a roster that shares no directory', () => {
    const paths = ['a/one.md', 'b/two.md'];

    when('[t0] the block renders', () => {
      then('the base is empty and each line keeps its full path', () => {
        expect(
          asBootRefBlock({ tag: 'briefs.ref', indent: '', paths }),
        ).toEqual([
          '<briefs.ref base="">',
          'a/one.md',
          'b/two.md',
          '</briefs.ref>',
          '',
        ]);
      });
    });
  });

  given('[case5] a roster at two depths under one root', () => {
    const paths = ['a/b/one.md', 'a/b/c/two.md'];

    when('[t0] the block renders', () => {
      then('the base is the deepest prefix BOTH paths share', () => {
        expect(
          asBootRefBlock({ tag: 'briefs.ref', indent: '', paths }),
        ).toEqual([
          '<briefs.ref base="a/b/">',
          'one.md',
          'c/two.md',
          '</briefs.ref>',
          '',
        ]);
      });
    });
  });

  given('[case6] an indented block, as `<also>` emits', () => {
    when('[t0] an indent is supplied', () => {
      then('the tags indent and the final blank line does not', () => {
        expect(
          asBootRefBlock({
            tag: 'skills.ref',
            paths: ['a/run.sh'],
            indent: '  ',
          }),
        ).toEqual([
          '  <skills.ref base="a/">',
          '  run.sh',
          '  </skills.ref>',
          '',
        ]);
      });
    });
  });
});
