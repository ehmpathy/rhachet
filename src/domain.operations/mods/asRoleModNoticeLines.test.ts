import { given, then, when } from 'test-fns';

import { genSampleRoleModPlan } from '@src/.test/assets/genSampleRoleModPlan';

import { asRoleModNoticeLines } from './asRoleModNoticeLines';

describe('asRoleModNoticeLines', () => {
  given('[case1] a mod that shadows, adds, and nots', () => {
    when('[t0] the notice is rendered', () => {
      const lines = asRoleModNoticeLines({
        of: 'ehmpathy/mechanic@1.39.5',
        plan: genSampleRoleModPlan({
          nots: ['briefs/rule.forbid.wipeouts.md'],
          minsDropped: [
            'briefs/rule.forbid.wipeouts.md.min',
            'briefs/rule.require.surf-wax.md.min',
          ],
        }),
      });

      then('it counts each kind', () => {
        expect(lines).toContain(
          'role ehmpathy/mechanic@1.39.5 is modded in this repo — 1 shadow, 1 add, 1 not',
        );
      });

      then(
        'it lists each not by path, since a not leaves no resource to tag',
        () => {
          expect(lines).toContain('[-] not briefs/rule.forbid.wipeouts.md');
        },
      );

      then(
        'it names the minification a shadow drops, never one a not drops',
        () => {
          expect(lines).toContain(
            '[~] shadow briefs/rule.require.surf-wax.md drops the published briefs/rule.require.surf-wax.md.min',
          );
          expect(lines.join('\n')).not.toContain('wipeouts.md drops');
        },
      );

      then('the notice matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });
});
