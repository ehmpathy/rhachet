import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { genSampleRepoWithRoles } from './genSampleRepoWithRoles';

/**
 * .what = a sample repo whose native role `.this/any` declares subjects, beside `fixture/zeta`
 * .why = the focus suites (render, cost) all need one role with an `always` block, a subject
 *   that inherits it, and a subject that sheds it (rule.require.shared-test-fixtures)
 *
 * .note = each brief body names its section, so a suite asserts a section reached a boot by
 *   that text alone:
 *   - `always` → `briefs/base.md` = `any base body`
 *   - `subject.flow` (inherits always) → `briefs/flow.md` = `any flow body`, and the skill
 *     `skills/flow.sh`
 *   - `subject.lean` (sheds always) → `briefs/lean.md` = `any lean body`
 * .note = the skill sits on `flow`, the larger focus, so `lean` stays the cheaper one
 */
export const genSampleRepoWithSubjects = (input: { slug: string }): string => {
  const repoPath = genSampleRepoWithRoles({
    slug: input.slug,
    roles: [
      { repo: '.this', role: 'any' },
      { repo: 'fixture', role: 'zeta' },
    ],
  });
  const roleDir = join(repoPath, '.agent', 'repo=.this', 'role=any');
  writeFileSync(join(roleDir, 'briefs', 'base.md'), 'any base body');
  writeFileSync(join(roleDir, 'briefs', 'flow.md'), 'any flow body');
  writeFileSync(join(roleDir, 'briefs', 'lean.md'), 'any lean body');
  mkdirSync(join(roleDir, 'skills'), { recursive: true });
  writeFileSync(
    join(roleDir, 'skills', 'flow.sh'),
    '#!/usr/bin/env bash\n# .what = any flow skill\n',
  );
  writeFileSync(
    join(roleDir, 'boot.yml'),
    [
      'always:',
      '  briefs:',
      '    say:',
      '      - briefs/base.md',
      'subject.flow:',
      '  briefs:',
      '    say:',
      '      - briefs/flow.md',
      '  skills:',
      '    say:',
      '      - skills/flow.sh',
      'subject.lean:',
      '  inherit:',
      '    always: false',
      '  briefs:',
      '    say:',
      '      - briefs/lean.md',
      '',
    ].join('\n'),
  );
  return repoPath;
};
