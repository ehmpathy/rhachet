import { given, then, when } from 'test-fns';

import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

import { asRoleContentDefectNote } from './asRoleContentDefectNote';

const OWNED_ORPHAN: RoleContentDefect = {
  kind: 'orphan-min',
  ref: { repo: '.this', role: 'any' },
  pathToFile: '.agent/repo=.this/role=any/briefs/lost.md.min',
  detail: null,
};
const OWNED_UNPARSED: RoleContentDefect = {
  kind: 'spec-unparsed',
  ref: { repo: '.this', role: 'lint' },
  pathToFile: '.agent/repo=.this/role=lint/boot.yml',
  detail: 'boot.yml has invalid yaml',
};
const LINKED_ORPHAN: RoleContentDefect = {
  kind: 'orphan-min',
  ref: { repo: 'ehmpathy', role: 'mechanic' },
  pathToFile: '.agent/repo=ehmpathy/role=mechanic/briefs/gone.md.min',
  detail: null,
};
const LINKED_UNPARSED: RoleContentDefect = {
  kind: 'spec-unparsed',
  ref: { repo: 'ehmpathy', role: 'mechanic' },
  pathToFile: '.agent/repo=ehmpathy/role=mechanic/boot.yml',
  detail: 'boot.yml has invalid yaml',
};

describe('asRoleContentDefectNote', () => {
  given('[case1] an owned orphan-min defect', () => {
    when('[t0] the note is read', () => {
      const rows = asRoleContentDefectNote({ defect: OWNED_ORPHAN });

      then('it is one row', () => {
        expect(rows).toHaveLength(1);
      });

      then('the row names the set-aside, then the fix', () => {
        expect(rows[0]!.startsWith('an orphan .md.min, skipped — ')).toEqual(
          true,
        );
        expect(rows[0]).toContain('restore its .md source');
      });
    });
  });

  given('[case2] an owned spec-unparsed defect', () => {
    when('[t0] the note is read', () => {
      const rows = asRoleContentDefectNote({ defect: OWNED_UNPARSED });

      then('it is one row', () => {
        expect(rows).toHaveLength(1);
      });

      then('the row names the set-aside, then the fix', () => {
        expect(
          rows[0]!.startsWith('refused as a boot spec, so the role boots'),
        ).toEqual(true);
        expect(rows[0]).toContain(' — repair what the row below names');
      });
    });
  });

  given('[case3] a linked orphan-min defect', () => {
    when('[t0] the note is read', () => {
      const rows = asRoleContentDefectNote({ defect: LINKED_ORPHAN });

      then('it is three rows, one per lever', () => {
        expect(rows).toHaveLength(3);
      });

      then('the first row leads with the upgrade lever', () => {
        expect(rows[0]!.startsWith('an orphan .md.min, skipped — ')).toEqual(
          true,
        );
        expect(rows[0]!.endsWith('upgrade via rhx upgrade')).toEqual(true);
      });

      then(
        'the second row leads with the mod lever, at the absent source',
        () => {
          expect(rows[1]!.startsWith('or mod via a write to ')).toEqual(true);
          expect(rows[1]).toContain(
            '.agent/repo=.mods/role=mechanic/briefs/gone.md plus',
          );
        },
      );

      then(
        'the third row names the owner to report to, and no supplier skill',
        () => {
          expect(rows[2]!.startsWith('or report orphan-min in ')).toEqual(true);
          expect(rows[2]).toContain(
            'the owner of the rhachet-roles-ehmpathy package',
          );
          expect(rows.join('\n')).not.toContain('radio.task.push');
        },
      );

      then('the rows match the snapshot', () => {
        expect(rows.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case4] a linked spec-unparsed defect', () => {
    when('[t0] the note is read', () => {
      const rows = asRoleContentDefectNote({ defect: LINKED_UNPARSED });

      then('it is two rows, with no mod row', () => {
        expect(rows).toHaveLength(2);
        expect(rows.some((row) => row.startsWith('or mod via'))).toEqual(false);
      });

      then(
        'the rows lead with the upgrade lever, then the report lever',
        () => {
          expect(
            rows[0]!.startsWith('refused as a boot spec, so the role boots'),
          ).toEqual(true);
          expect(rows[0]!.endsWith('upgrade via rhx upgrade')).toEqual(true);
          expect(rows[1]!.startsWith('or report spec-unparsed in ')).toEqual(
            true,
          );
        },
      );
    });
  });
});
