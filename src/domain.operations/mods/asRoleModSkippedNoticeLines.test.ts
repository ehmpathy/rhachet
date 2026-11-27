import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asRoleModSkippedNoticeLines } from './asRoleModSkippedNoticeLines';

describe('asRoleModSkippedNoticeLines', () => {
  given('[case1] a refused mod that names its fix', () => {
    when('[t0] the notice is rendered', () => {
      const lines = asRoleModSkippedNoticeLines({
        role: 'surfer',
        error: new ConstraintError(
          'the mod of role=surfer is refused: its not matches no file',
          {
            fix: 'point the not at a held path, or delete the line',
          },
        ),
      });

      then('it opens and closes the tag of the role', () => {
        expect(lines[0]).toEqual('<mod.skipped of="surfer">');
        expect(lines).toContain('</mod.skipped>');
      });

      then(
        'it says the role boots as published, names the problem by class, and the fix',
        () => {
          expect(lines).toContain(
            'role surfer boots as published in this repo — its mod is skipped until it is cured',
          );
          expect(lines.join('\n')).toContain(
            '✋ ConstraintError: the mod of role=surfer is refused',
          );
          expect(lines).toContain(
            'fix = point the not at a held path, or delete the line',
          );
        },
      );

      then('it names the mod dir the fault and its fix sit in', () => {
        expect(lines[2]).toEqual('mod = .agent/repo=.mods/role=surfer/');
      });

      then('the notice matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case2] a malfunction that names no fix', () => {
    when('[t0] the notice is rendered', () => {
      const lines = asRoleModSkippedNoticeLines({
        role: 'surfer',
        error: new MalfunctionError('the modded view record is unreadable', {
          path: '/x',
        }),
      });

      then('it carries no fix line', () => {
        expect(lines.some((line) => line.startsWith('fix = '))).toEqual(false);
      });

      then('the notice matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });
});
