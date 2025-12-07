import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  aggregateFileCosts,
  type FileCost,
  getAllFiles,
  getRoleFileCosts,
} from './getRoleFileCosts';

describe('getRoleFileCosts', () => {
  const testDir = resolve(__dirname, '.test-role-costs');
  const roleDir = resolve(testDir, '.agent', 'repo=test', 'role=testrole');
  const briefsDir = resolve(roleDir, 'briefs');
  const skillsDir = resolve(roleDir, 'skills');

  beforeEach(() => {
    // create test directory structure
    mkdirSync(briefsDir, { recursive: true });
    mkdirSync(skillsDir, { recursive: true });
  });

  afterEach(() => {
    // clean up test directory
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('getAllFiles', () => {
    it('should collect all files recursively', () => {
      writeFileSync(resolve(briefsDir, 'test.md'), 'content');
      writeFileSync(resolve(skillsDir, 'test.sh'), '#!/bin/bash\necho hi');

      const files = getAllFiles(roleDir);
      expect(files).toHaveLength(2);
      expect(files.some((f) => f.endsWith('test.md'))).toBe(true);
      expect(files.some((f) => f.endsWith('test.sh'))).toBe(true);
    });

    it('should handle nested directories', () => {
      const nestedDir = resolve(briefsDir, 'nested');
      mkdirSync(nestedDir, { recursive: true });
      writeFileSync(resolve(nestedDir, 'deep.md'), 'deep content');

      const files = getAllFiles(roleDir);
      expect(files.some((f) => f.endsWith('deep.md'))).toBe(true);
    });
  });

  describe('getRoleFileCosts', () => {
    it('should calculate tokens as chars / 4', () => {
      // 100 chars -> 25 tokens
      const content = 'a'.repeat(100);
      writeFileSync(resolve(briefsDir, 'test.md'), content);

      const costs = getRoleFileCosts({
        roleDir,
        repoSlug: 'test',
        roleSlug: 'testrole',
      });

      expect(costs[0]?.chars).toBe(100);
      expect(costs[0]?.tokens).toBe(25);
    });

    it('should calculate cost as tokens / 1M * $3', () => {
      // 4,000,000 chars = 1,000,000 tokens = $3
      const content = 'a'.repeat(4000);
      writeFileSync(resolve(briefsDir, 'test.md'), content);

      const costs = getRoleFileCosts({
        roleDir,
        repoSlug: 'test',
        roleSlug: 'testrole',
      });

      // 4000 chars = 1000 tokens = $0.003
      expect(costs[0]?.tokens).toBe(1000);
      expect(costs[0]?.cost).toBeCloseTo(0.003, 5);
    });

    it('should mark skill files with isDocsOnly: true', () => {
      writeFileSync(
        resolve(skillsDir, 'test.sh'),
        '#!/bin/bash\n# A skill\necho hello',
      );

      const costs = getRoleFileCosts({
        roleDir,
        repoSlug: 'test',
        roleSlug: 'testrole',
      });

      const skillCost = costs.find((c) => c.type === 'skill');
      expect(skillCost?.isDocsOnly).toBe(true);
    });

    it('should mark brief files with type: brief', () => {
      writeFileSync(resolve(briefsDir, 'test.md'), 'brief content');

      const costs = getRoleFileCosts({
        roleDir,
        repoSlug: 'test',
        roleSlug: 'testrole',
      });

      const briefCost = costs.find((c) => c.path.includes('briefs'));
      expect(briefCost?.type).toBe('brief');
    });

    it('should mark other files with type: other', () => {
      writeFileSync(resolve(roleDir, 'readme.md'), 'readme content');

      const costs = getRoleFileCosts({
        roleDir,
        repoSlug: 'test',
        roleSlug: 'testrole',
      });

      const otherCost = costs.find((c) => c.path.includes('readme'));
      expect(otherCost?.type).toBe('other');
    });

    it('should only count skill documentation, not implementation', () => {
      // skill with docs + implementation
      const skillContent = `#!/bin/bash
# This is the documentation
# More docs here

echo "this is implementation"
echo "more implementation"`;

      writeFileSync(resolve(skillsDir, 'test.sh'), skillContent);

      const costs = getRoleFileCosts({
        roleDir,
        repoSlug: 'test',
        roleSlug: 'testrole',
      });

      const skillCost = costs.find((c) => c.type === 'skill');

      // should not count implementation lines
      expect(skillCost?.chars).toBeLessThan(skillContent.length);
    });
  });

  describe('aggregateFileCosts', () => {
    it('should aggregate file costs correctly', () => {
      const fileCosts: FileCost[] = [
        {
          path: '/test/briefs/a.md',
          relativePath: '.agent/repo=x/role=y/briefs/a.md',
          chars: 100,
          tokens: 25,
          cost: 0.000075,
          type: 'brief',
          isDocsOnly: false,
        },
        {
          path: '/test/briefs/b.md',
          relativePath: '.agent/repo=x/role=y/briefs/b.md',
          chars: 200,
          tokens: 50,
          cost: 0.00015,
          type: 'brief',
          isDocsOnly: false,
        },
        {
          path: '/test/skills/c.sh',
          relativePath: '.agent/repo=x/role=y/skills/c.sh',
          chars: 50,
          tokens: 13,
          cost: 0.000039,
          type: 'skill',
          isDocsOnly: true,
        },
        {
          path: '/test/readme.md',
          relativePath: '.agent/repo=x/role=y/readme.md',
          chars: 80,
          tokens: 20,
          cost: 0.00006,
          type: 'other',
          isDocsOnly: false,
        },
      ];

      const summary = aggregateFileCosts(fileCosts);

      expect(summary.totalFiles).toBe(4);
      expect(summary.briefFiles).toBe(2);
      expect(summary.skillFiles).toBe(1);
      expect(summary.otherFiles).toBe(1);
      expect(summary.totalChars).toBe(430);
      expect(summary.totalTokens).toBe(108);
    });
  });
});
