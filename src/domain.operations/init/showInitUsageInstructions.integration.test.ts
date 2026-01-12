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
        'output mentions packages without manifests when they lack rhachet.repo.yml',
        async () => {
          const result = await showInitUsageInstructions({
            from: process.cwd(),
          });
          // since rhachet-roles packages don't have rhachet.repo.yml yet,
          // we expect the error section to be shown
          expect(result.output).toContain('packages without rhachet.repo.yml');
        },
      );

      then(
        'output suggests npx rhachet repo introspect for packages without manifests',
        async () => {
          const result = await showInitUsageInstructions({
            from: process.cwd(),
          });
          expect(result.output).toContain('npx rhachet repo introspect');
        },
      );
    });
  });
});
