import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = seeds the repo actor's `settings.of.repo.json` with SessionStart hooks authored
 *         by distinct roles (driver, mechanic, architect)
 * .why = genBrainCliConfigArtifact reads the repo actor's `settings.of.repo.json` and retains
 *        only the hooks whose `author` names an ENROLLED role. so the enrolled actor's
 *        `settings.of.repo.json` is a direct, observable readout of the computed role set:
 *        drop driver ⇒ its hook is gone, keep mechanic/architect ⇒ their hooks remain.
 * .note = written through `<repo>/.claude`, the symlink into the repo actor's brain dir,
 *        and never to `settings.json` — that name is an arrow to the host's grove
 */
export const seedRoleAuthoredHooks = (input: { dir: string }): void => {
  const settings = {
    hooks: {
      SessionStart: [
        {
          matcher: '*',
          hooks: [
            { type: 'command', command: 'true', author: 'repo=bhrain/role=driver' },
          ],
        },
        {
          matcher: '*',
          hooks: [
            {
              type: 'command',
              command: 'true',
              author: 'repo=ehmpathy/role=mechanic',
            },
          ],
        },
        {
          matcher: '*',
          hooks: [
            {
              type: 'command',
              command: 'true',
              author: 'repo=ehmpathy/role=architect',
            },
          ],
        },
      ],
    },
  };
  const claudeDir = join(input.dir, '.claude');
  mkdirSync(claudeDir, { recursive: true });
  writeFileSync(
    join(claudeDir, 'settings.of.repo.json'),
    JSON.stringify(settings, null, 2) + '\n',
    'utf-8',
  );
};
