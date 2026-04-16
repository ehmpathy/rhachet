import { given, then, when } from 'test-fns';

import type { BrainAuthCredential } from '@src/domain.objects/BrainAuthCredential';

import { genBrainAuthAdapterForClaudeCode } from './genBrainAuthAdapterForClaudeCode';

describe('genBrainAuthAdapterForClaudeCode', () => {
  given('[case1] adapter is created', () => {
    const adapter = genBrainAuthAdapterForClaudeCode();

    when('[t0] check adapter slug', () => {
      then('has correct brain slug', () => {
        expect(adapter.slug).toEqual('anthropic/claude-code');
      });
    });
  });

  given('[case2] capacity.get.one is called', () => {
    const adapter = genBrainAuthAdapterForClaudeCode();
    const credential: BrainAuthCredential = {
      slug: 'ehmpathy.prod.ANTHROPIC_API_KEY_1',
      token: 'sk-ant-test-123',
    };

    when('[t0] queried for single credential', () => {
      then('returns capacity with credential ref', async () => {
        const capacity = await adapter.capacity.get.one({ credential });
        expect(capacity.credential.slug).toEqual(credential.slug);
        expect(capacity.tokens.unit).toEqual('percentage');
        expect(capacity.tokens.left).toBeGreaterThan(0);
      });
    });
  });

  given('[case3] capacity.get.all is called', () => {
    const adapter = genBrainAuthAdapterForClaudeCode();
    const credentials: BrainAuthCredential[] = [
      { slug: 'ehmpathy.prod.ANTHROPIC_API_KEY_1', token: 'sk-ant-test-1' },
      { slug: 'ehmpathy.prod.ANTHROPIC_API_KEY_2', token: 'sk-ant-test-2' },
      { slug: 'ehmpathy.prod.ANTHROPIC_API_KEY_3', token: 'sk-ant-test-3' },
    ];

    when('[t0] queried for all credentials', () => {
      then('returns capacity for each credential', async () => {
        const capacities = await adapter.capacity.get.all({ credentials });
        expect(capacities).toHaveLength(3);
        expect(capacities[0]!.credential.slug).toEqual(credentials[0]!.slug);
        expect(capacities[1]!.credential.slug).toEqual(credentials[1]!.slug);
        expect(capacities[2]!.credential.slug).toEqual(credentials[2]!.slug);
      });
    });
  });

  given('[case4] auth.supply is called', () => {
    const adapter = genBrainAuthAdapterForClaudeCode();
    const credential: BrainAuthCredential = {
      slug: 'ehmpathy.prod.ANTHROPIC_API_KEY_1',
      token: 'sk-ant-test-abc123',
    };

    when('[t0] supply credential to adapter', () => {
      then('returns formatted output with raw token', async () => {
        const supplied = await adapter.auth.supply({ credential });
        expect(supplied.brainSlug).toEqual('anthropic/claude-code');
        expect(supplied.formatted).toEqual('sk-ant-test-abc123');
        expect(supplied.credential.slug).toEqual(credential.slug);
      });
    });
  });
});
