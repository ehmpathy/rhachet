import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  enrollCloneAndWaitReady,
  setupEnrollFixture,
  setupRichStubBrainPath,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import { asSummaryBlock } from '@/blackbox/.test/infra/asSummaryBlock';
import {
  asSnapshotSafe,
  invokeRhachetCliBinaryAsync,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = an init role delta reaches a delta actor with a LIVE clone — its `boot.md` too
 * .why = `inventory.of=requirements.case=2`: after `rhx init --roles -driver`, an extant
 *   delta actor drops driver from its roles, its `settings.of.repo.json`, AND its `boot.md`, and
 *   its clones read the change. the boot re-renders only for an ACTIVE actor, so the case
 *   holds a live clone across the init
 * .note = the experience this proves is e22 in the vision catalog
 *   (`.behavior/v2026_09_26.fix-config-blend/1.vision.experience.case=11.init-rederives-delta-actor.md`)
 *
 * .note = the stub brain stands up the clone's socket, so the clone reads LIVE to the init's
 *   active-actor sweep the same way a real claude would; no real brain is needed
 * ⚠️ every cli call while the clone lives is the async twin
 *   (`rule.forbid.sync-invoke-while-a-pty-is-live`)
 */
describe('init role delta → a delta actor with a live clone (acceptance)', () => {
  const scene = useBeforeAll(async () => {
    const dir = genTempDir({ slug: 'init-delta-live' });
    const configDir = genTempDir({ slug: 'init-delta-live-cfg' });
    setupEnrollFixture({ dir });
    const stubPath = setupRichStubBrainPath({ dir });
    const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };

    // a delta actor: the ambient roles (mechanic, architect, driver), minus architect
    const { bg } = await enrollCloneAndWaitReady({
      dir,
      env,
      as: '@:lean',
      extraArgs: ['--roles', '-architect'],
    });
    const actorDirNames = readdirSync(join(dir, '.agent', '.actors')).filter(
      (name) => name.startsWith('actor.via.hash='),
    );
    expect(actorDirNames).toHaveLength(1);
    const actorDir = join(dir, '.agent', '.actors', actorDirNames[0]!);
    return { dir, env, bg, actorDir };
  });
  afterAll(async () => {
    await scene.bg.kill();
  });

  const readBoot = (): string =>
    readFileSync(join(scene.actorDir, 'brain', '.claude', 'boot.md'), 'utf-8');

  given('[case1] a live clone of a `--roles -architect` actor', () => {
    when('[t0] before the init', () => {
      then('the actor boot holds driver and mechanic, never architect', () => {
        const boot = readBoot();
        expect(boot).toContain('role=driver/');
        expect(boot).toContain('role=mechanic/');
        expect(boot).not.toContain('role=architect/');
      });
    });

    when('[t1] `rhx init --roles -driver` while the clone lives', () => {
      const init = useThen('init exits 0', async () => {
        const result = await invokeRhachetCliBinaryAsync({
          args: ['init', '--roles', '-driver'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(result.status).toEqual(0);
        return result;
      });

      then('the actor boot drops driver and keeps mechanic', () => {
        expect(init.status).toEqual(0);
        const boot = readBoot();
        expect(boot).not.toContain('role=driver/');
        expect(boot).toContain('role=mechanic/');
        expect(boot).not.toContain('role=architect/');
      });

      then('the init report a human reads is locked', () => {
        // the screen a human reads when a delta actor with a live clone is re-derived; the
        //   snapshot lets a reviewer read it in the diff, and drift in it fails loud
        expect(
          asSnapshotSafe(asSummaryBlock({ stdout: init.stdout, dir: scene.dir })),
        ).toMatchSnapshot();
      });

      then('the actor record drops driver too', () => {
        // the settings half is proven where the fixture seeds role-authored hooks
        //   (`enroll.acceptance` [case7c]); these linked roles sync no hooks to tell apart
        const manifest = JSON.parse(
          readFileSync(join(scene.actorDir, 'actor.json'), 'utf-8'),
        ) as { roles: string[]; rolesDelta: string[] | null };
        expect(manifest.roles).toEqual(['mechanic']);
        expect(manifest.rolesDelta).toEqual(['-architect']);
      });

      then('the clone still reads LIVE — the init never touched it', async () => {
        const listed = await invokeRhachetCliBinaryAsync({
          args: ['clone', 'list'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(listed.status).toEqual(0);
        expect(listed.stdout).toContain('lean');
        expect(listed.stdout).toContain('LIVE');
      });
    });
  });
});
