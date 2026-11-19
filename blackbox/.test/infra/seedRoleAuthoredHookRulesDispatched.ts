import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { HOOK_DISPATCH_AUTHOR } from './getAllHookDispatchManifestRows';

/**
 * .what = seeds the repo actor in the shape `rhx init --hooks` leaves it: SessionStart rules
 *         authored by distinct roles (driver, mechanic, architect) in `hooks.dispatch.manifest`,
 *         and one dispatcher hook in `settings.of.repo.json` that names that manifest
 * .why = the twin of `seedRoleAuthoredHooks` for a repo on the dispatcher. an enrolled actor's own
 *        manifest is then a direct readout of the computed role set: drop driver ⇒ its rule is
 *        gone, keep mechanic/architect ⇒ their rules remain
 * .note = written through `<repo>/.claude`, the symlink into the repo actor's brain dir
 */
export const seedRoleAuthoredHookRulesDispatched = (input: { dir: string }): void => {
  const claudeDir = join(input.dir, '.claude');
  mkdirSync(claudeDir, { recursive: true });

  // the rules, one row each: event · matcher · timeout · author · kind · path · frame · args · command · when
  const asRow = (author: string): string =>
    ['SessionStart', '*', '5', author, 'foreign', '', '', '', 'true', ''].join('\x1f');
  writeFileSync(
    join(claudeDir, 'hooks.dispatch.manifest'),
    [
      '# rhachet hooks.dispatch manifest v1',
      asRow('repo=bhrain/role=driver'),
      asRow('repo=ehmpathy/role=mechanic'),
      asRow('repo=ehmpathy/role=architect'),
      '',
    ].join('\n'),
    'utf-8',
  );

  // the one dispatcher claude starts for the event
  const settings = {
    hooks: {
      SessionStart: [
        {
          matcher: '*',
          hooks: [
            {
              type: 'command',
              command:
                'bash ./node_modules/rhachet/bin/hooks.dispatch.sh .agent/.actors/actor.via.repo=ambient/brain/.claude/hooks.dispatch.manifest SessionStart',
              timeout: 10,
              author: HOOK_DISPATCH_AUTHOR,
            },
          ],
        },
      ],
    },
  };
  writeFileSync(
    join(claudeDir, 'settings.of.repo.json'),
    `${JSON.stringify(settings, null, 2)}\n`,
    'utf-8',
  );
};
