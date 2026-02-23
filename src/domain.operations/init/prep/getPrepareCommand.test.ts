import { given, then, when } from 'test-fns';

import { getPrepareCommand } from './getPrepareCommand';

describe('getPrepareCommand', () => {
  given('[case1] hooks=true', () => {
    when('[t0] single role', () => {
      then('includes --hooks and --roles', () => {
        const result = getPrepareCommand({ hooks: true, roles: ['mechanic'] });
        expect(result).toEqual('rhachet init --hooks --roles mechanic');
      });
    });

    when('[t1] multiple roles', () => {
      then('joins roles with space', () => {
        const result = getPrepareCommand({
          hooks: true,
          roles: ['mechanic', 'behaver'],
        });
        expect(result).toEqual('rhachet init --hooks --roles mechanic behaver');
      });
    });

    when('[t2] three roles', () => {
      then('joins all roles with space', () => {
        const result = getPrepareCommand({
          hooks: true,
          roles: ['a', 'b', 'c'],
        });
        expect(result).toEqual('rhachet init --hooks --roles a b c');
      });
    });
  });

  given('[case2] hooks=false', () => {
    when('[t0] single role', () => {
      then('omits --hooks', () => {
        const result = getPrepareCommand({ hooks: false, roles: ['mechanic'] });
        expect(result).toEqual('rhachet init --roles mechanic');
      });
    });

    when('[t1] multiple roles', () => {
      then('omits --hooks, joins roles', () => {
        const result = getPrepareCommand({ hooks: false, roles: ['a', 'b'] });
        expect(result).toEqual('rhachet init --roles a b');
      });
    });
  });
});
