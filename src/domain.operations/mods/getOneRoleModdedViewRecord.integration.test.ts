import { MalfunctionError } from 'helpful-errors';
import { genTempDir, getError, given, then, when } from 'test-fns';

import { asTempDirMasked } from '@src/.test/infra/asTempDirMasked';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneRoleModdedViewRecord } from './getOneRoleModdedViewRecord';

/**
 * .what = a role dir whose `.modded.json` holds the given content, or none where null
 */
const genRoleDirWithRecord = (input: {
  slug: string;
  content: string | null;
}): string => {
  const roleDir = join(
    genTempDir({ slug: input.slug }),
    '.agent',
    'repo=ehmpathy',
    'role=mechanic',
  );
  mkdirSync(roleDir, { recursive: true });
  if (input.content !== null)
    writeFileSync(join(roleDir, '.modded.json'), input.content);
  return roleDir;
};

const asRecordContent = (input: { refusal: unknown }): string =>
  JSON.stringify({
    sources: { briefs: [], skills: [] },
    paths: [],
    refusal: input.refusal,
  });

describe('getOneRoleModdedViewRecord', () => {
  given('[case1] a role dir with no record', () => {
    const roleDir = genRoleDirWithRecord({
      slug: 'view-record-none',
      content: null,
    });

    when('[t0] the record is read', () => {
      then('it is null, so the role reads as unmodded', () => {
        expect(getOneRoleModdedViewRecord({ roleDir })).toEqual(null);
      });
    });
  });

  given('[case2] a record with no refusal', () => {
    const roleDir = genRoleDirWithRecord({
      slug: 'view-record-sound',
      content: asRecordContent({ refusal: null }),
    });

    when('[t0] the record is read', () => {
      then('it is returned, with a null refusal', () => {
        expect(getOneRoleModdedViewRecord({ roleDir })?.refusal).toEqual(null);
      });
    });
  });

  given('[case3] a record with a well-shaped refusal', () => {
    const refusal = {
      message: 'the mod shadows a brief the role no longer ships',
      metadata: { role: 'ehmpathy/mechanic' },
      paths: ['briefs/rule.md'],
    };
    const roleDir = genRoleDirWithRecord({
      slug: 'view-record-refused',
      content: asRecordContent({ refusal }),
    });

    when('[t0] the record is read', () => {
      then('the refusal is returned as written', () => {
        expect(getOneRoleModdedViewRecord({ roleDir })?.refusal).toEqual(
          refusal,
        );
      });
    });
  });

  given('[case4] a record whose refusal is ill-shaped', () => {
    const TEST_CASES = [
      { description: 'a bare string', refusal: 'stale' },
      { description: 'a number', refusal: 5 },
      {
        description: 'an object with no message',
        refusal: { metadata: {}, paths: [] },
      },
      {
        description: 'an object whose paths is no array',
        refusal: { message: 'm', metadata: {}, paths: 'briefs/rule.md' },
      },
      {
        description: 'an object whose metadata is an array',
        refusal: { message: 'm', metadata: [], paths: [] },
      },
    ];

    TEST_CASES.map((thisCase) =>
      when(`[t0] the refusal is ${thisCase.description}`, () => {
        then(
          'the read fails loud as a corrupt record, with a fix, never a raw TypeError',
          async () => {
            const roleDir = genRoleDirWithRecord({
              slug: 'view-record-ill',
              content: asRecordContent({ refusal: thisCase.refusal }),
            });
            const error = await getError(async () =>
              getOneRoleModdedViewRecord({ roleDir }),
            );
            expect(error).toBeInstanceOf(MalfunctionError);
            expect((error as MalfunctionError).message).toContain(
              'the modded view record is unreadable',
            );
            expect(
              JSON.stringify((error as MalfunctionError).metadata),
            ).toContain('rhx init --roles +ehmpathy/mechanic');
            expect(
              asTempDirMasked({
                of: error.message,
                dir: roleDir,
                into: '/TMP_ROLE_DIR',
              }),
            ).toMatchSnapshot();
          },
        );
      }),
    );
  });
});
