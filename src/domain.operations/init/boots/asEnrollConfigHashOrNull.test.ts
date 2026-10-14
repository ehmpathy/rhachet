import { given, then } from 'test-fns';

import { asEnrollConfigHashOrNull } from './asEnrollConfigHashOrNull';

const TEST_CASES = [
  {
    description: 'a retired per-enroll config yields its hash',
    given: { name: 'settings.enroll.9c1e0a7b.local.json' },
    expect: '9c1e0a7b',
  },
  {
    description: 'the repo settings file yields null',
    given: { name: 'settings.of.repo.json' },
    expect: null,
  },
  {
    description: 'a hash of the wrong length yields null',
    given: { name: 'settings.enroll.9c1e.local.json' },
    expect: null,
  },
  {
    description: 'a human local settings file yields null',
    given: { name: 'settings.local.json' },
    expect: null,
  },
];

describe('asEnrollConfigHashOrNull', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      then('the hash matches', () => {
        expect(asEnrollConfigHashOrNull(thisCase.given)).toEqual(
          thisCase.expect,
        );
      });
    }),
  );
});
