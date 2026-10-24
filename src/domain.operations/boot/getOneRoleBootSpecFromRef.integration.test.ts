import { genTempDir, getError, given, then, when } from 'test-fns';

import { chmodSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneRoleBootSpecFromRef } from './getOneRoleBootSpecFromRef';

const genRepoWithRole = (input: {
  slug: string;
  bootYml: string | null;
}): string => {
  const repoPath = realpathSync(genTempDir({ slug: input.slug }));
  const roleDir = join(repoPath, '.agent', 'repo=ehmpathy', 'role=mechanic');
  mkdirSync(roleDir, { recursive: true });
  if (input.bootYml) writeFileSync(join(roleDir, 'boot.yml'), input.bootYml);
  return repoPath;
};

const REF = { repo: 'ehmpathy', role: 'mechanic' };

describe('getOneRoleBootSpecFromRef', () => {
  given('[case1] a linked role with no boot.yml', () => {
    when('[t0] read', () => {
      then('it returns null', () => {
        const repoPath = genRepoWithRole({
          slug: 'spec-from-ref-absent',
          bootYml: null,
        });
        expect(getOneRoleBootSpecFromRef({ ref: REF, repoPath })).toBeNull();
      });
    });
  });

  given('[case2] a linked role that declares subjects', () => {
    when('[t0] read', () => {
      then(
        'it returns the parsed spec, with each subject and its opt-out',
        () => {
          const repoPath = genRepoWithRole({
            slug: 'spec-from-ref-subjects',
            bootYml: [
              'always:',
              '  briefs:',
              '    say:',
              '      - briefs/core.md',
              'subject.flow:',
              '  briefs:',
              '    say:',
              '      - briefs/flow.md',
              'subject.101:',
              '  inherit:',
              '    always: false',
              '  briefs:',
              '    say:',
              '      - briefs/101.md',
              '',
            ].join('\n'),
          });
          const spec = getOneRoleBootSpecFromRef({ ref: REF, repoPath });
          expect(spec).toMatchObject({
            mode: 'subject',
            subjects: {
              flow: { inherit: { always: true } },
              '101': { inherit: { always: false } },
            },
          });
        },
      );
    });
  });

  given('[case3] a linked role whose dir cannot be probed', () => {
    when('[t0] read', () => {
      then(
        'it raises the fs fault, never reads as absent (a say-all downgrade)',
        async () => {
          const repoPath = genRepoWithRole({
            slug: 'spec-from-ref-noprobe',
            bootYml: 'always:\n  briefs:\n    say:\n      - briefs/core.md\n',
          });
          const roleDir = join(
            repoPath,
            '.agent',
            'repo=ehmpathy',
            'role=mechanic',
          );
          chmodSync(roleDir, 0o000);
          try {
            // .note = the op is sync; the await reads the same for a sync or async getError
            const error = await getError(() =>
              getOneRoleBootSpecFromRef({ ref: REF, repoPath }),
            );
            // .note = an fs fault is a node-realm Error, so jest's realm fails `toBeInstanceOf`;
            //   the errno is the claim
            expect((error as NodeJS.ErrnoException).code).toEqual('EACCES');
          } finally {
            chmodSync(roleDir, 0o755);
          }
        },
      );
    });
  });
});
