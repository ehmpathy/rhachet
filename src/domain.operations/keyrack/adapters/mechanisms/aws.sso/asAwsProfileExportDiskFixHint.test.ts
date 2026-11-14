import { given, then, when } from 'test-fns';

import { asAwsProfileExportDiskFixHint } from './asAwsProfileExportDiskFixHint';

const PATH = '/home/beach/.rhachet/keyrack/cache/aws.export';

// a node fs error shape: a code and a message, as the disk reports them
const asDiskError = (input: { code: string; message: string }) =>
  Object.assign(new Error(input.message), { code: input.code });

const TEST_CASES: {
  description: string;
  given: { code: string; message: string };
  expect: { cure: 'move'; entry: string } | { cure: 'mode' };
}[] = [
  {
    description: '[case1] EEXIST — a file sits where the cache dir belongs',
    given: {
      code: 'EEXIST',
      message: `EEXIST: file already exists, mkdir '${PATH}'`,
    },
    expect: { cure: 'move', entry: `the file at ${PATH}` },
  },
  {
    description: '[case2] EISDIR — a dir sits where a cache file belongs',
    given: {
      code: 'EISDIR',
      message: 'EISDIR: illegal operation on a directory, read',
    },
    expect: { cure: 'move', entry: `the dir at ${PATH}` },
  },
  {
    description:
      '[case2.5] ERR_FS_EISDIR — node rm meets a dir where a cache file belongs',
    given: {
      code: 'ERR_FS_EISDIR',
      message: `Path is a directory: rm returned EISDIR (is a directory) ${PATH}/profile=acme.json`,
    },
    expect: { cure: 'move', entry: `the dir at ${PATH}` },
  },
  {
    description: '[case3] ENOTDIR — a file sits above the cache path',
    given: {
      code: 'ENOTDIR',
      message: `ENOTDIR: not a directory, mkdir '${PATH}'`,
    },
    expect: { cure: 'move', entry: `the file that sits on the way to ${PATH}` },
  },
  {
    description: '[case4] EACCES — a root-owned cache dir',
    given: {
      code: 'EACCES',
      message: `EACCES: permission denied, mkdir '${PATH}'`,
    },
    expect: { cure: 'mode' },
  },
  {
    description: '[case5] EROFS — a read-only HOME',
    given: {
      code: 'EROFS',
      message: `EROFS: read-only file system, mkdir '${PATH}'`,
    },
    expect: { cure: 'mode' },
  },
];

describe('asAwsProfileExportDiskFixHint', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      when('[t0] the hint is cast', () => {
        const hint = asAwsProfileExportDiskFixHint({
          path: PATH,
          error: asDiskError(thisCase.given),
        });

        then(
          `it names the ${thisCase.expect.cure} cure, the path once, and the disk's code`,
          () => {
            if (thisCase.expect.cure === 'move')
              expect(hint).toContain(
                `move aside ${thisCase.expect.entry}, then retry`,
              );
            if (thisCase.expect.cure === 'mode')
              expect(hint).toContain(
                `make ${PATH} readable and writable by this user`,
              );
            expect(hint).toContain(`the disk said ${thisCase.given.code}`);
            expect(hint.split(PATH).length - 1).toEqual(1);
            expect(hint).toMatchSnapshot();
          },
        );
      });
    }),
  );

  given('[case6] an error with no code, from another realm', () => {
    when('[t0] the hint is cast', () => {
      then('it names the mode cure and the error text', () => {
        const hint = asAwsProfileExportDiskFixHint({
          path: PATH,
          error: 'quota exceeded',
        });
        expect(hint).toContain(`make ${PATH} readable and writable`);
        expect(hint).toContain('the disk said quota exceeded');
        expect(hint).toMatchSnapshot();
      });
    });
  });
});
