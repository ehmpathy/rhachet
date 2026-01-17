import { given, then, when } from 'test-fns';

import { showInitUsageInstructions } from './showInitUsageInstructions';

describe('showInitUsageInstructions', () => {
  given('[case1] current repo with rhachet-roles-* packages', () => {
    when('[t0] showInitUsageInstructions is called', () => {
      then('output contains usage header', async () => {
        const result = await showInitUsageInstructions({
          from: process.cwd(),
        });
        expect(result.output).toContain('usage: npx rhachet init --roles');
      });

      then('output contains npx rhachet init --roles command', async () => {
        const result = await showInitUsageInstructions({
          from: process.cwd(),
        });
        expect(result.output).toContain('npx rhachet init --roles');
      });

      then(
        'output omits manifest warn when all packages have rhachet.repo.yml',
        async () => {
          const result = await showInitUsageInstructions({
            from: process.cwd(),
          });
          // all rhachet-roles packages now have rhachet.repo.yml manifests,
          // so no warn section should be shown
          expect(result.output).not.toContain(
            'packages without rhachet.repo.yml',
          );
        },
      );

      then('output lists available roles from packages', async () => {
        const result = await showInitUsageInstructions({
          from: process.cwd(),
        });
        // verify roles are discovered from the packages
        expect(result.output).toContain('available roles:');
      });
    });
  });
});
