import { given, then, when } from 'test-fns';

import { getOneRhachetBootIntro } from './getOneRhachetBootIntro';

describe('getOneRhachetBootIntro', () => {
  given('[case1] the intro is read', () => {
    when('[t0] it is rendered', () => {
      const intro = getOneRhachetBootIntro();

      then('it is one say brief, addressed as rhachet/intro', () => {
        expect(
          intro.body.startsWith('<brief.say path="rhachet/intro">\n'),
        ).toBe(true);
        expect(intro.body).toContain('</brief.say>\n');
        expect(intro.stats.briefsSay).toEqual(1);
      });

      then('it names rhx list, the skill help, and entool', () => {
        expect(intro.body).toContain('`rhx list`');
        expect(intro.body).toContain('`rhx <skill> --help`');
        expect(intro.body).toContain('entool');
        expect(intro.body).toContain('.agent/repo=.this/role=any/skills/');
      });

      then('it needs no role — the census counts none', () => {
        expect(intro.stats.roles).toEqual(0);
      });
    });

    when('[t1] it is rendered twice', () => {
      then('the two renders are byte-identical', () => {
        expect(getOneRhachetBootIntro()).toEqual(getOneRhachetBootIntro());
      });
    });
  });
});
