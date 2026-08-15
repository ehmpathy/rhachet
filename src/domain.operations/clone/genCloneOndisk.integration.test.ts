import { ConstraintError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import type { RoleSlug } from '@src/domain.objects/RoleSlug';

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { genEnrollmentHash } from '../actor/enrolled/genEnrollmentHash';
import { getActorOndiskDir } from '../actor/enrolled/getActorOndiskDir';
import { type CloneSpawnHandle, genCloneOndisk } from './genCloneOndisk';
import { getCloneSocketPath } from './getCloneSocketPath';
import { isCloneLive } from './isCloneLive';
import type { PtyCloneHost } from './pty/genBrainCliPtyClone';
import { getPtyModuleOrNull } from './pty/getPtyModuleOrNull';

/**
 * .what = prove genCloneOndisk's findsert lifecycle against a REAL pty + on-disk tree —
 *   bake-fresh, named bake, live-slug reuse, dead-slug rebind, cross-actor
 *   collision, and the plain-spawn fallback when no pty is available
 * .why = genCloneOndisk is what `rhx enroll` drives; its outcome word + on-disk effect is
 *   the whole contract crons/comms depend on. every branch is exercised with a real
 *   child, never a mock (the socket only counts if it truly stands up)
 */

const STUB_BRAIN = join(__dirname, '../../.test/assets/stubBrainCli.cjs');

const genCaptureHost = (output: string[]): PtyCloneHost => ({
  // .note = deliberate mutation — the host mirror IS a capture sink; each pty
  //   chunk is appended to the caller's bounded buffer, which never escapes the test
  writeOut: (data) => output.push(data),
  onInput: () => () => undefined,
  size: () => ({ cols: 80, rows: 24 }),
  onResize: () => () => undefined,
  onSignal: () => () => undefined,
  enterRawMode: () => () => undefined,
});

const genCloneVia = (
  repoPath: string,
  opts: {
    slug: string | null;
    roles?: RoleSlug[];
    pty?: ReturnType<typeof getPtyModuleOrNull>;
  },
): Promise<{
  outcome: 'reused' | 'baked' | 'rebound';
  clone: import('@src/domain.objects/CloneOndisk').CloneOndisk;
  spawn: CloneSpawnHandle | null;
}> =>
  genCloneOndisk(
    {
      repoPath,
      brain: 'claude',
      roles: opts.roles ?? (['mechanic'] as RoleSlug[]),
      delta: null,
      reason: null,
      command: process.execPath,
      args: [STUB_BRAIN],
      cwd: repoPath,
      slug: opts.slug,
      interactive: true,
      noSocket: false,
    },
    {
      pty: opts.pty !== undefined ? opts.pty : getPtyModuleOrNull(),
      host: genCaptureHost([]),
    },
  );

describe('genCloneOndisk.integration', () => {
  const configBefore = process.env['CLAUDE_CONFIG_DIR'];
  beforeAll(() => {
    process.env['CLAUDE_CONFIG_DIR'] = genTempDir({ slug: 'genclone-config' });
  });
  afterAll(() => {
    if (configBefore === undefined) delete process.env['CLAUDE_CONFIG_DIR'];
    else process.env['CLAUDE_CONFIG_DIR'] = configBefore;
  });

  given('[case1] a bake with no slug (an anonymous clone)', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: `genclone-bake-${Date.now()}` });
      const result = await genCloneVia(repoPath, { slug: null });
      return { repoPath, result };
    });
    afterAll(async () => {
      await scene.result.spawn?.dispose().catch(() => undefined);
    });

    when('[t0] genCloneOndisk runs', () => {
      then(
        'the outcome is baked and the clone dir exists with a live socket',
        async () => {
          expect(scene.result.outcome).toBe('baked');
          expect(scene.result.clone.slug).toBeNull();
          expect(scene.result.clone.socketEligible).toBe(true);
          const cloneDir = join(
            scene.repoPath,
            '.agent',
            '.actors',
            `actor.via.hash=${scene.result.clone.actor.hash}`,
            'clones',
            `serial=${scene.result.clone.serial}`,
          );
          expect(existsSync(join(cloneDir, 'identity.json'))).toBe(true);
          const socketPath = getCloneSocketPath({
            serial: scene.result.clone.serial,
          })!;
          expect(await isCloneLive({ socketPath })).toBe(true);
        },
      );

      then(
        'the persisted hostPid names the SPAWNED CHILD, not the enroll wrapper',
        () => {
          // the orphan-verdict safety check reads this pid to ask "is the same
          // brain still live?"; it MUST be the child (spawn.pid), never the
          // wrapper (process.pid) — else a killed wrapper always reads orphan=false
          expect(scene.result.clone.hostPid).toBe(scene.result.spawn!.pid);
          expect(scene.result.clone.hostPid).not.toBe(process.pid);
        },
      );
    });
  });

  given('[case2] a bake with an --as slug', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: `genclone-named-${Date.now()}` });
      const result = await genCloneVia(repoPath, { slug: 'driver' });
      return { repoPath, result };
    });
    afterAll(async () => {
      await scene.result.spawn?.dispose().catch(() => undefined);
    });

    when('[t0] genCloneOndisk runs', () => {
      then('the clone wears the slug and the .slugs index points at it', () => {
        expect(scene.result.outcome).toBe('baked');
        expect(scene.result.clone.slug).toBe('driver');
        const slugLink = join(
          scene.repoPath,
          '.agent',
          '.actors',
          '.slugs',
          'driver',
        );
        expect(existsSync(slugLink)).toBe(true);
      });
    });
  });

  given('[case3] a second enroll of a still-LIVE same-actor slug', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: `genclone-reuse-${Date.now()}` });
      const first = await genCloneVia(repoPath, { slug: 'foreman' });
      const second = await genCloneVia(repoPath, { slug: 'foreman' });
      return { repoPath, first, second };
    });
    afterAll(async () => {
      await scene.first.spawn?.dispose().catch(() => undefined);
      await scene.second.spawn?.dispose().catch(() => undefined);
    });

    when('[t0] the slug still names a live clone', () => {
      then('the second enroll REUSES it — same serial, no new spawn', () => {
        expect(scene.second.outcome).toBe('reused');
        expect(scene.second.clone.serial).toBe(scene.first.clone.serial);
        expect(scene.second.spawn).toBeNull();
      });
    });
  });

  given('[case4] a re-enroll of a slug whose clone has DIED', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: `genclone-rebind-${Date.now()}` });
      const first = await genCloneVia(repoPath, { slug: 'ranger' });
      // kill the first clone so its socket is gone (reads DEAD)
      await first.spawn?.dispose();
      const second = await genCloneVia(repoPath, { slug: 'ranger' });
      return { repoPath, first, second };
    });
    afterAll(async () => {
      await scene.second.spawn?.dispose().catch(() => undefined);
    });

    when('[t0] the slug names a dead clone of this actor', () => {
      then('the re-enroll REBINDS the name to a fresh clone', () => {
        expect(scene.second.outcome).toBe('rebound');
        expect(scene.second.clone.slug).toBe('ranger');
        expect(scene.second.clone.serial).not.toBe(scene.first.clone.serial);
        expect(scene.second.spawn).not.toBeNull();
      });
    });
  });

  given('[case5] a slug already held by a DIFFERENT actor', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: `genclone-collide-${Date.now()}` });
      const first = await genCloneVia(repoPath, {
        slug: 'shared',
        roles: ['mechanic'] as RoleSlug[],
      });
      return { repoPath, first };
    });
    afterAll(async () => {
      await scene.first.spawn?.dispose().catch(() => undefined);
    });

    when('[t0] a different actor asks for the same slug', () => {
      then(
        'genCloneOndisk fails loud with a collision (no spawn)',
        async () => {
          const error = await getError(
            genCloneVia(scene.repoPath, {
              slug: 'shared',
              roles: ['architect'] as RoleSlug[],
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('different actor');
        },
      );
    });
  });

  given('[case6] a bake with a wanted socket but no pty available', () => {
    const repoPath = genTempDir({
      slug: `genclone-fallback-${Date.now()}`,
    });

    when('[t0] genCloneOndisk runs without a pty module', () => {
      then(
        'it fails loud BEFORE any dir/spawn exists — a wanted socket is a critical baseline requirement, never a silent talk-less fallback',
        async () => {
          const error = await getError(() =>
            genCloneVia(repoPath, { slug: null, pty: null }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('reach socket is unavailable');
          const meta = error as unknown as {
            metadata?: { socketFallback?: string; hint?: string };
          };
          expect(meta.metadata?.socketFallback).toBe('pty-absent');
          expect(meta.metadata?.hint).toContain('--no-socket');
          // the actor dir/manifest IS findserted (it precedes the socket check),
          // but no CLONE dir was ever created under it — the throw fires BEFORE
          // any spawn/tempDir, so `clones/` stays absent or empty
          const hash = genEnrollmentHash({
            brain: 'claude',
            roles: ['mechanic'] as RoleSlug[],
          });
          const clonesDir = join(
            getActorOndiskDir({ repoPath, hash }),
            'clones',
          );
          expect(existsSync(clonesDir) ? readdirSync(clonesDir) : []).toEqual(
            [],
          );
        },
      );
    });
  });
});
