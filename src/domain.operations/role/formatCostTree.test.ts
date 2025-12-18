import { formatCost, formatCostTree, formatTokens } from './formatCostTree';
import type { FileCost } from './getRoleFileCosts';

describe('formatCostTree', () => {
  describe('formatCost', () => {
    it('should format very small costs as $0.000', () => {
      expect(formatCost(0.0001)).toBe('$0.000');
      expect(formatCost(0.0009)).toBe('$0.000');
    });

    it('should format small costs with 3 decimal places', () => {
      expect(formatCost(0.001)).toBe('$0.001');
      expect(formatCost(0.005)).toBe('$0.005');
      expect(formatCost(0.009)).toBe('$0.009');
    });

    it('should format larger costs with 2 decimal places', () => {
      expect(formatCost(0.01)).toBe('$0.01');
      expect(formatCost(0.11)).toBe('$0.11');
      expect(formatCost(1.5)).toBe('$1.50');
    });
  });

  describe('formatTokens', () => {
    it('should format tokens with thousands separators', () => {
      expect(formatTokens(1000)).toBe('1,000');
      expect(formatTokens(12345)).toBe('12,345');
      expect(formatTokens(1234567)).toBe('1,234,567');
    });

    it('should handle small numbers without separators', () => {
      expect(formatTokens(100)).toBe('100');
      expect(formatTokens(999)).toBe('999');
    });
  });

  describe('formatCostTree', () => {
    it('should format a single file', () => {
      const fileCosts: FileCost[] = [
        {
          path: '/test/readme.md',
          relativePath: '.agent/repo=test/role=myrole/readme.md',
          chars: 400,
          tokens: 100,
          cost: 0.0003,
          type: 'other',
          isDocsOnly: false,
        },
      ];

      const result = formatCostTree({
        fileCosts,
        rootPath: '.agent/repo=test/role=myrole',
      });

      expect(result).toContain('.agent/repo=test/role=myrole');
      expect(result).toContain('readme.md');
      expect(result).toContain('100 tokens');
      expect(result).toContain('$0.000');
    });

    it('should format nested directories with box-drawing characters', () => {
      const fileCosts: FileCost[] = [
        {
          path: '/test/briefs/practices/typescript.md',
          relativePath:
            '.agent/repo=test/role=myrole/briefs/practices/typescript.md',
          chars: 4000,
          tokens: 1000,
          cost: 0.003,
          type: 'brief',
          isDocsOnly: false,
        },
        {
          path: '/test/briefs/practices/testing.md',
          relativePath:
            '.agent/repo=test/role=myrole/briefs/practices/testing.md',
          chars: 2000,
          tokens: 500,
          cost: 0.0015,
          type: 'brief',
          isDocsOnly: false,
        },
      ];

      const result = formatCostTree({
        fileCosts,
        rootPath: '.agent/repo=test/role=myrole',
      });

      expect(result).toContain('briefs');
      expect(result).toContain('practices');
      expect(result).toContain('├──');
      expect(result).toContain('└──');
    });

    it('should annotate skill files with [docs only]', () => {
      const fileCosts: FileCost[] = [
        {
          path: '/test/skills/build.sh',
          relativePath: '.agent/repo=test/role=myrole/skills/build.sh',
          chars: 200,
          tokens: 50,
          cost: 0.00015,
          type: 'skill',
          isDocsOnly: true,
        },
      ];

      const result = formatCostTree({
        fileCosts,
        rootPath: '.agent/repo=test/role=myrole',
      });

      expect(result).toContain('[docs only]');
      expect(result).toContain('build.sh');
    });

    it('should not annotate non-skill files with [docs only]', () => {
      const fileCosts: FileCost[] = [
        {
          path: '/test/briefs/test.md',
          relativePath: '.agent/repo=test/role=myrole/briefs/test.md',
          chars: 200,
          tokens: 50,
          cost: 0.00015,
          type: 'brief',
          isDocsOnly: false,
        },
      ];

      const result = formatCostTree({
        fileCosts,
        rootPath: '.agent/repo=test/role=myrole',
      });

      expect(result).not.toContain('[docs only]');
    });

    it('should handle empty file list', () => {
      const result = formatCostTree({
        fileCosts: [],
        rootPath: '.agent/repo=test/role=myrole',
      });

      expect(result).toContain('.agent/repo=test/role=myrole');
      expect(result).toContain('(empty)');
    });

    it('should sort directories before files', () => {
      const fileCosts: FileCost[] = [
        {
          path: '/test/readme.md',
          relativePath: '.agent/repo=test/role=myrole/readme.md',
          chars: 100,
          tokens: 25,
          cost: 0.000075,
          type: 'other',
          isDocsOnly: false,
        },
        {
          path: '/test/briefs/test.md',
          relativePath: '.agent/repo=test/role=myrole/briefs/test.md',
          chars: 100,
          tokens: 25,
          cost: 0.000075,
          type: 'brief',
          isDocsOnly: false,
        },
      ];

      const result = formatCostTree({
        fileCosts,
        rootPath: '.agent/repo=test/role=myrole',
      });

      const lines = result.split('\n');
      const briefsIndex = lines.findIndex((l) => l.includes('briefs'));
      const readmeIndex = lines.findIndex((l) => l.includes('readme.md'));

      // briefs directory should come before readme.md file
      expect(briefsIndex).toBeLessThan(readmeIndex);
    });
  });
});
