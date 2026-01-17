import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';

import { detectBrainReplsInRepo } from './detectBrainReplsInRepo';

describe('detectBrainReplsInRepo', () => {
  given('[case1] repo with .claude/settings.json', () => {
    const scene = useBeforeAll(async () => {
      const dir = path.join(os.tmpdir(), `test-claude-${Date.now()}`);
      await fs.mkdir(path.join(dir, '.claude'), { recursive: true });
      await fs.writeFile(
        path.join(dir, '.claude', 'settings.json'),
        JSON.stringify({}),
      );
      const context = new ContextCli({ cwd: dir, gitroot: dir });
      const result = await detectBrainReplsInRepo(context);
      return { dir, result };
    });

    when('[t0] detectBrainReplsInRepo is called', () => {
      then('returns claude-code', () => {
        expect(scene.result).toContain('anthropic/claude/code');
      });

      then('does not return opencode', () => {
        expect(scene.result).not.toContain('anomaly/opencode');
      });
    });
  });

  given('[case2] repo with .opencode directory', () => {
    const scene = useBeforeAll(async () => {
      const dir = path.join(os.tmpdir(), `test-opencode-${Date.now()}`);
      await fs.mkdir(path.join(dir, '.opencode'), { recursive: true });
      const context = new ContextCli({ cwd: dir, gitroot: dir });
      const result = await detectBrainReplsInRepo(context);
      return { dir, result };
    });

    when('[t0] detectBrainReplsInRepo is called', () => {
      then('returns opencode', () => {
        expect(scene.result).toContain('anomaly/opencode');
      });

      then('does not return claude-code', () => {
        expect(scene.result).not.toContain('anthropic/claude/code');
      });
    });
  });

  given('[case3] repo with both claude and opencode', () => {
    const scene = useBeforeAll(async () => {
      const dir = path.join(os.tmpdir(), `test-both-${Date.now()}`);
      await fs.mkdir(path.join(dir, '.claude'), { recursive: true });
      await fs.writeFile(
        path.join(dir, '.claude', 'settings.json'),
        JSON.stringify({}),
      );
      await fs.mkdir(path.join(dir, '.opencode'), { recursive: true });
      const context = new ContextCli({ cwd: dir, gitroot: dir });
      const result = await detectBrainReplsInRepo(context);
      return { dir, result };
    });

    when('[t0] detectBrainReplsInRepo is called', () => {
      then('returns both', () => {
        expect(scene.result).toContain('anthropic/claude/code');
        expect(scene.result).toContain('anomaly/opencode');
      });

      then('returns exactly 2 brains', () => {
        expect(scene.result).toHaveLength(2);
      });
    });
  });

  given('[case4] repo with neither', () => {
    const scene = useBeforeAll(async () => {
      const dir = path.join(os.tmpdir(), `test-neither-${Date.now()}`);
      await fs.mkdir(dir, { recursive: true });
      const context = new ContextCli({ cwd: dir, gitroot: dir });
      const result = await detectBrainReplsInRepo(context);
      return { dir, result };
    });

    when('[t0] detectBrainReplsInRepo is called', () => {
      then('returns empty array', () => {
        expect(scene.result).toEqual([]);
      });
    });
  });
});
