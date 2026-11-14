import { given, then, when } from 'test-fns';

import { genSampleRoleModPlan } from '@src/.test/assets/genSampleRoleModPlan';

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
          focus: null,
          mod: null,
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
        focus: null,
        mod: null,
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
        focus: null,
        mod: null,
      });

      then('the body is empty and the census is zero', () => {
        expect(result.body).toEqual('');
        expect(result.stats.files).toEqual(0);
      });
    });
  });

  given('[case4] a focused role, one subject said', () => {
    const genBody = (input: {
      given: string[];
      elsewhere: string[];
      alwaysShed: boolean;
    }) =>
      asRoleBootBody({
        slugRepo: 'ehmpathy',
        slugRole: 'surfer',
        roleDir,
        bootPlan: {
          briefs: {
            say: [
              {
                pathToOriginal: `${roleDir}/briefs/wave.md`,
                pathToMinified: null,
              },
            ],
            ref: [],
          },
          skills: { say: [], ref: [] },
          also: { briefs: [], skills: [] },
        },
        readme: null,
        briefsSaid: [{ path: `${roleDir}/briefs/wave.md`, content: 'ride it' }],
        skillsSaid: [],
        focus: {
          given: input.given,
          elsewhere: input.elsewhere,
          alwaysShed: input.alwaysShed,
        },
        mod: null,
      });

    when('[t0] the body is composed with always kept', () => {
      const result = genBody({
        given: ['101'],
        elsewhere: ['reef', 'tide'],
        alwaysShed: false,
      });

      then('the focus line leads, and names the subjects not given', () => {
        expect(result.body.split('\n')[0]).toEqual(
          '<focus given="101" elsewhere="reef,tide" always="kept"/>',
        );
      });

      then('the focus line adds no file to the census', () => {
        expect(result.stats.files).toEqual(1);
      });

      then('the body matches its snapshot', () => {
        expect(result.body).toMatchSnapshot();
      });
    });

    when('[t1] the body is composed with always shed', () => {
      const result = genBody({
        given: ['101'],
        elsewhere: ['reef', 'tide'],
        alwaysShed: true,
      });

      then('the focus line says always was shed', () => {
        expect(result.body.split('\n')[0]).toContain('always="shed"');
      });
    });

    when('[t2] the focus names every declared subject', () => {
      const result = genBody({
        given: ['101', 'reef', 'tide'],
        elsewhere: [],
        alwaysShed: false,
      });

      then('the focus line names none elsewhere', () => {
        expect(result.body.split('\n')[0]).toEqual(
          '<focus given="101,reef,tide" elsewhere="" always="kept"/>',
        );
      });

      then('the focus line matches its snapshot', () => {
        expect(result.body.split('\n')[0]).toMatchSnapshot();
      });
    });
  });

  given(
    '[case5] a modded role: a shadow, an add, a not, a dropped .md.min',
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
                  pathToMinified: null,
                },
                {
                  pathToOriginal: `${roleDir}/briefs/reef.md`,
                  pathToMinified: null,
                },
              ],
              ref: [
                {
                  pathToOriginal: `${roleDir}/briefs/tide.md`,
                  pathToMinified: null,
                },
              ],
            },
            skills: { say: [], ref: [`${roleDir}/skills/paddle.sh`] },
            also: { briefs: [], skills: [] },
          },
          readme: null,
          briefsSaid: [
            { path: `${roleDir}/briefs/wave.md`, content: 'ride it, modded' },
            { path: `${roleDir}/briefs/reef.md`, content: 'mind the reef' },
          ],
          skillsSaid: [],
          focus: null,
          mod: {
            ofLabel: 'ehmpathy/surfer@1.2.3',
            plan: genSampleRoleModPlan({
              shadows: ['briefs/wave.md'],
              adds: ['briefs/reef.md'],
              nots: ['briefs/wipeout.md'],
              minsDropped: ['briefs/wave.md.min'],
            }),
          },
        });
        const lines = result.body.split('\n');

        then('the mod notice leads the body, before any resource', () => {
          expect(lines[0]).toContain('ehmpathy/surfer@1.2.3');
          expect(
            lines.findIndex((line) => line.includes('<brief.say')),
          ).toBeGreaterThan(0);
        });

        then('the notice says the shadow drops the published .md.min', () => {
          expect(lines).toContain(
            '[~] shadow briefs/wave.md drops the published briefs/wave.md.min',
          );
        });

        then('the shadowed brief carries mod="shadow"', () => {
          expect(lines).toContain(
            '<brief.say path=".agent/repo=ehmpathy/role=surfer/briefs/wave.md" mod="shadow">',
          );
        });

        then('the added brief carries mod="add"', () => {
          expect(lines).toContain(
            '<brief.say path=".agent/repo=ehmpathy/role=surfer/briefs/reef.md" mod="add">',
          );
        });

        then('an untouched resource carries no mod attr', () => {
          expect(lines).toContain(
            '<brief.ref path=".agent/repo=ehmpathy/role=surfer/briefs/tide.md"/>',
          );
          expect(lines).toContain(
            '<skill.ref path=".agent/repo=ehmpathy/role=surfer/skills/paddle.sh"/>',
          );
        });

        then('the body matches its snapshot', () => {
          expect(result.body).toMatchSnapshot();
        });
      });
    },
  );
});
