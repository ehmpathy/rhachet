import { given, then, when } from 'test-fns';

import { getAllKeyrackSlugsWithNoScope } from './getAllKeyrackSlugsWithNoScope';

/**
 * .what = the clamp on "which rows can no scope flag ever claim?"
 * .why = a filter drop is INVISIBLE by construction — the row is gone, the exit is 0, and the
 *        render looks identical to a rack that never held it. so the set of unfilterable rows has
 *        to be nameable on its own before a notice can report it (`rule.forbid.failhide`)
 *
 * .note = the answer must agree, row for row, with what `getAllKeyrackSlugsForOrg` excludes —
 *         both read the SAME decoder, which is what keeps the notice from a report of a row the
 *         filter actually kept, or a silence on one it dropped
 */
describe('getAllKeyrackSlugsWithNoScope', () => {
  given('[case1] a rack of well-formed slugs', () => {
    when('[t0] every row names an org and an env', () => {
      then('no row is unscopable', () => {
        expect(
          getAllKeyrackSlugsWithNoScope({
            slugs: [
              '@all.camp.GITHUB_TOKEN',
              'ehmpathy.prep.AWS_PROFILE',
              'ehmpathy.all.SHARED',
              'ehmpathy.sudo.LAPTOP_PW',
            ],
          }),
        ).toEqual([]);
      });
    });
  });

  given('[case2] a rack that holds hand-authored rows', () => {
    const slugs = [
      '@all.camp.GITHUB_TOKEN', // full
      'MY_KEY', // bare — names no axis
      'my.api.KEY', // dotted, but `api` is no valid env
      '@all.badenv.FOO', // sigil org, invalid env ⇒ read as bare
      'ehmpathy.prep.AWS_PROFILE', // full
    ];

    when('[t0] the unscopable rows are reported', () => {
      // ⚠️ .why = these are exactly the rows a `--org`/`--env` filter drops. before this
      //        operation the drop was correct AND silent, so a human read a hidden row as an
      //        absent credential — on a CREDENTIAL tool, the worst confusion available
      then('each row that names neither axis is reported', () => {
        expect(getAllKeyrackSlugsWithNoScope({ slugs })).toEqual([
          'MY_KEY',
          'my.api.KEY',
          '@all.badenv.FOO',
        ]);
      });

      then('the well-formed rows are NOT reported', () => {
        const unscopable = getAllKeyrackSlugsWithNoScope({ slugs });
        expect(unscopable).not.toContain('@all.camp.GITHUB_TOKEN');
        expect(unscopable).not.toContain('ehmpathy.prep.AWS_PROFILE');
      });
    });
  });

  given('[case3] an empty rack', () => {
    when('[t0] no row is held', () => {
      then('the answer is empty, never a throw', () => {
        expect(getAllKeyrackSlugsWithNoScope({ slugs: [] })).toEqual([]);
      });
    });
  });
});
