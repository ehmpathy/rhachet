import { given, then, when } from 'test-fns';

import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

import { asRoleContentDefectsUnique } from './asRoleContentDefectsUnique';

const asDefect = (input: {
  kind: RoleContentDefect['kind'];
  pathToFile: string;
}): RoleContentDefect => ({
  kind: input.kind,
  ref: { repo: '.this', role: 'any' },
  pathToFile: input.pathToFile,
  detail: null,
});

const ORPHAN = asDefect({ kind: 'orphan-min', pathToFile: 'a.md.min' });
const BOUNDARY = asDefect({ kind: 'boundary-literal', pathToFile: 'b.md' });
const BOUNDARY_SAME_FILE_OTHER_KIND = asDefect({
  kind: 'orphan-min',
  pathToFile: 'b.md',
});

const TEST_CASES = [
  {
    description: 'no defects stay none',
    given: [],
    expect: [],
  },
  {
    description: 'one defect seen in two brain dirs is named once',
    given: [ORPHAN, BOUNDARY, ORPHAN],
    expect: [ORPHAN, BOUNDARY],
  },
  {
    description: 'one file with two kinds keeps both',
    given: [BOUNDARY, BOUNDARY_SAME_FILE_OTHER_KIND],
    expect: [BOUNDARY, BOUNDARY_SAME_FILE_OTHER_KIND],
  },
];

describe('asRoleContentDefectsUnique', () => {
  given('[case1] the defects of several renders', () => {
    TEST_CASES.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then('each file and kind is kept once, in first-seen order', () => {
          expect(
            asRoleContentDefectsUnique({ defects: thisCase.given }),
          ).toEqual(thisCase.expect);
        });
      }),
    );
  });
});
