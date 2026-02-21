import { given, then, when } from 'test-fns';

import { genTestTempDir } from '@src/.test/infra/genTestTempDir';

import { writeFileSync } from 'node:fs';
import { getLocalRefDependencies } from './getLocalRefDependencies';

describe('getLocalRefDependencies', () => {
  given('[case1] package.json with file:. dependency', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'getLocalRefDependencies-with-file-dot',
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

    when('[t0] getLocalRefDependencies is called', () => {
      then('returns set that contains file: deps', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.has('rhachet-roles-brain')).toBe(true);
        expect(result.has('rhachet')).toBe(true);
      });

      then('excludes non-local-ref deps', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.has('rhachet-roles-ehmpathy')).toBe(false);
      });

      then('returns correct size', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.size).toBe(2);
      });
    });
  });

  given('[case2] package.json without local ref dependencies', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'getLocalRefDependencies-no-local-refs',
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

    when('[t0] getLocalRefDependencies is called', () => {
      then('returns empty set', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.size).toBe(0);
      });
    });
  });

  given('[case3] no package.json exists', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'getLocalRefDependencies-no-pkg',
    });

    beforeAll(() => {
      testDir.setup();
      // no package.json created
    });

    afterAll(() => testDir.teardown());

    when('[t0] getLocalRefDependencies is called', () => {
      then('returns empty set', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.size).toBe(0);
      });
    });
  });

  given('[case4] package.json with only devDependencies file:', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'getLocalRefDependencies-dev-only',
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

    when('[t0] getLocalRefDependencies is called', () => {
      then('returns set with devDependency', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.has('rhachet-roles-test')).toBe(true);
        expect(result.size).toBe(1);
      });
    });
  });

  given('[case5] package.json with file:../path style', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'getLocalRefDependencies-file-path',
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

    when('[t0] getLocalRefDependencies is called', () => {
      then('returns set with all file: prefix deps', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.has('local-pkg')).toBe(true);
        expect(result.has('another-local')).toBe(true);
        expect(result.size).toBe(2);
      });
    });
  });

  given('[case6] package.json with file: brain and role packages', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'getLocalRefDependencies-brains-and-roles',
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(
        'package.json',
        JSON.stringify({
          dependencies: {
            'rhachet-roles-ehmpathy': '^1.0.0',
            'rhachet-brains-anthropic': 'file:.',
          },
          devDependencies: {
            rhachet: 'file:../rhachet',
            'rhachet-roles-bhuild': 'file:../rhachet-roles-bhuild',
          },
        }),
      );
    });

    afterAll(() => testDir.teardown());

    when('[t0] getLocalRefDependencies is called', () => {
      then('returns set with file: brain packages', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.has('rhachet-brains-anthropic')).toBe(true);
      });

      then('returns set with file: role packages', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.has('rhachet-roles-bhuild')).toBe(true);
      });

      then('returns set with rhachet itself', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.has('rhachet')).toBe(true);
      });

      then('excludes non-local-ref packages', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.has('rhachet-roles-ehmpathy')).toBe(false);
      });

      then('returns correct size', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.size).toBe(3);
      });
    });
  });

  given('[case7] package.json with link:. dependency', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'getLocalRefDependencies-with-link-dot',
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(
        'package.json',
        JSON.stringify({
          dependencies: {
            'rhachet-roles-brain': 'link:.',
            'rhachet-roles-ehmpathy': '^1.0.0',
          },
          devDependencies: {
            rhachet: 'link:../rhachet',
          },
        }),
      );
    });

    afterAll(() => testDir.teardown());

    when('[t0] getLocalRefDependencies is called', () => {
      then('returns set that contains link: deps', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.has('rhachet-roles-brain')).toBe(true);
        expect(result.has('rhachet')).toBe(true);
      });

      then('excludes non-local-ref deps', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.has('rhachet-roles-ehmpathy')).toBe(false);
      });

      then('returns correct size', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.size).toBe(2);
      });
    });
  });

  given('[case8] package.json with mixed file: and link: dependencies', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'getLocalRefDependencies-mixed-file-link',
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(
        'package.json',
        JSON.stringify({
          dependencies: {
            'rhachet-roles-brain': 'file:.',
            'rhachet-brains-anthropic': 'link:../rhachet-brains-anthropic',
            'rhachet-roles-ehmpathy': '^1.0.0',
          },
          devDependencies: {
            rhachet: 'link:../rhachet',
            'rhachet-roles-bhuild': 'file:../rhachet-roles-bhuild',
          },
        }),
      );
    });

    afterAll(() => testDir.teardown());

    when('[t0] getLocalRefDependencies is called', () => {
      then('returns set with file: deps', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.has('rhachet-roles-brain')).toBe(true);
        expect(result.has('rhachet-roles-bhuild')).toBe(true);
      });

      then('returns set with link: deps', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.has('rhachet-brains-anthropic')).toBe(true);
        expect(result.has('rhachet')).toBe(true);
      });

      then('excludes non-local-ref deps', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.has('rhachet-roles-ehmpathy')).toBe(false);
      });

      then('returns correct size', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.size).toBe(4);
      });
    });
  });

  given('[case9] package.json with link:../path style', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'getLocalRefDependencies-link-path',
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(
        'package.json',
        JSON.stringify({
          dependencies: {
            'local-pkg': 'link:../local-pkg',
            'another-local': 'link:./packages/another',
          },
        }),
      );
    });

    afterAll(() => testDir.teardown());

    when('[t0] getLocalRefDependencies is called', () => {
      then('returns set with all link: prefix deps', () => {
        const result = getLocalRefDependencies({ cwd: testDir.path });
        expect(result.has('local-pkg')).toBe(true);
        expect(result.has('another-local')).toBe(true);
        expect(result.size).toBe(2);
      });
    });
  });
});
