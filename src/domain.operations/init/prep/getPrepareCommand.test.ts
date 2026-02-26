import { given, then, when } from 'test-fns';

import { getPrepareCommand } from './getPrepareCommand';

describe('getPrepareCommand', () => {
  given('[case1] hooks=true, consumer repo', () => {
    when('[t0] single role', () => {
      then('includes --hooks and --roles', () => {
        const result = getPrepareCommand({
          hooks: true,
          roles: ['mechanic'],
          pkgName: 'my-app',
        });
        expect(result).toEqual('rhachet init --hooks --roles mechanic');
      });
    });

    when('[t1] multiple roles', () => {
      then('joins roles with space', () => {
        const result = getPrepareCommand({
          hooks: true,
          roles: ['mechanic', 'behaver'],
          pkgName: 'my-app',
        });
        expect(result).toEqual('rhachet init --hooks --roles mechanic behaver');
      });
    });

    when('[t2] three roles', () => {
      then('joins all roles with space', () => {
        const result = getPrepareCommand({
          hooks: true,
          roles: ['a', 'b', 'c'],
          pkgName: 'my-app',
        });
        expect(result).toEqual('rhachet init --hooks --roles a b c');
      });
    });
  });

  given('[case2] hooks=false, consumer repo', () => {
    when('[t0] single role', () => {
      then('omits --hooks', () => {
        const result = getPrepareCommand({
          hooks: false,
          roles: ['mechanic'],
          pkgName: 'my-app',
        });
        expect(result).toEqual('rhachet init --roles mechanic');
      });
    });

    when('[t1] multiple roles', () => {
      then('omits --hooks, joins roles', () => {
        const result = getPrepareCommand({
          hooks: false,
          roles: ['a', 'b'],
          pkgName: 'my-app',
        });
        expect(result).toEqual('rhachet init --roles a b');
      });
    });
  });

  given('[case3] rhachet-roles-* repo', () => {
    when('[t0] pkg name is rhachet-roles-ehmpathy', () => {
      then('prepends npm run build &&', () => {
        const result = getPrepareCommand({
          hooks: true,
          roles: ['mechanic', 'behaver'],
          pkgName: 'rhachet-roles-ehmpathy',
        });
        expect(result).toEqual(
          'npm run build && rhachet init --hooks --roles mechanic behaver',
        );
      });
    });

    when('[t1] pkg name is rhachet-roles-bhuild', () => {
      then('prepends npm run build &&', () => {
        const result = getPrepareCommand({
          hooks: false,
          roles: ['behaver'],
          pkgName: 'rhachet-roles-bhuild',
        });
        expect(result).toEqual('npm run build && rhachet init --roles behaver');
      });
    });
  });

  given('[case4] pkgName is null', () => {
    when('[t0] no pkg name available', () => {
      then('does not prepend build step', () => {
        const result = getPrepareCommand({
          hooks: true,
          roles: ['mechanic'],
          pkgName: null,
        });
        expect(result).toEqual('rhachet init --hooks --roles mechanic');
      });
    });
  });
});
