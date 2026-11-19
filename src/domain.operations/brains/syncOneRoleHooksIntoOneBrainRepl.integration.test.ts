import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genBrainHooksAdapterForClaudeCode } from '@src/_topublish/rhachet-brains-anthropic/src';
import type { HasRepo } from '@src/domain.objects/HasRepo';
import { Role } from '@src/domain.objects/Role';
import type { RoleHooks } from '@src/domain.objects/RoleHooks';

import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { syncOneRoleHooksIntoOneBrainRepl } from './syncOneRoleHooksIntoOneBrainRepl';

/**
 * .what = the stanza `howto.declare-the-boot-drift-hook` tells a role author to write, verbatim
 * .why = the brief is the one path to a live drift nudge; this test holds it to what the relay accepts
 */
const BOOT_DRIFT_HOOK_STANZA: RoleHooks = {
  onBrain: {
    onStop: [
      { command: 'rhx clone boot drift --when hook.onStop', timeout: 'PT10S' },
    ],
  },
};

describe('syncOneRoleHooksIntoOneBrainRepl, via the claude adapter', () => {
  given(
    '[case1] a role that declares the boot drift hook, per its brief',
    () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genTempDir({ slug: 'boot-drift-hook-relay' });
        mkdirSync(join(repoPath, '.claude'), { recursive: true });
        const role: HasRepo<Role> = {
          ...new Role({
            slug: 'surfer',
            name: 'Surfer',
            purpose: 'a role that tells its clones of boot drift',
            readme: { uri: 'readme.md' },
            traits: [],
            skills: { dirs: { uri: 'skills' }, refs: [] },
            briefs: { dirs: { uri: 'briefs' } },
            hooks: BOOT_DRIFT_HOOK_STANZA,
          }),
          repo: 'test-registry',
        };
        const adapter = genBrainHooksAdapterForClaudeCode({ repoPath });
        const result = await syncOneRoleHooksIntoOneBrainRepl({
          role,
          adapter,
        });
        return { repoPath, result };
      });

      when('[t0] the hooks are synced into the brain dir', () => {
        then('one hook is created', () => {
          expect(scene.result.hooks.created).toHaveLength(1);
        });

        then(
          'the Stop entry in settings.of.repo.json runs the drift verb',
          () => {
            const settings = JSON.parse(
              readFileSync(
                join(scene.repoPath, '.claude', 'settings.of.repo.json'),
                'utf8',
              ),
            ) as {
              hooks: { Stop: Array<{ hooks: Array<{ command: string }> }> };
            };
            const commands = settings.hooks.Stop.flatMap((entry) =>
              entry.hooks.map((hook) => hook.command),
            );
            expect(commands).toContain(
              'rhx clone boot drift --when hook.onStop',
            );
            expect(settings.hooks.Stop).toMatchSnapshot();
          },
        );
      });
    },
  );
});
