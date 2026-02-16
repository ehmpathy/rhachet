import { join } from 'node:path';
import { getKeyrackHostManifestPath } from './getKeyrackHostManifestPath';

const TEST_CASES = [
  {
    description: 'returns keyrack.host.age for null owner',
    given: { owner: null },
    expectFile: 'keyrack.host.age',
  },
  {
    description: 'returns keyrack.host.mechanic.age for mechanic owner',
    given: { owner: 'mechanic' },
    expectFile: 'keyrack.host.mechanic.age',
  },
  {
    description: 'returns keyrack.host.foreman.age for foreman owner',
    given: { owner: 'foreman' },
    expectFile: 'keyrack.host.foreman.age',
  },
];

describe('getKeyrackHostManifestPath', () => {
  const originalHome = process.env.HOME;

  beforeEach(() => {
    process.env.HOME = '/test/home';
  });

  afterEach(() => {
    process.env.HOME = originalHome;
  });

  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const result = getKeyrackHostManifestPath(thisCase.given);
      const expected = join(
        '/test/home',
        '.rhachet',
        'keyrack',
        thisCase.expectFile,
      );
      expect(result).toEqual(expected);
    }),
  );

  test('throws when HOME is not set', () => {
    delete process.env.HOME;
    expect(() => getKeyrackHostManifestPath({ owner: null })).toThrow(
      'HOME not set',
    );
  });
});
