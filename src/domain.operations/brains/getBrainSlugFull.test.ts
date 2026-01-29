import { given, then, when } from 'test-fns';

import { getBrainSlugFull } from './getBrainSlugFull';

describe('getBrainSlugFull', () => {
  given('[case1] slug does NOT include repo prefix', () => {
    when('[t0] slug is simple model name', () => {
      then('returns repo/slug', () => {
        const result = getBrainSlugFull({ repo: 'xai', slug: 'grok-3' });
        expect(result).toEqual('xai/grok-3');
      });
    });

    when('[t1] slug is hierarchical without repo prefix', () => {
      then('returns repo/slug', () => {
        const result = getBrainSlugFull({
          repo: 'anthropic',
          slug: 'claude/sonnet',
        });
        expect(result).toEqual('anthropic/claude/sonnet');
      });
    });
  });

  given('[case2] slug already includes repo prefix', () => {
    when('[t0] slug starts with repo prefix', () => {
      then('returns slug as-is (no double prefix)', () => {
        const result = getBrainSlugFull({
          repo: 'xai',
          slug: 'xai/grok/code-fast-1',
        });
        expect(result).toEqual('xai/grok/code-fast-1');
      });
    });

    when('[t1] openai slug with provider prefix', () => {
      then('returns slug as-is (no double prefix)', () => {
        const result = getBrainSlugFull({
          repo: 'openai',
          slug: 'openai/gpt/4o',
        });
        expect(result).toEqual('openai/gpt/4o');
      });
    });
  });

  given('[case3] edge cases', () => {
    when('[t0] slug contains repo embedded but not as prefix', () => {
      then('returns repo/slug (adds prefix)', () => {
        const result = getBrainSlugFull({
          repo: 'xai',
          slug: 'model-xai-special',
        });
        expect(result).toEqual('xai/model-xai-special');
      });
    });

    when('[t1] repo is part of path but not exact prefix', () => {
      then('returns repo/slug (adds prefix)', () => {
        const result = getBrainSlugFull({
          repo: 'ai',
          slug: 'xai/grok-3',
        });
        expect(result).toEqual('ai/xai/grok-3');
      });
    });
  });
});
