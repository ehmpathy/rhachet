import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { findsertBrainCredentialSymlink } from './findsertBrainCredentialSymlink';

/**
 * .what = a temp home and an empty brain dir, with the human credential written or not
 */
const genScene = (input: { slug: string; withCredential: boolean }) => {
  const dir = genTempDir({ slug: input.slug });
  const home = join(dir, 'home');
  const brainDir = join(dir, 'actor', 'brain', '.claude');
  mkdirSync(join(home, '.claude'), { recursive: true });
  mkdirSync(brainDir, { recursive: true });
  if (input.withCredential)
    writeFileSync(
      join(home, '.claude', '.credentials.json'),
      '{"token":"human"}\n',
    );
  return { home, brainDir, linkPath: join(brainDir, '.credentials.json') };
};

describe('findsertBrainCredentialSymlink', () => {
  given('[case1] a human credential and an empty brain dir', () => {
    const scene = useBeforeAll(async () =>
      genScene({ slug: 'credential-link-fresh', withCredential: true }),
    );

    when('[t0] the symlink is findserted', () => {
      then('an absolute symlink to the human credential is created', () => {
        const result = findsertBrainCredentialSymlink({
          brainDir: scene.brainDir,
          home: scene.home,
        });
        expect(result.status).toEqual('linked');
        expect(lstatSync(scene.linkPath).isSymbolicLink()).toEqual(true);
        expect(readlinkSync(scene.linkPath)).toEqual(
          join(scene.home, '.claude', '.credentials.json'),
        );
      });
    });

    when('[t1] the symlink is findserted again', () => {
      then('it is unchanged', () => {
        const result = findsertBrainCredentialSymlink({
          brainDir: scene.brainDir,
          home: scene.home,
        });
        expect(result.status).toEqual('unchanged');
        expect(readlinkSync(scene.linkPath)).toEqual(
          join(scene.home, '.claude', '.credentials.json'),
        );
      });
    });
  });

  given('[case2] no human credential', () => {
    when('[t0] the symlink is findserted', () => {
      then('no symlink is created, and the status is absent', () => {
        const scene = genScene({
          slug: 'credential-link-absent',
          withCredential: false,
        });
        const result = findsertBrainCredentialSymlink({
          brainDir: scene.brainDir,
          home: scene.home,
        });
        expect(result.status).toEqual('absent');
        expect(
          lstatSync(scene.linkPath, { throwIfNoEntry: false }),
        ).toBeUndefined();
      });
    });
  });

  given('[case3] a real credential already in the brain dir', () => {
    when('[t0] the symlink is findserted', () => {
      then('the real file is kept byte-equal', () => {
        const scene = genScene({
          slug: 'credential-link-kept',
          withCredential: true,
        });
        writeFileSync(scene.linkPath, '{"token":"actor"}\n');
        const result = findsertBrainCredentialSymlink({
          brainDir: scene.brainDir,
          home: scene.home,
        });
        expect(result.status).toEqual('kept');
        expect(lstatSync(scene.linkPath).isSymbolicLink()).toEqual(false);
        expect(readFileSync(scene.linkPath, 'utf-8')).toEqual(
          '{"token":"actor"}\n',
        );
      });
    });
  });

  given('[case4] a symlink aimed at another file', () => {
    when('[t0] the symlink is findserted', () => {
      then('it is repointed at the human credential', () => {
        const scene = genScene({
          slug: 'credential-link-stale',
          withCredential: true,
        });
        symlinkSync(join(scene.home, 'elsewhere.json'), scene.linkPath);
        const result = findsertBrainCredentialSymlink({
          brainDir: scene.brainDir,
          home: scene.home,
        });
        expect(result.status).toEqual('linked');
        expect(readlinkSync(scene.linkPath)).toEqual(
          join(scene.home, '.claude', '.credentials.json'),
        );
        expect(existsSync(scene.linkPath)).toEqual(true);
      });
    });
  });
});
