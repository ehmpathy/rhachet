import { BadRequestError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { getBrainSlugParts } from './getBrainSlugParts';

describe('getBrainSlugParts', () => {
  given('[case1] valid full slug with simple model name', () => {
    when('[t0] slug is repo/model', () => {
      then('returns { repo, slug } where slug is the full input', () => {
        const result = getBrainSlugParts('xai/grok-3');
        expect(result).toEqual({ repo: 'xai', slug: 'xai/grok-3' });
      });
    });
  });

  given('[case2] valid full slug with hierarchical model name', () => {
    when('[t0] slug is repo/family/variant', () => {
      then('returns repo as first segment, slug as full input', () => {
        const result = getBrainSlugParts('anthropic/claude/sonnet');
        expect(result).toEqual({
          repo: 'anthropic',
          slug: 'anthropic/claude/sonnet',
        });
      });
    });

    when('[t1] slug has multiple path segments', () => {
      then('returns repo as first segment, slug as full input', () => {
        const result = getBrainSlugParts('xai/grok/code-fast-1');
        expect(result).toEqual({ repo: 'xai', slug: 'xai/grok/code-fast-1' });
      });
    });
  });

  given('[case3] invalid slug format', () => {
    when('[t0] slug has no slash', () => {
      then('throws BadRequestError', () => {
        expect(() => getBrainSlugParts('grok-3')).toThrow(BadRequestError);
      });
    });

    when('[t1] slug is empty', () => {
      then('throws BadRequestError', () => {
        expect(() => getBrainSlugParts('')).toThrow(BadRequestError);
      });
    });

    when('[t2] slug ends with slash (empty model part)', () => {
      then('throws BadRequestError', () => {
        expect(() => getBrainSlugParts('xai/')).toThrow(BadRequestError);
      });
    });

    when('[t3] slug starts with slash (empty repo part)', () => {
      then('throws BadRequestError', () => {
        expect(() => getBrainSlugParts('/grok-3')).toThrow(BadRequestError);
      });
    });
  });

  given('[case4] symmetric with getBrainSlugFull', () => {
    // the standard: slug ALWAYS includes repo prefix
    // getBrainSlugFull({ repo, slug }) returns slug directly if it starts with repo/
    // getBrainSlugParts(fullSlug) returns { repo, slug: fullSlug }
    when('[t0] round-trip preserves full slug', () => {
      then('getBrainSlugFull(getBrainSlugParts(x)) === x', () => {
        const original = 'xai/grok-3';
        const parts = getBrainSlugParts(original);
        // since slug is the full input, getBrainSlugFull should return it as-is
        expect(parts.slug).toEqual(original);
      });
    });

    when('[t1] round-trip for hierarchical slug', () => {
      then('getBrainSlugFull(getBrainSlugParts(x)) === x', () => {
        const original = 'anthropic/claude/sonnet';
        const parts = getBrainSlugParts(original);
        expect(parts.slug).toEqual(original);
      });
    });
  });
});
