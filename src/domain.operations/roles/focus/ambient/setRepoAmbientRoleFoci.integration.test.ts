import { MalfunctionError } from 'helpful-errors';
import { genTempDir, getError, given, then, useThen, when } from 'test-fns';

import { RoleDelta } from '@src/domain.objects/RoleDelta';
import { getRepoAmbientRoleFociPath } from '@src/domain.operations/actor/enrolled/getRepoAmbientRoleFociPath';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { getRepoAmbientRoleFoci } from './getRepoAmbientRoleFoci';
import { setRepoAmbientRoleFoci } from './setRepoAmbientRoleFoci';

const genRepo = (input: { slug: string }): string =>
  realpathSync(genTempDir({ slug: input.slug }));

/**
 * .what = an error message with its temp repo path masked, so a snapshot is stable
 */
const asMaskedMessage = (input: { error: Error; repoPath: string }): string =>
  input.error.message.split(input.repoPath).join('<repo>');

describe('setRepoAmbientRoleFoci', () => {
  given('[case1] a repo with no foci record', () => {
    when('[t0] read', () => {
      then('every ambient role is whole — the record is empty', () => {
        const repoPath = genRepo({ slug: 'ambient-foci-absent' });
        expect(getRepoAmbientRoleFoci({ repoPath })).toEqual({});
      });
    });

    when('[t1] an init names no focus', () => {
      const repoPath = genRepo({ slug: 'ambient-foci-nofocus' });
      const result = useThen('it succeeds', async () =>
        setRepoAmbientRoleFoci({
          repoPath,
          deltas: [new RoleDelta({ kind: 'addition', role: 'mechanic' })],
        }),
      );

      then('the record stays empty', () => {
        expect(result.foci).toEqual({});
      });

      then('no file is created to hold an empty record', () => {
        expect(existsSync(getRepoAmbientRoleFociPath({ repoPath }))).toEqual(
          false,
        );
      });
    });
  });

  given('[case2] an init that narrows mechanic', () => {
    const repoPath = genRepo({ slug: 'ambient-foci-narrow' });

    when('[t0] +mechanic::101 is applied', () => {
      const result = useThen('it succeeds', async () =>
        setRepoAmbientRoleFoci({
          repoPath,
          deltas: [new RoleDelta({ kind: 'addition', role: 'mechanic::101' })],
        }),
      );

      then('it returns the prior and next records', () => {
        expect(result.fociPrior).toEqual({});
        expect(result.foci).toEqual({ mechanic: ['101'] });
      });

      then('the record lands beside the repo actor', () => {
        const path = getRepoAmbientRoleFociPath({ repoPath });
        expect(path).toContain('actor.via.repo=ambient/roles.foci.json');
        expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
          mechanic: ['101'],
        });
      });

      then('a read sees the focus', () => {
        expect(getRepoAmbientRoleFoci({ repoPath })).toEqual({
          mechanic: ['101'],
        });
      });
    });

    when('[t1] the same delta is applied again', () => {
      then('the file is left untouched', async () => {
        const path = getRepoAmbientRoleFociPath({ repoPath });
        const mtimeBefore = statSync(path).mtimeMs;
        const result = await setRepoAmbientRoleFoci({
          repoPath,
          deltas: [new RoleDelta({ kind: 'addition', role: 'mechanic::101' })],
        });
        expect(result.foci).toEqual({ mechanic: ['101'] });
        expect(statSync(path).mtimeMs).toEqual(mtimeBefore);
      });
    });

    when('[t2] a bare +mechanic widens it back', () => {
      then('the record holds no focus, and the file says so', async () => {
        const result = await setRepoAmbientRoleFoci({
          repoPath,
          deltas: [new RoleDelta({ kind: 'addition', role: 'mechanic' })],
        });
        expect(result.foci).toEqual({});
        expect(getRepoAmbientRoleFoci({ repoPath })).toEqual({});
      });
    });
  });

  given('[case3] a corrupt foci record', () => {
    when('[t0] the record is not json', () => {
      then(
        'it fails loud, names the file, its cause, and the repair',
        async () => {
          const repoPath = genRepo({ slug: 'ambient-foci-corrupt' });
          const path = getRepoAmbientRoleFociPath({ repoPath });
          mkdirSync(dirname(path), { recursive: true });
          writeFileSync(path, '{ not json');
          const error = await getError(() =>
            getRepoAmbientRoleFoci({ repoPath }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain(
            'ambient role foci record is not json',
          );
          expect(error.message).toContain('roles.foci.json');
          expect(error.message).toContain('or remove it');
          expect(error).toMatchObject({ cause: expect.any(SyntaxError) });
          expect(asMaskedMessage({ error, repoPath })).toMatchSnapshot();
        },
      );
    });

    when('[t1] the record has the wrong shape', () => {
      then('it fails loud and names each issue', async () => {
        const repoPath = genRepo({ slug: 'ambient-foci-shape' });
        const path = getRepoAmbientRoleFociPath({ repoPath });
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, '{"mechanic":"101"}');
        const error = await getError(() =>
          getRepoAmbientRoleFoci({ repoPath }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain(
          'ambient role foci record has the wrong shape',
        );
        expect(error.message).toContain('mechanic');
        expect(asMaskedMessage({ error, repoPath })).toMatchSnapshot();
      });
    });
  });

  given('[case4] a record whose dir cannot be probed', () => {
    when('[t0] read', () => {
      then(
        'it raises the fs fault, never reads as absent (every role whole)',
        async () => {
          const repoPath = genRepo({ slug: 'ambient-foci-noprobe' });
          const path = getRepoAmbientRoleFociPath({ repoPath });
          mkdirSync(dirname(path), { recursive: true });
          writeFileSync(path, '{"mechanic":["101"]}');
          chmodSync(dirname(path), 0o000);
          try {
            const error = await getError(() =>
              getRepoAmbientRoleFoci({ repoPath }),
            );
            expect((error as NodeJS.ErrnoException).code).toEqual('EACCES');
          } finally {
            chmodSync(dirname(path), 0o755);
          }
        },
      );
    });
  });
});
