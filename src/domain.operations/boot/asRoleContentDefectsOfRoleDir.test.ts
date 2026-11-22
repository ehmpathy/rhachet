import { given, then, when } from 'test-fns';

import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

import { asRoleContentDefectsOfRoleDir } from './asRoleContentDefectsOfRoleDir';

const asDefect = (input: {
  kind: RoleContentDefect['kind'];
  pathToFile: string;
}): RoleContentDefect => ({
  kind: input.kind,
  ref: { repo: '.this', role: 'any' },
  pathToFile: input.pathToFile,
  detail: null,
});

const ORPHAN = asDefect({ kind: 'orphan-min', pathToFile: 'lost.md.min' });
const BOUNDARY = asDefect({ kind: 'boundary-literal', pathToFile: 'core.md' });

describe('asRoleContentDefectsOfRoleDir', () => {
  given('[case1] a role dir that a boot reads (it declares a boot.yml)', () => {
    when('[t0] its defects are read', () => {
      then('every defect is kept', () => {
        expect(
          asRoleContentDefectsOfRoleDir({
            defects: [ORPHAN, BOUNDARY],
            isRoleBooted: true,
          }),
        ).toEqual([ORPHAN, BOUNDARY]);
      });
    });
  });

  given('[case2] a role dir no boot reads (no boot.yml)', () => {
    when('[t0] its defects are read', () => {
      then('the orphan is kept: a broken file pair, booted or not', () => {
        expect(
          asRoleContentDefectsOfRoleDir({
            defects: [ORPHAN, BOUNDARY],
            isRoleBooted: false,
          }),
        ).toEqual([ORPHAN]);
      });

      then(
        'a lone boundary literal is dropped: no booted body holds it',
        () => {
          expect(
            asRoleContentDefectsOfRoleDir({
              defects: [BOUNDARY],
              isRoleBooted: false,
            }),
          ).toEqual([]);
        },
      );
    });
  });
});
