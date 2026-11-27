import { given, then, when } from 'test-fns';

import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

import { asRoleContentDefectHookWarnLines } from './asRoleContentDefectHookWarnLines';

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

describe('asRoleContentDefectHookWarnLines', () => {
  given('[case1] one linked defect', () => {
    when('[t0] the warn lines are rendered', () => {
      const lines = asRoleContentDefectHookWarnLines({
        invocation: 'roles cost --all --when hook.onStop',
        defects: [LINKED_ORPHAN],
      });

      then('the header names the invocation', () => {
        expect(lines[0]).toEqual('🧢 roles cost --all --when hook.onStop');
      });

      then('the count noun is singular', () => {
        expect(lines[1]).toContain('1 linked role content defect,');
        expect(lines[1]).not.toContain('defects');
      });

      then('the defect rows follow the count row', () => {
        expect(lines[2]).toContain(LINKED_ORPHAN.pathToFile);
      });
    });
  });

  given('[case2] two linked defects', () => {
    when('[t0] the warn lines are rendered', () => {
      const lines = asRoleContentDefectHookWarnLines({
        invocation: 'roles cost --all --when hook.onStop',
        defects: [LINKED_ORPHAN, LINKED_UNPARSED],
      });

      then('the count noun is plural', () => {
        expect(lines[1]).toContain('2 linked role content defects,');
      });

      then('each defect is named', () => {
        expect(lines.some((l) => l.includes(LINKED_ORPHAN.pathToFile))).toEqual(
          true,
        );
        expect(
          lines.some((l) => l.includes(LINKED_UNPARSED.pathToFile)),
        ).toEqual(true);
      });

      then('the lines match the snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });
});
