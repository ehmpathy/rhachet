import { getError, given, then, when } from 'test-fns';

import { BrainRepl } from '@src/domain.objects/BrainRepl';

import { findActorBrainInAllowlist } from './findActorBrainInAllowlist';

describe('findActorBrainInAllowlist', () => {
  // create test brains
  const brainCodex = new BrainRepl({
    repo: 'openai',
    slug: 'codex',
    description: 'openai codex for testing',
    ask: jest.fn(),
    act: jest.fn(),
  });

  const brainClaude = new BrainRepl({
    repo: 'anthropic',
    slug: 'claude/code',
    description: 'anthropic claude for testing',
    ask: jest.fn(),
    act: jest.fn(),
  });

  const allowlist = [brainCodex, brainClaude];

  given('a ref lookup', () => {
    when('brain is in allowlist', () => {
      then('returns the brain', () => {
        const result = findActorBrainInAllowlist({
          brain: { repo: 'openai', slug: 'codex' },
          allowlist,
        });
        expect(result).toBe(brainCodex);
      });
    });

    when('brain is not in allowlist', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          findActorBrainInAllowlist({
            brain: { repo: 'google', slug: 'gemini' },
            allowlist,
          }),
        );
        expect(error).toBeDefined();
        expect(error.message).toContain('brain not in actor allowlist');
      });
    });
  });

  given('a direct BrainRepl', () => {
    when('brain is in allowlist', () => {
      then('returns the brain from allowlist', () => {
        const result = findActorBrainInAllowlist({
          brain: brainClaude,
          allowlist,
        });
        expect(result).toBe(brainClaude);
      });
    });

    when('brain is not in allowlist', () => {
      const otherBrain = new BrainRepl({
        repo: 'google',
        slug: 'gemini',
        description: 'google gemini for testing',
        ask: jest.fn(),
        act: jest.fn(),
      });

      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          findActorBrainInAllowlist({
            brain: otherBrain,
            allowlist,
          }),
        );
        expect(error).toBeDefined();
        expect(error.message).toContain('brain not in actor allowlist');
      });
    });
  });

  given('empty allowlist', () => {
    when('brain lookup attempted', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          findActorBrainInAllowlist({
            brain: { repo: 'openai', slug: 'codex' },
            allowlist: [],
          }),
        );
        expect(error).toBeDefined();
        expect(error.message).toContain('brain not in actor allowlist');
      });
    });
  });
});
