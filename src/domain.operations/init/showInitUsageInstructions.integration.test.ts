import { given, then, useBeforeAll, when } from 'test-fns';

import { genContextCli } from '@src/domain.objects/ContextCli';

import { showInitUsageInstructions } from './showInitUsageInstructions';

describe('showInitUsageInstructions', () => {
  given('[case1] current repo with rhachet-roles-* packages', () => {
    const context = useBeforeAll(() => genContextCli({ cwd: process.cwd() }));

    when('[t0] showInitUsageInstructions is called', () => {
      then('output contains usage header', async () => {
        const result = await showInitUsageInstructions(context);
        expect(result.output).toContain('usage: rhachet init --roles');
      });

      then('output contains rhachet init --roles command', async () => {
        const result = await showInitUsageInstructions(context);
        expect(result.output).toContain('rhachet init --roles');
      });

      then(
        'output omits manifest warn when all packages have rhachet.repo.yml',
        async () => {
          const result = await showInitUsageInstructions(context);
          // all rhachet-roles packages now have rhachet.repo.yml manifests,
          // so no warn section should be shown
          expect(result.output).not.toContain(
            'packages without rhachet.repo.yml',
          );
        },
      );

      then('output lists available roles from packages', async () => {
        const result = await showInitUsageInstructions(context);
        // verify roles are discovered from the packages
        expect(result.output).toContain('available roles:');
      });
    });
  });
});
