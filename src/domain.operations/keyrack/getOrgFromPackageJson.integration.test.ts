import { given, then, when } from 'test-fns';

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOrgFromPackageJson } from './getOrgFromPackageJson';

describe('getOrgFromPackageJson', () => {
  const testDir = join(__dirname, './.temp/getOrgFromPackageJson');

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  given('[case1] package.json with organization field', () => {
    when('[t0] getOrgFromPackageJson is called', () => {
      then('returns organization value', async () => {
        writeFileSync(
          join(testDir, 'package.json'),
          JSON.stringify({
            name: 'some-package',
            organization: 'explicit-org',
          }),
        );

        const result = await getOrgFromPackageJson({}, { gitroot: testDir });
        expect(result).toEqual('explicit-org');
      });
    });
  });

  given('[case2] package.json with scoped name', () => {
    when('[t0] getOrgFromPackageJson is called', () => {
      then('extracts org from scope', async () => {
        writeFileSync(
          join(testDir, 'package.json'),
          JSON.stringify({
            name: '@ehmpathy/cool-project',
          }),
        );

        const result = await getOrgFromPackageJson({}, { gitroot: testDir });
        expect(result).toEqual('ehmpathy');
      });
    });
  });

  given('[case3] package.json with repository string', () => {
    when('[t0] getOrgFromPackageJson is called', () => {
      then('extracts owner from repository', async () => {
        writeFileSync(
          join(testDir, 'package.json'),
          JSON.stringify({
            name: 'unscoped-package',
            repository: 'github:myorg/myrepo',
          }),
        );

        const result = await getOrgFromPackageJson({}, { gitroot: testDir });
        expect(result).toEqual('myorg');
      });
    });
  });

  given('[case4] package.json with repository object', () => {
    when('[t0] getOrgFromPackageJson is called', () => {
      then('extracts owner from repository url', async () => {
        writeFileSync(
          join(testDir, 'package.json'),
          JSON.stringify({
            name: 'unscoped-package',
            repository: {
              type: 'git',
              url: 'https://github.com/company/project.git',
            },
          }),
        );

        const result = await getOrgFromPackageJson({}, { gitroot: testDir });
        expect(result).toEqual('company');
      });
    });
  });

  given('[case5] package.json with no org-detectable fields', () => {
    when('[t0] getOrgFromPackageJson is called', () => {
      then('returns null', async () => {
        writeFileSync(
          join(testDir, 'package.json'),
          JSON.stringify({
            name: 'unscoped-package',
            version: '1.0.0',
          }),
        );

        const result = await getOrgFromPackageJson({}, { gitroot: testDir });
        expect(result).toBeNull();
      });
    });
  });

  given('[case6] fallback chain priority', () => {
    when('[t0] all org sources present', () => {
      then('organization field takes precedence', async () => {
        writeFileSync(
          join(testDir, 'package.json'),
          JSON.stringify({
            name: '@scoped-org/package',
            organization: 'explicit-org',
            repository: 'github:repo-org/repo',
          }),
        );

        const result = await getOrgFromPackageJson({}, { gitroot: testDir });
        expect(result).toEqual('explicit-org');
      });
    });

    when('[t1] scoped name and repository present, no organization', () => {
      then('scoped name takes precedence over repository', async () => {
        writeFileSync(
          join(testDir, 'package.json'),
          JSON.stringify({
            name: '@scoped-org/package',
            repository: 'github:repo-org/repo',
          }),
        );

        const result = await getOrgFromPackageJson({}, { gitroot: testDir });
        expect(result).toEqual('scoped-org');
      });
    });
  });
});
