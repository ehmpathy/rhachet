import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { genSampleCloneOndisk } from '@src/.test/assets/genSampleCloneOndisk';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { genActorBootRevision } from '@src/domain.operations/boot/genActorBootRevision';
import { setActorBootDrifts } from '@src/domain.operations/boot/setActorBootDrifts';
import { setCloneBootSpawnedRef } from '@src/domain.operations/clone/setCloneBootSpawnedRef';
import { setCloneBootSpawnedResumed } from '@src/domain.operations/clone/setCloneBootSpawnedResumed';

/**
 * .what = acceptance for `rhx clone boot drift` through the built binary, cred-free
 * .why = the drift readout and the onStop hook arm are a contract a human and a role hook
 *        call by name; the wire-up from argv to exit code is proven here, at the level they
 *        invoke it
 * .note = a drifted clone is plain disk state (a spawn ref, a revision, a drift), so case2 seeds
 *         it through the fixture ops, as `clone.get-advisory` does, and drives only the binary
 */
describe('rhx clone boot drift (acceptance)', () => {
  given('[case1] a repo with no clone enrolled', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-multi-skills' }),
    );

    when('[t0] the readout runs outside a clone, with no --of', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it exits 2 and names the flag and the list command', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('no clone is named');
        expect(result.stderr).toContain('--of @:<slug|serial>');
        expect(result.stderr).toContain('rhx clone list');
      });

      then('the error matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] the readout names a clone that does not exist', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--of', '@:ghost'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it exits 2 and names the address it could not find', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('no clone answers to that address');
        expect(result.stderr).toContain('@:ghost');
      });

      then('the error matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1b] the readout names a clone without the @: clone marker', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--of', 'driver'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it exits 2 and refuses the address shape, never a lookup', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('ConstraintError');
        expect(result.stderr).toContain('@:');
        expect(result.stderr).not.toContain('no clone answers to that address');
      });

      then('the error matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] the onStop hook runs in a process that is no clone', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--when', 'hook.onStop'],
          cwd: repo.path,
        }),
      );

      then('it exits 0, silent: a stop is never blocked by a non-clone', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toEqual('');
      });
    });

    when('[t3] the onStop hook runs with a serial no clone on disk holds', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--when', 'hook.onStop'],
          cwd: repo.path,
          env: { RHACHET_CLONE_SERIAL: '00000000-0000-0000-0000-000000000000' },
          logOnError: false,
        }),
      );

      then('it exits 1, a malfunction, which never blocks a stop', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('MalfunctionError');
        expect(result.stderr).toContain('names no on-disk clone');
      });

      then('the error matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t4] the hook moment rides --of', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'clone',
            'boot',
            'drift',
            '--when',
            'hook.onStop',
            '--of',
            '@:ghost',
          ],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it refuses the pair with exit 2, never drops --of', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('--of cannot ride --when hook.onStop');
      });

      then('the error matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t5] the readout names a ghost clone, with --output json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--of', '@:ghost', '--output', 'json'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it exits 2 and a machine reads the error by field', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout).toEqual('');
        const parsed = JSON.parse(result.stderr) as {
          class: string;
          message: string;
          metadata: { address: string };
        };
        expect(parsed.class).toEqual('ConstraintError');
        expect(parsed.message).toEqual('no clone answers to that address');
        expect(parsed.metadata.address).toEqual('@:ghost');
      });

      then('the json error matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t6] the readout names an output mode that does not exist', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--of', '@:ghost', '--output', 'bogus'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it exits 2 and names the valid modes, before any lookup', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('bogus');
        expect(result.stderr).not.toContain('no clone answers to that address');
      });

      then('the error matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case2] a clone whose boot drifted past the threshold', () => {
    // a clone `@:reviewer` spawned on boot v1; the actor boot then moved to v2 and the sweep
    // wrote the drift. every file is plain disk state, so no live brain is needed
    const scene = useBeforeAll(async () => {
      const seeded = await genSampleCloneOndisk({
        repoPath: genTempDir({ slug: 'clone-boot-drift-accept', git: true }),
        serial: '5d1e2f3a-4b5c-4d6e-8f9a-0b1c2d3e4f5a',
        slug: 'reviewer',
        socketEligible: false,
      });
      const brainDir = getBrainOndiskDir({ actorDir: seeded.actorDir });
      mkdirSync(brainDir, { recursive: true });
      writeFileSync(join(brainDir, 'boot.md'), BOOT_V1);
      const revision = genActorBootRevision({ actorDir: seeded.actorDir })!;
      setCloneBootSpawnedRef({ cloneDir: seeded.cloneDir, hash: revision.hash });
      writeFileSync(join(brainDir, 'boot.md'), BOOT_V2);
      setActorBootDrifts({
        actorDir: seeded.actorDir,
        bootMdPathCurrent: join(brainDir, 'boot.md'),
      });
      return seeded;
    });

    when('[t0] `clone boot drift --of @:reviewer` runs', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--of', '@:reviewer'],
          cwd: scene.repoPath,
        }),
      );

      then('it exits 0 and names the drift a compacted clone must hold', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toMatch(/drift = [0-9a-f]{16}/);
        expect(result.stdout).toContain('1 block drifted since this clone spawned');
        expect(result.stdout).toContain('over the 200 line threshold');
        expect(result.stdout).toContain('; if it does not, respawn it');
      });

      then('the tree matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t0b] `clone boot drift --of @:reviewer --output json` runs', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--of', '@:reviewer', '--output', 'json'],
          cwd: scene.repoPath,
        }),
      );

      then('it exits 0 and a machine reads the drift by field', () => {
        expect(result.status).toEqual(0);
        const parsed = JSON.parse(result.stdout) as {
          address: string;
          serial: string;
          drift: { kind: string; drift: string; lines: number; capped: boolean };
        };
        expect(parsed.address).toEqual('@:reviewer');
        expect(parsed.serial).toEqual(scene.serial);
        expect(parsed.drift.kind).toEqual('drifted');
        expect(parsed.drift.drift).toMatch(/^[0-9a-f]{16}$/);
        expect(parsed.drift.lines).toBeGreaterThan(200);
        expect(parsed.drift.capped).toEqual(false);
      });

      then('the json matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t0c] the hook moment rides --output', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--when', 'hook.onStop', '--output', 'json'],
          cwd: scene.repoPath,
          env: { RHACHET_CLONE_SERIAL: scene.serial },
          logOnError: false,
        }),
      );

      then('it refuses with exit 2 and names the inspector form', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('--output cannot ride --when hook.onStop');
        expect(result.stderr).toContain('--output json');
      });

      then('the error matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] the onStop hook runs inside the clone, twice', () => {
      const result = useBeforeAll(async () => {
        const env = { RHACHET_CLONE_SERIAL: scene.serial };
        const args = ['clone', 'boot', 'drift', '--when', 'hook.onStop'];
        const first = invokeRhachetCliBinary({
          args,
          cwd: scene.repoPath,
          env,
          logOnError: false,
        });
        const second = invokeRhachetCliBinary({ args, cwd: scene.repoPath, env });
        return { first, second };
      });

      then('the first stop is blocked once, the nudge on stderr', () => {
        expect(result.first.status).toEqual(2);
        expect(result.first.stdout).toEqual('');
        expect(result.first.stderr).toContain('to take it');
        expect(result.first.stderr).toContain(
          'rhx clone say @:reviewer --what /compact',
        );
      });

      then('the second stop is silent: the drift is told once', () => {
        expect(result.second.status).toEqual(0);
        expect(result.second.stderr).toEqual('');
      });

      then('the nudge matches snapshot', () => {
        expect(asSnapshotSafe(result.first.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] a clone whose boot drifted past the 2000 line carry cap', () => {
    // the sweep writes a stub drift; the reader must carry `capped` through to the readout
    const scene = useBeforeAll(async () => {
      const seeded = await genSampleCloneOndisk({
        repoPath: genTempDir({ slug: 'clone-boot-drift-capped', git: true }),
        serial: '6e2f3a4b-5c6d-4e7f-9a0b-1c2d3e4f5a6b',
        slug: 'capped',
        socketEligible: false,
      });
      const brainDir = getBrainOndiskDir({ actorDir: seeded.actorDir });
      mkdirSync(brainDir, { recursive: true });
      writeFileSync(join(brainDir, 'boot.md'), BOOT_V1);
      const revision = genActorBootRevision({ actorDir: seeded.actorDir })!;
      setCloneBootSpawnedRef({ cloneDir: seeded.cloneDir, hash: revision.hash });
      writeFileSync(join(brainDir, 'boot.md'), BOOT_V2_OVER_CAP);
      setActorBootDrifts({
        actorDir: seeded.actorDir,
        bootMdPathCurrent: join(brainDir, 'boot.md'),
      });
      return seeded;
    });

    when('[t0] `clone boot drift --of @:capped` runs', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--of', '@:capped'],
          cwd: scene.repoPath,
        }),
      );

      then('it exits 0 and names respawn as the one cure', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('past the 2000 line cap');
        expect(result.stdout).toContain('only a respawn takes the current boot');
      });

      then('the tree matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t0b] `clone boot drift --of @:capped --output json` runs', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--of', '@:capped', '--output', 'json'],
          cwd: scene.repoPath,
        }),
      );

      then('it exits 0 and a machine reads the cap by field', () => {
        expect(result.status).toEqual(0);
        const parsed = JSON.parse(result.stdout) as {
          drift: { kind: string; capped: boolean; lines: number };
        };
        expect(parsed.drift.kind).toEqual('drifted');
        expect(parsed.drift.capped).toEqual(true);
        expect(parsed.drift.lines).toBeGreaterThan(2000);
      });

      then('the json matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] the onStop hook runs inside the clone', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--when', 'hook.onStop'],
          cwd: scene.repoPath,
          env: { RHACHET_CLONE_SERIAL: scene.serial },
          logOnError: false,
        }),
      );

      then('the nudge names respawn and offers no /compact', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('past the 2000 line cap');
        expect(result.stderr).toContain('to take it, respawn');
        expect(result.stderr).not.toContain('/compact');
      });

      then('the nudge matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case4] four clones of one actor the onStop hook must leave silent', () => {
    // one actor, four clones: a slugless one on v1 under a small drift, a resumed one on v1, a
    // legacy one with no ref, and one on the current boot. none of the four warrants a nudge
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'clone-boot-drift-silent', git: true });
      const genClone = (input: { serial: string; slug: string | null }) =>
        genSampleCloneOndisk({
          repoPath,
          serial: input.serial,
          slug: input.slug,
          socketEligible: false,
        });
      const bare = await genClone({
        serial: '7f3a4b5c-6d7e-4f8a-9b0c-1d2e3f4a5b6c',
        slug: null,
      });
      const resumed = await genClone({
        serial: '8a4b5c6d-7e8f-4a9b-8c1d-2e3f4a5b6c7d',
        slug: 'back',
      });
      const legacy = await genClone({
        serial: '9b5c6d7e-8f9a-4b0c-9d2e-3f4a5b6c7d8e',
        slug: 'old',
      });
      const fresh = await genClone({
        serial: 'ac6d7e8f-9a0b-4c1d-8e3f-4a5b6c7d8e9f',
        slug: 'fresh',
      });

      // v1, the boot the bare and the resumed clones spawned on
      const brainDir = getBrainOndiskDir({ actorDir: bare.actorDir });
      mkdirSync(brainDir, { recursive: true });
      writeFileSync(join(brainDir, 'boot.md'), BOOT_V1);
      const revisionV1 = genActorBootRevision({ actorDir: bare.actorDir })!;
      setCloneBootSpawnedRef({ cloneDir: bare.cloneDir, hash: revisionV1.hash });
      setCloneBootSpawnedRef({
        cloneDir: resumed.cloneDir,
        hash: revisionV1.hash,
      });
      setCloneBootSpawnedResumed({ cloneDir: resumed.cloneDir });

      // the current boot, a small edit under the threshold; the fresh clone spawned on it
      writeFileSync(join(brainDir, 'boot.md'), BOOT_V2_SMALL);
      const revisionNow = genActorBootRevision({ actorDir: bare.actorDir })!;
      setCloneBootSpawnedRef({
        cloneDir: fresh.cloneDir,
        hash: revisionNow.hash,
      });
      setActorBootDrifts({
        actorDir: bare.actorDir,
        bootMdPathCurrent: join(brainDir, 'boot.md'),
      });
      return { repoPath, bare, resumed, legacy, fresh };
    });

    when('[t0] `clone boot drift --of @:<serial>` reads the slugless clone', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--of', `@:${scene.bare.serial}`],
          cwd: scene.repoPath,
        }),
      );

      then('it exits 0 and heads the tree with the short serial', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('😶 boot drift of @:7f3a4b5c');
        expect(result.stdout).not.toContain(scene.bare.serial);
        expect(result.stdout).toContain('under the 200 line threshold');
      });

      then('the tree matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] the onStop hook runs inside each of the four clones', () => {
      const results = useBeforeAll(async () => {
        const args = ['clone', 'boot', 'drift', '--when', 'hook.onStop'];
        const runIn = (serial: string) =>
          invokeRhachetCliBinary({
            args,
            cwd: scene.repoPath,
            env: { RHACHET_CLONE_SERIAL: serial },
          });
        return {
          bare: runIn(scene.bare.serial),
          resumed: runIn(scene.resumed.serial),
          legacy: runIn(scene.legacy.serial),
          fresh: runIn(scene.fresh.serial),
        };
      });

      then('under the threshold: exit 0, silent', () => {
        expect(results.bare.status).toEqual(0);
        expect(results.bare.stdout).toEqual('');
        expect(results.bare.stderr).toEqual('');
      });

      then('a resumed clone: exit 0, silent, since it takes no drift', () => {
        expect(results.resumed.status).toEqual(0);
        expect(results.resumed.stdout).toEqual('');
        expect(results.resumed.stderr).toEqual('');
      });

      then('a legacy clone: exit 0, silent', () => {
        expect(results.legacy.status).toEqual(0);
        expect(results.legacy.stdout).toEqual('');
        expect(results.legacy.stderr).toEqual('');
      });

      then('a clone on the current boot: exit 0, silent', () => {
        expect(results.fresh.status).toEqual(0);
        expect(results.fresh.stdout).toEqual('');
        expect(results.fresh.stderr).toEqual('');
      });
    });

    when('[t2] `clone boot drift --of` reads each drift kind, as tree and json', () => {
      const results = useBeforeAll(async () => {
        const readOf = (input: { address: string; output: 'tree' | 'json' }) =>
          invokeRhachetCliBinary({
            args: [
              'clone',
              'boot',
              'drift',
              '--of',
              input.address,
              '--output',
              input.output,
            ],
            cwd: scene.repoPath,
          });
        return {
          resumed: {
            tree: readOf({ address: '@:back', output: 'tree' }),
            json: readOf({ address: '@:back', output: 'json' }),
          },
          legacy: {
            tree: readOf({ address: '@:old', output: 'tree' }),
            json: readOf({ address: '@:old', output: 'json' }),
          },
          current: {
            tree: readOf({ address: '@:fresh', output: 'tree' }),
            json: readOf({ address: '@:fresh', output: 'json' }),
          },
          slugless: {
            json: readOf({ address: `@:${scene.bare.serial}`, output: 'json' }),
          },
        };
      });

      then('each read exits 0', () => {
        expect(results.resumed.tree.status).toEqual(0);
        expect(results.resumed.json.status).toEqual(0);
        expect(results.legacy.tree.status).toEqual(0);
        expect(results.legacy.json.status).toEqual(0);
        expect(results.current.tree.status).toEqual(0);
        expect(results.current.json.status).toEqual(0);
        expect(results.slugless.json.status).toEqual(0);
      });

      then('a machine reads each kind by field', () => {
        const kindOf = (stdout: string) =>
          (JSON.parse(stdout) as { drift: { kind: string } }).drift.kind;
        expect(kindOf(results.resumed.json.stdout)).toEqual('resumed');
        expect(kindOf(results.legacy.json.stdout)).toEqual('legacy');
        expect(kindOf(results.current.json.stdout)).toEqual('current');
        const slugless = JSON.parse(results.slugless.json.stdout) as {
          address: string;
          serial: string;
          drift: { kind: string };
        };
        expect(slugless.address).toEqual('@:7f3a4b5c');
        expect(slugless.serial).toEqual(scene.bare.serial);
        expect(slugless.drift.kind).toEqual('drifted');
      });

      then('the resumed tree and json match snapshot', () => {
        expect(asSnapshotSafe(results.resumed.tree.stdout)).toMatchSnapshot();
        expect(asSnapshotSafe(results.resumed.json.stdout)).toMatchSnapshot();
      });

      then('the legacy tree and json match snapshot', () => {
        expect(asSnapshotSafe(results.legacy.tree.stdout)).toMatchSnapshot();
        expect(asSnapshotSafe(results.legacy.json.stdout)).toMatchSnapshot();
      });

      then('the current tree and json match snapshot', () => {
        expect(asSnapshotSafe(results.current.tree.stdout)).toMatchSnapshot();
        expect(asSnapshotSafe(results.current.json.stdout)).toMatchSnapshot();
      });

      then('the slugless json matches snapshot', () => {
        expect(asSnapshotSafe(results.slugless.json.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case5] three clones whose drift cannot be read cleanly', () => {
    // `@:lost` names a revision a prune removed; `@:latched` has a dir where its told latch
    // belongs; `@:stale` holds a drift the actor boot moved past with no sweep since
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'clone-boot-drift-faults', git: true });
      const lost = await genSampleCloneOndisk({
        repoPath,
        serial: '6a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
        slug: 'lost',
        socketEligible: false,
      });
      const latched = await genSampleCloneOndisk({
        repoPath,
        serial: '6b1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
        slug: 'latched',
        socketEligible: false,
      });
      // a ref to a revision no dir holds
      setCloneBootSpawnedRef({ cloneDir: lost.cloneDir, hash: '0123456789abcdef' });

      // a clone spawned on v1; the boot moves to v2 and the sweep writes the drift
      const genDrifted = (input: { actorDir: string; cloneDir: string }) => {
        const brainDir = getBrainOndiskDir({ actorDir: input.actorDir });
        mkdirSync(brainDir, { recursive: true });
        writeFileSync(join(brainDir, 'boot.md'), BOOT_V1);
        const revision = genActorBootRevision({ actorDir: input.actorDir })!;
        setCloneBootSpawnedRef({ cloneDir: input.cloneDir, hash: revision.hash });
        writeFileSync(join(brainDir, 'boot.md'), BOOT_V2);
        setActorBootDrifts({
          actorDir: input.actorDir,
          bootMdPathCurrent: join(brainDir, 'boot.md'),
        });
        return { brainDir };
      };
      genDrifted(latched);
      mkdirSync(join(latched.cloneDir, 'boot.drift.told'));

      // stale sits in a repo of its own: its boot moves again, with no sweep, so the drift lags it
      const repoPathStale = genTempDir({ slug: 'clone-boot-drift-stale', git: true });
      const stale = await genSampleCloneOndisk({
        repoPath: repoPathStale,
        serial: '6c1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
        slug: 'stale',
        socketEligible: false,
      });
      const { brainDir: brainDirStale } = genDrifted(stale);
      writeFileSync(join(brainDirStale, 'boot.md'), BOOT_V2_SMALL);
      return { repoPath, repoPathStale, latched };
    });

    when('[t0] `clone boot drift --of @:lost` runs', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--of', '@:lost'],
          cwd: scene.repoPath,
          logOnError: false,
        }),
      );

      then('it exits 1 and names the gone revision and the cure', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError');
        expect(result.stderr).toContain('sha256=0123456789abcdef');
        expect(result.stderr).toContain('respawn the clone');
      });

      then('the error matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] the onStop hook runs inside `@:latched`', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--when', 'hook.onStop'],
          cwd: scene.repoPath,
          env: { RHACHET_CLONE_SERIAL: scene.latched.serial },
          logOnError: false,
        }),
      );

      then('it exits 1, which never blocks a stop, and names the latch', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError');
        expect(result.stderr).toContain('boot.drift.told');
      });

      then('the error matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] `clone boot drift --of @:stale` runs', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--of', '@:stale'],
          cwd: scene.repoPathStale,
          logOnError: false,
        }),
      );

      then('it exits 1, says the drift is stale, and names `rhx init`', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('the boot drift on disk is stale');
        expect(result.stderr).toContain('rhx init');
      });

      then('the error matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });
});

