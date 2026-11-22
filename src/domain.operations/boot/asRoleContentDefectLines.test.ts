import { given, then, when } from 'test-fns';

import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

import { asRoleContentDefectLines } from './asRoleContentDefectLines';

const ORPHAN: RoleContentDefect = {
  kind: 'orphan-min',
  ref: { repo: '.this', role: 'any' },
  pathToFile: '.agent/repo=.this/role=any/briefs/lost.md.min',
  detail: null,
};
const UNPARSED: RoleContentDefect = {
  kind: 'spec-unparsed',
  ref: { repo: '.this', role: 'lint' },
  pathToFile: '.agent/repo=.this/role=lint/boot.yml',
  detail: 'boot.yml has invalid yaml',
};

describe('asRoleContentDefectLines', () => {
  given('[case1] one defect with no detail', () => {
    when('[t0] the lines are rendered at the last branch', () => {
      const lines = asRoleContentDefectLines({
        defects: [ORPHAN],
        indent: '',
        peersAfter: 0,
      });

      then('the file row leads, with the last elbow', () => {
        expect(lines[0]).toEqual(`└─ ${ORPHAN.pathToFile}`);
      });

      then('the note is the only child row', () => {
        expect(lines).toHaveLength(2);
        expect(lines[1]!.includes('an orphan .md.min, skipped — ')).toEqual(
          true,
        );
      });
    });
  });

  given('[case2] one defect with a detail', () => {
    when('[t0] the lines are rendered at the last branch', () => {
      const lines = asRoleContentDefectLines({
        defects: [UNPARSED],
        indent: '',
        peersAfter: 0,
      });

      then('the detail is the last child row', () => {
        expect(lines).toHaveLength(3);
        expect(
          lines[lines.length - 1]!.includes('boot.yml has invalid yaml'),
        ).toEqual(true);
      });
    });
  });

  given('[case3] two defects', () => {
    when('[t0] the lines are rendered under an indent', () => {
      const lines = asRoleContentDefectLines({
        defects: [ORPHAN, UNPARSED],
        indent: '   ',
        peersAfter: 0,
      });

      then(
        'the first defect uses the middle elbow, its children on the spine',
        () => {
          expect(lines[0]).toEqual(`   ├─ ${ORPHAN.pathToFile}`);
          expect(lines[1]!.startsWith('   │')).toEqual(true);
        },
      );

      then('the last defect uses the last elbow', () => {
        const rowLast = lines.find((line) =>
          line.includes(UNPARSED.pathToFile),
        );
        expect(rowLast).toEqual(`   └─ ${UNPARSED.pathToFile}`);
      });

      then('the lines match the snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case4] one defect, with a peer branch after it', () => {
    when('[t0] the lines are rendered with one peer after', () => {
      const lines = asRoleContentDefectLines({
        defects: [ORPHAN],
        indent: '',
        peersAfter: 1,
      });

      then('the defect reads with the middle elbow', () => {
        expect(lines[0]).toEqual(`├─ ${ORPHAN.pathToFile}`);
      });
    });
  });
});
