import { given, then, when } from 'test-fns';

import { genTestTempDir } from '@src/.test/infra/genTestTempDir';

import { writeFileSync } from 'node:fs';
import { getFileDotDependencies } from './getFileDotDependencies';

describe('getFileDotDependencies', () => {
  given('[case1] package.json with file:. dependency', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'getFileDotDependencies-with-file-dot',
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(
        'package.json',
        JSON.stringify({
          dependencies: {
            'rhachet-roles-brain': 'file:.',
            'rhachet-roles-ehmpathy': '^1.0.0',
          },
          devDependencies: {
            rhachet: 'file:../rhachet',
          },
        }),
      );
    });

    afterAll(() => testDir.teardown());

    when('[t0] getFileDotDependencies is called', () => {
      then('returns set that contains file:. deps', () => {
        const result = getFileDotDependencies({ cwd: testDir.path });
        expect(result.has('rhachet-roles-brain')).toBe(true);
        expect(result.has('rhachet')).toBe(true);
      });

      then('excludes non-file:. deps', () => {
        const result = getFileDotDependencies({ cwd: testDir.path });
        expect(result.has('rhachet-roles-ehmpathy')).toBe(false);
      });

      then('returns correct size', () => {
        const result = getFileDotDependencies({ cwd: testDir.path });
        expect(result.size).toBe(2);
      });
    });
  });

  given('[case2] package.json without file:. dependencies', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'getFileDotDependencies-no-file-dot',
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(
        'package.json',
        JSON.stringify({
          dependencies: { 'rhachet-roles-ehmpathy': '^1.0.0' },
        }),
      );
    });

    afterAll(() => testDir.teardown());

    when('[t0] getFileDotDependencies is called', () => {
      then('returns empty set', () => {
        const result = getFileDotDependencies({ cwd: testDir.path });
        expect(result.size).toBe(0);
      });
    });
  });

  given('[case3] no package.json exists', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'getFileDotDependencies-no-pkg',
    });

    beforeAll(() => {
      testDir.setup();
      // no package.json created
    });

    afterAll(() => testDir.teardown());

    when('[t0] getFileDotDependencies is called', () => {
      then('returns empty set', () => {
        const result = getFileDotDependencies({ cwd: testDir.path });
        expect(result.size).toBe(0);
      });
    });
  });

  given('[case4] package.json with only devDependencies file:.', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'getFileDotDependencies-dev-only',
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(
        'package.json',
        JSON.stringify({
          dependencies: {
            lodash: '^4.0.0',
          },
          devDependencies: {
            'rhachet-roles-test': 'file:.',
          },
        }),
      );
    });

    afterAll(() => testDir.teardown());

    when('[t0] getFileDotDependencies is called', () => {
      then('returns set with devDependency', () => {
        const result = getFileDotDependencies({ cwd: testDir.path });
        expect(result.has('rhachet-roles-test')).toBe(true);
        expect(result.size).toBe(1);
      });
    });
  });

  given('[case5] package.json with file:../path style', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'getFileDotDependencies-file-path',
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(
        'package.json',
        JSON.stringify({
          dependencies: {
            'local-pkg': 'file:../local-pkg',
            'another-local': 'file:./packages/another',
          },
        }),
      );
    });

    afterAll(() => testDir.teardown());

    when('[t0] getFileDotDependencies is called', () => {
      then('returns set with all file: prefix deps', () => {
        const result = getFileDotDependencies({ cwd: testDir.path });
        expect(result.has('local-pkg')).toBe(true);
        expect(result.has('another-local')).toBe(true);
        expect(result.size).toBe(2);
      });
    });
  });
});