/** the boot the clone spawned on */
const BOOT_V1 =
  '<brief.say path=".agent/repo=.this/role=any/briefs/rule.require.waves.md">\nride the set wave\n</brief.say>\n';

/** the boot after an editor added a 240-line brief: past the 200 line threshold */
const BOOT_V2 = [
  BOOT_V1,
  '<brief.say path=".agent/repo=.this/role=any/briefs/rule.require.tides.md">',
  ...Array.from({ length: 240 }, (_, i) => `read the tide, line ${i + 1}`),
  '</brief.say>',
  '',
].join('\n');

/** the boot after an editor added a 5-line brief: under the 200 line threshold */
const BOOT_V2_SMALL = [
  BOOT_V1,
  '<brief.say path=".agent/repo=.this/role=any/briefs/rule.require.reefs.md">',
  ...Array.from({ length: 5 }, (_, i) => `mind the reef, line ${i + 1}`),
  '</brief.say>',
  '',
].join('\n');

/** the boot after an editor added a 2500-line brief: past the 2000 line carry cap */
const BOOT_V2_OVER_CAP = [
  BOOT_V1,
  '<brief.say path=".agent/repo=.this/role=any/briefs/rule.require.swells.md">',
  ...Array.from({ length: 2500 }, (_, i) => `read the swell, line ${i + 1}`),
  '</brief.say>',
  '',
].join('\n');
