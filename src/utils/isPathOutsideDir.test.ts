import { isPathOutsideDir } from '@src/utils/isPathOutsideDir';

const TEST_CASES = [
  {
    description: 'a path inside the dir is not outside',
    given: { path: '/repo/.behavior/boot.yml', dir: '/repo' },
    expect: { output: false },
  },
  {
    description: 'the dir itself is not outside',
    given: { path: '/repo', dir: '/repo' },
    expect: { output: false },
  },
  {
    description: 'a peer dir path is outside',
    given: { path: '/other/boot.yml', dir: '/repo' },
    expect: { output: true },
  },
  {
    description: 'a `..` escape that resolves outside is outside',
    given: { path: '/repo/../other/boot.yml', dir: '/repo' },
    expect: { output: true },
  },
  {
    description: 'a peer dir whose name shares the dir prefix is outside',
    given: { path: '/repo-evil/boot.yml', dir: '/repo' },
    expect: { output: true },
  },
  {
    description: 'a child dir whose NAME starts with `..` is inside',
    given: { path: '/repo/..hidden/boot.yml', dir: '/repo' },
    expect: { output: false },
  },
  {
    description: 'the parent dir itself is outside',
    given: { path: '/', dir: '/repo' },
    expect: { output: true },
  },
];

describe('isPathOutsideDir', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isPathOutsideDir(thisCase.given)).toEqual(thisCase.expect.output);
    }),
  );
});
