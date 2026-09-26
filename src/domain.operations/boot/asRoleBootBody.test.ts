import { given, then, when } from 'test-fns';

import { asRoleBootBody } from './asRoleBootBody';

const roleDir = '/repo/.agent/repo=ehmpathy/role=surfer';

describe('asRoleBootBody', () => {
  given(
    '[case1] a plan with a readme, a said brief, a ref brief, a said skill',
    () => {
      when('[t0] the body is composed', () => {
        const result = asRoleBootBody({
          slugRepo: 'ehmpathy',
          slugRole: 'surfer',
          roleDir,
          bootPlan: {
            briefs: {
              say: [
                {
                  pathToOriginal: `${roleDir}/briefs/wave.md`,
                  pathToMinified: `${roleDir}/briefs/wave.md.min`,
                },
              ],
              ref: [
                {
                  pathToOriginal: `${roleDir}/briefs/tide.md`,
                  pathToMinified: null,
                },
              ],
            },
            skills: { say: [`${roleDir}/skills/paddle.sh`], ref: [] },
            also: { briefs: [], skills: [] },
          },
          readme: { path: `${roleDir}/readme.md`, content: 'hang ten' },
          briefsSaid: [
            { path: `${roleDir}/briefs/wave.md.min`, content: 'ride it' },
          ],
          skillsSaid: [
            { path: `${roleDir}/skills/paddle.sh`, content: '# paddle' },
          ],
        });

        then(
          'the body lists each resource in order, with repo-relative paths',
          () => {
            expect(result.body).toEqual(
              [
                '<readme path=".agent/repo=ehmpathy/role=surfer/readme.md">',
                'hang ten',
                '</readme>',
                '',
                '<brief.say path=".agent/repo=ehmpathy/role=surfer/briefs/wave.md.min">',
                'ride it',
                '</brief.say>',
                '',
                '<brief.ref path=".agent/repo=ehmpathy/role=surfer/briefs/tide.md"/>',
                '',
                '<skill.say path=".agent/repo=ehmpathy/role=surfer/skills/paddle.sh">',
                '# paddle',
                '</skill.say>',
                '',
                '',
              ].join('\n'),
            );
          },
        );

        then('the census counts files and said chars', () => {
          expect(result.stats).toEqual({
            roles: 1,
            files: 4,
            briefsSay: 1,
            briefsRef: 1,
            skillsSay: 1,
            skillsRef: 0,
            chars: 'hang ten'.length + 'ride it'.length + '# paddle'.length,
          });
        });
      });
    },
  );

  given('[case2] a subject-mode plan with unclaimed resources', () => {
    when('[t0] the body is composed', () => {
      const result = asRoleBootBody({
        slugRepo: 'ehmpathy',
        slugRole: 'surfer',
        roleDir,
        bootPlan: {
          briefs: { say: [], ref: [] },
          skills: { say: [], ref: [] },
          also: {
            briefs: [
              {
                pathToOriginal: `${roleDir}/briefs/reef.md`,
                pathToMinified: null,
              },
            ],
            skills: [`${roleDir}/skills/wax.sh`],
          },
        },
        readme: null,
        briefsSaid: [],
        skillsSaid: [],
      });

      then('the body holds only the also section', () => {
        expect(result.body).toEqual(
          [
            '<also>',
            '  <brief.ref path=".agent/repo=ehmpathy/role=surfer/briefs/reef.md"/>',
            '  <skill.ref path=".agent/repo=ehmpathy/role=surfer/skills/wax.sh"/>',
            '</also>',
            '',
            '',
          ].join('\n'),
        );
      });

      then('the census counts the also resources as files, zero chars', () => {
        expect(result.stats.files).toEqual(2);
        expect(result.stats.chars).toEqual(0);
      });
    });
  });

  given('[case3] an empty plan with no readme', () => {
    when('[t0] the body is composed', () => {
      const result = asRoleBootBody({
        slugRepo: 'ehmpathy',
        slugRole: 'surfer',
        roleDir,
        bootPlan: {
          briefs: { say: [], ref: [] },
          skills: { say: [], ref: [] },
          also: { briefs: [], skills: [] },
        },
        readme: null,
        briefsSaid: [],
        skillsSaid: [],
      });

      then('the body is empty and the census is zero', () => {
        expect(result.body).toEqual('');
        expect(result.stats.files).toEqual(0);
      });
    });
  });
});
