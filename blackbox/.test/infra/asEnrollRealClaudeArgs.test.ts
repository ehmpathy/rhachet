import { given, then, when } from 'test-fns';

import { asEnrollRealClaudeArgs } from './asEnrollRealClaudeArgs';

describe('asEnrollRealClaudeArgs', () => {
  given('[case1] a tier-2 enroll with no slug and no roleset', () => {
    when('[t0] the argv is built', () => {
      const args = asEnrollRealClaudeArgs({ as: null, roles: null });

      then('the brain is pinned to haiku, the model the smoke budget is set on', () => {
        expect(args.slice(args.indexOf('--model'), args.indexOf('--model') + 2)).toEqual([
          '--model',
          'haiku',
        ]);
      });

      then('the argv renders as snapped', () => {
        expect(args).toMatchSnapshot();
      });
    });
  });

  given('[case2] a tier-2 enroll with a slug and a roleset', () => {
    when('[t0] the argv is built', () => {
      const args = asEnrollRealClaudeArgs({
        as: '@:reach1',
        roles: ['mechanic', '-driver'],
      });

      then('the slug and the roleset still leave haiku as the model', () => {
        expect(args.filter((arg) => arg === '--model')).toHaveLength(1);
        expect(args[args.indexOf('--model') + 1]).toEqual('haiku');
      });

      then('the argv renders as snapped', () => {
        expect(args).toMatchSnapshot();
      });
    });
  });
});
