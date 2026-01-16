import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { getBrainHooks } from './getBrainHooks';

describe('getBrainHooks', () => {
  const repoPath = path.join(os.tmpdir(), 'test-repo');

  given('[case1] supported brain specifier', () => {
    when('[t0] brain is "opencode"', () => {
      then('returns adapter for opencode', () => {
        const adapter = getBrainHooks({ brain: 'opencode', repoPath });
        expect(adapter).not.toBeNull();
        expect(adapter?.slug).toEqual('opencode');
      });
    });

    when('[t1] brain is "anomaly/opencode"', () => {
      then('returns adapter for opencode', () => {
        const adapter = getBrainHooks({
          brain: 'anomaly/opencode',
          repoPath,
        });
        expect(adapter).not.toBeNull();
        expect(adapter?.slug).toEqual('opencode');
      });
    });
  });

  given('[case2] unsupported brain specifier', () => {
    when('[t0] brain is "claude-code"', () => {
      then('returns null', () => {
        const adapter = getBrainHooks({ brain: 'claude-code', repoPath });
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
