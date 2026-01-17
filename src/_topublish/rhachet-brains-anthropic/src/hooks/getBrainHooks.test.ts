import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { getBrainHooks } from './getBrainHooks';

describe('getBrainHooks', () => {
  const repoPath = path.join(os.tmpdir(), 'test-repo');

  given('[case1] supported brain specifier', () => {
    when('[t0] brain is "claude-code"', () => {
      then('returns adapter for claude-code', () => {
        const adapter = getBrainHooks({ brain: 'claude-code', repoPath });
        expect(adapter).not.toBeNull();
        expect(adapter?.slug).toEqual('claude-code');
      });
    });

    when('[t1] brain is "anthropic/claude/code"', () => {
      then('returns adapter for claude-code', () => {
        const adapter = getBrainHooks({
          brain: 'anthropic/claude/code',
          repoPath,
        });
        expect(adapter).not.toBeNull();
        expect(adapter?.slug).toEqual('claude-code');
      });
    });
  });

  given('[case2] unsupported brain specifier', () => {
    when('[t0] brain is "opencode"', () => {
      then('returns null', () => {
        const adapter = getBrainHooks({ brain: 'opencode', repoPath });
        expect(adapter).toBeNull();
      });
    });

    when('[t1] brain is "unknown-brain"', () => {
      then('returns null', () => {
        const adapter = getBrainHooks({
          brain: 'unknown-brain' as any,
          repoPath,
        });
        expect(adapter).toBeNull();
      });
    });
  });
});
