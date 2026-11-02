import {
  chmodSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { setupRoleFixtureRepo } from '@/blackbox/.test/infra/roleFixtureRepo';

/**
 * .what = `rhx init --roles mechanic` boots a tree whose grove file is read-only, as a cloud box ships it
 * .why = vision case 1. the mechanic init up to `rhachet-roles-ehmpathy@1.39.4` copied
 *   `.claude/settings.json` (an arrow to the grove) twice into one backup name; a read-only grove
 *   gave a read-only backup, and the second copy faulted. on a pass its `mv` replaced the grove arrow
 *   with a real file. the pin `>= 1.39.5` writes `settings.of.repo.json` by name, never through the arrow
 *
 * .note = the fixture links this repo's node_modules, so the mechanic init here is the pinned one
 */

/** .what = the repo actor's brain dir, relative to a repo root */
const REPO_ACTOR_BRAIN_DIR = join(
  '.agent',
  '.actors',
  'actor.via.repo=ambient',
  'brain',
  '.claude',
);

/** .what = the grove content: the human's home settings */
const GROVE_CONTENT = `${JSON.stringify({ theme: 'dark' }, null, 2)}\n`;

/**
 * .what = the init screen with each volatile span masked
 * .why = the temp repo, the repo root and its `../` climb, a backup stamp, the version, and the
 *   role corpus counts move per host or per release; the screen's shape is what this pins
 * .note = the same spans `init.incremental`'s `asAbsoluteInitScreen` masks, kept local (two uses)
 */
const asInitScreen = (input: { stdout: string; dir: string }): string =>
  input.stdout
    .split(input.dir)
    .join('$TESTDIR')
    .split(join(__dirname, '..', '..'))
    .join('$REPO_ROOT')
    .replace(/(?:\.\.\/)*\.\.(?=\$REPO_ROOT)/g, '$RELCLIMB')
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.-]*\dZ?/g, '$TIMESTAMP')
    .replace(/@\d+\.\d+\.\d+(?:-[\w.]+)?/g, '@$VERSION')
    .replace(/\b\d+ (brief|skill|init|hook|rule)\(s\)/g, '$COUNT $1(s)');

describe('rhx init — a read-only grove file (vision case 1)', () => {
  given('[case1] a fresh tree, a HOME whose grove settings.json is 0444', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'init-readonly-grove' });
      setupRoleFixtureRepo({ dir });
      const home = genTempDir({ slug: 'init-readonly-grove-home' });
      mkdirSync(join(home, '.claude'), { recursive: true });
      const grovePath = join(home, '.claude', 'settings.json');
      writeFileSync(grovePath, GROVE_CONTENT);
      chmodSync(grovePath, 0o444);
      return { dir, home, grovePath };
    });

    when('[t0] rhx init --roles mechanic', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'mechanic'],
          cwd: scene.dir,
          // unset the runner's own config dir, so a clone's run screens the same as ci's
          env: { HOME: scene.home, CLAUDE_CONFIG_DIR: undefined },
          logOnError: false,
        }),
      );

      then('exits 0: the mechanic init never copies through the grove arrow', () => {
        // stderr rides in the received object so a red run prints it in the diff
        expect({ status: result.status, stderr: result.stderr }).toMatchObject({
          status: 0,
        });
      });

      then('the screen names settings.of.repo.json, never the grove arrow, and matches snapshot', () => {
        // the facts the snapshot carries are asserted here too, so a resnap cannot hide a drift
        expect(result.stdout).toContain('.claude/settings.of.repo.json');
        expect(result.stdout).not.toContain('.claude/settings.json');
        expect(result.stdout).toContain('1 role(s) initialized');
        expect(asInitScreen({ stdout: result.stdout, dir: scene.dir })).toMatchSnapshot();
      });

      then("claude's settings.json is still the grove arrow", () => {
        expect(
          readlinkSync(join(scene.dir, REPO_ACTOR_BRAIN_DIR, 'settings.json')),
        ).toEqual('settings.of.grove.json');
      });

      then('settings.of.grove.json still aims at the home file', () => {
        expect(
          readlinkSync(
            join(scene.dir, REPO_ACTOR_BRAIN_DIR, 'settings.of.grove.json'),
          ),
        ).toEqual(scene.grovePath);
      });

      then('the home file is byte-identical and still read-only', () => {
        expect(readFileSync(scene.grovePath, 'utf8')).toEqual(GROVE_CONTENT);
        expect(statSync(scene.grovePath).mode & 0o777).toEqual(0o444);
      });

      then("the mechanic's allows land in settings.of.repo.json", () => {
        const settings = JSON.parse(
          readFileSync(
            join(scene.dir, REPO_ACTOR_BRAIN_DIR, 'settings.of.repo.json'),
            'utf8',
          ),
        ) as { permissions?: { allow?: string[] } };
        expect(settings.permissions?.allow?.length ?? 0).toBeGreaterThan(0);
      });
    });
  });
});
