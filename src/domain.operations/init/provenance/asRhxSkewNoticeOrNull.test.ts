import { given, then } from 'test-fns';

import { asRhxSkewNoticeOrNull } from './asRhxSkewNoticeOrNull';

const TEST_CASES = [
  {
    description: 'no pin → no row',
    given: {
      active: { path: '/global/rhachet', version: '1.50.0' },
      pinned: null,
    },
    expect: { output: null },
  },
  {
    description: 'one install by realpath (the self-link) → no row',
    given: {
      active: { path: '/repo', version: '1.50.0' },
      pinned: { path: '/repo', version: '1.50.0' },
    },
    expect: { output: null },
  },
  {
    description: 'two installs at one version → no row',
    given: {
      active: { path: '/global/rhachet', version: '1.50.0' },
      pinned: { path: '/repo/node_modules/rhachet', version: '1.50.0' },
    },
    expect: { output: null },
  },
  {
    description: 'two installs at two versions → one row that names both',
    given: {
      active: { path: '/global/rhachet', version: '1.50.1' },
      pinned: { path: '/repo/node_modules/rhachet', version: '1.49.2' },
    },
    expect: { output: '🐚 rhx 1.50.1 runs; this repo pins 1.49.2' },
  },
];

describe('asRhxSkewNoticeOrNull', () => {
  given('[case1] the active and pinned rhx', () => {
    TEST_CASES.map((thisCase) =>
      then(thisCase.description, () => {
        expect(asRhxSkewNoticeOrNull(thisCase.given)).toEqual(
          thisCase.expect.output,
        );
      }),
    );
  });
});
