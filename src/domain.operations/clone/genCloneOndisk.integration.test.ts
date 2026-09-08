import { ConstraintError, MalfunctionError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { HOST_SPECIFIC_SHELL_TOKENS } from '@src/.test/assets/hostSpecificShellTokens';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { genEnrollmentHash } from '../actor/enrolled/genEnrollmentHash';
import { getActorOndiskDir } from '../actor/enrolled/getActorOndiskDir';
import { genCloneOndisk } from './genCloneOndisk';
import type { CloneSpawnHandle } from './genCloneSpawn';
import { getCloneSocketPath } from './getCloneSocketPath';
import { isCloneLive } from './isCloneLive';
import type { PtyCloneHost } from './pty/genBrainCliPtyClone';
import { getPtyHostTupleFromProcess } from './pty/getPtyHostTupleFromProcess';
import { getPtyModuleOrNull } from './pty/getPtyModuleOrNull';
import { getPtyPlatformSupportFromProcess } from './pty/getPtyPlatformSupportFromProcess';

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
      slug: `genclone-socket-omitted-${Date.now()}`,
    });

    when('[t0] genCloneOndisk runs without a pty module', () => {
      // .note = this asserts the REAL host verdict — no seam is cut into
      //   genCloneOndisk's contract to force a platform. the class-by-platform
      //   table is owned by asCloneSocketOmissionReasonError.test.ts, which is pure and
      //   can reach every row; here we prove the throw actually fires end to end
      // .note = the error is held on a SCENE object, never returned bare from a
      //   use* helper — those hand back a deferred proxy, which would erase both
      //   `instanceof` and the error's own message
      const scene = useBeforeAll(async () => ({
        error: await getError(() =>
          genCloneVia(repoPath, { slug: null, pty: null }),
        ),
      }));

      then('it reports the socket as unavailable, on any host', () => {
        expect(scene.error.message).toContain('reach socket is unavailable');
        const meta = scene.error as unknown as {
          metadata?: { socketOmissionReason?: string; hint?: string };
        };
        expect(meta.metadata?.socketOmissionReason).toBe('pty-absent');
        // a hint must be PRESENT before its content can be judged. `.not.toContain`
        // alone passes on an empty string, so a hint that VANISHED would read here
        // as a hint that was merely cured — the two must not look alike
        expect(typeof meta.metadata?.hint).toBe('string');
        expect(meta.metadata?.hint?.length).toBeGreaterThan(0);
        // the dead-end cure is gone for good — `pnpm rebuild` has no --global flag,
        // so it could never repair the global install it was written for
        expect(meta.metadata?.hint).not.toContain('pnpm rebuild');
      });

      then(
        "the reported hostTuple is the CANONICAL owner's output, at the right grain",
        () => {
          // 🚨 the drift clamp. `hostTuple` carries `platform-arch` (`linux-x64`),
          //   while `getPtyPlatformSupport` takes a bare `platform` (`linux`) — two
          //   grains, one dir, both plain `string`, so no type stops a future edit
          //   from it passing `process.platform` into this field. it would compile,
          //   every extant test would pass, and the diagnostic would silently degrade.
          //
          //   so the field is pinned to the canonical owner's own output rather than
          //   to a hand-written literal. the mutation that reddens it: pass
          //   `process.platform` at the call site in genCloneOndisk.
          const meta = scene.error as unknown as {
            metadata?: { hostTuple?: string };
          };
          expect(meta.metadata?.hostTuple).toEqual(
            getPtyHostTupleFromProcess(),
          );

          // and the grain itself is asserted, so a tuple that collapsed to a bare
          // platform is caught even if both sides collapsed together
          expect(meta.metadata?.hostTuple).toContain('-');
          expect(meta.metadata?.hostTuple).toContain(process.arch);
        },
      );

      then(
        'the class matches whether THIS host is one upstream ships a prebuild for',
        () => {
          // supported → the addon ships in our tarball, so its absence is OUR
          // broken artifact (malfunction). unsupported → no binary exists, so the
          // caller can only amend the request (constraint). unknown → we could not
          // read the libc, so the caller runs one diagnostic (constraint)
          expect(scene.error).toBeInstanceOf(
            getPtyPlatformSupportFromProcess() === 'supported'
              ? MalfunctionError
              : ConstraintError,
          );
        },
      );

      then('no clone dir was ever created', () => {
        // the actor dir/manifest IS findserted (it precedes the socket check),
        // but no CLONE dir was ever created under it — the throw fires BEFORE
        // any spawn/tempDir, so `clones/` stays absent or empty
        const hash = genEnrollmentHash({
          brain: 'claude',
          roles: ['mechanic'] as RoleSlug[],
        });
        const clonesDir = join(getActorOndiskDir({ repoPath, hash }), 'clones');
        expect(existsSync(clonesDir) ? readdirSync(clonesDir) : []).toEqual([]);
      });
    });
  });

  given(
    '[case7] a bake whose pty LOADS but is refused a device at spawn',
    () => {
      // 🚨 the distinct failure `[case6]` cannot reach. there, the addon never loads,
      //   so the pre-spawn gate refuses the enroll and no spawn is ever attempted.
      //   here the module is present and its `spawn` throws — the real host condition
      //   node-pty raises when the kernel has no pty to give (a restricted container,
      //   an exhausted pty limit, a denied openpty).
      //
      //   two properties are clamped, and the SILENT-DEGRADE one needs no row of its
      //   own: a fall-through to `genBrainCliPlainClone` would RETURN a plain clone and
      //   promote its dir, so it reddens BOTH rows below at once — the class row (no
      //   error to read) and the reap row (a promoted dir survives). a third assertion
      //   for it would restate the first
      //
      //   the LEGIBILITY property is the one that needs its own rows:
      //   `withCliOutputErrors` rethrows a non-HelpfulError unchanged, so an unwrapped
      //   node-pty throw reaches a human as a bare stack with no fix named
      const repoPath = genTempDir({ slug: `genclone-ptyspawn-${Date.now()}` });
      const PTY_DEVICE_ERROR = 'posix_openpt failed: EAGAIN';

      when('[t0] the pty module refuses to spawn', () => {
        // .note = the error is held on a SCENE object, never returned bare from a
        //   use* helper — a deferred proxy would erase both `instanceof` and `.message`
        const scene = useBeforeAll(async () => ({
          error: await getError(() =>
            genCloneVia(repoPath, {
              slug: null,
              pty: {
                spawn: () => {
                  throw new Error(PTY_DEVICE_ERROR);
                },
              },
            }),
          ),
        }));

        then('it is a CLASSIFIED report, never a bare throw', () => {
          // the mutation that reddens this: drop the try/catch in genCloneOndisk and
          // let node-pty's own Error propagate — it is not a HelpfulError, so
          // withCliOutputErrors would rethrow it unrendered
          expect(scene.error).toBeInstanceOf(ConstraintError);
          expect(scene.error.message).toContain('reach socket is unavailable');
          expect(scene.error.message).toContain(
            'pty device could not be allocated',
          );
        });

        then(
          "the hint carries node-pty's own words INLINE, and names a portable fix",
          () => {
            const meta = scene.error as unknown as {
              metadata?: {
                hint?: string;
                ptyError?: string;
                hostTuple?: string;
              };
            };
            // INLINE, never metadata-only: asCliErrorJson strips the metadata tail from
            // the human frame, so a datum that lives only there reaches no reader
            expect(meta.metadata?.hint).toContain(PTY_DEVICE_ERROR);
            expect(meta.metadata?.hint).toContain('--no-socket');
            // this row fires on linux, darwin, AND win32, so its cure must run on all
            // three — no host-specific shell token may appear
            // (rule.forbid.host-specific-cures-in-hints)
            for (const token of HOST_SPECIFIC_SHELL_TOKENS)
              expect(meta.metadata?.hint).not.toContain(token);
            expect(meta.metadata?.ptyError).toEqual(PTY_DEVICE_ERROR);
            expect(meta.metadata?.hostTuple).toEqual(
              getPtyHostTupleFromProcess(),
            );
          },
        );

        then('the staged clone dir was reaped', () => {
          // the temp dir is created BEFORE the spawn, so a refused spawn must not
          // leave it behind. the mutation that reddens this: drop the rmSync
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
        });
      });
    },
  );

  given(
    "[case8] a bake whose pty.spawn throws SYNCHRONOUSLY with a fault that is OURS — the allowlist's own seam, never a real bind",
    () => {
      // 🚨 the peer of `[case7]`, and the row that keeps its ConstraintError honest.
      //   the guarded block runs our own code too — the socket bind, the host wires,
      //   the raw-mode enter — so a catch-all there would dress OUR defect as a host
      //   condition and tell the human `pass --no-socket`, a cure for a fault they do
      //   not own. that is loud about the wrong party (`rule.forbid.failhide`)
      //
      //   the mutation that reddens this: drop the `isPtyDeviceRefusedError` gate in
      //   `genCloneOndisk` and let the catch classify every throw again
      //
      // 🚨 THE TITLE NAMES ITS SEAM, and this row's history is why. it once read only
      //   "throws a fault that is OURS" and used the literal string below — so a reader
      //   who grepped `EADDRINUSE` landed here and concluded the real bind path was
      //   clamped. it is NOT: the fault is a SYNCHRONOUS throw from a STUBBED `pty.spawn`,
      //   so the real `genCloneSocketServer` and its async bind are never reached. a test
      //   that names a fault it does not exercise is worse than an absent one
      //
      //   ⇒ what this row DOES clamp is the allowlist in `genCloneOndisk`'s catch. the
      //   REAL async bind is clamped by `genBrainCliPtyClone.integration.test.ts`
      //   `[case4]`/`[case5]` and `genCloneSocketServer.integration.test.ts` `[case13]`
      const repoPath = genTempDir({ slug: `genclone-ptyours-${Date.now()}` });

      // ⚠️ a real node bind message, chosen so the allowlist is exercised against the prose
      //   a real fault carries — never a claim that a real bind produced it here
      const OUR_DEFECT = 'listen EADDRINUSE: address already in use';

      when('[t0] the spawn block throws a socket-bind error', () => {
        const scene = useBeforeAll(async () => ({
          error: await getError(() =>
            genCloneVia(repoPath, {
              slug: null,
              pty: {
                spawn: () => {
                  throw new Error(OUR_DEFECT);
                },
              },
            }),
          ),
        }));

        then(
          'it propagates UNCHANGED, never as a caller-side constraint',
          () => {
            // the identity check is the whole point: not merely "a different class",
            // but the very error node-pty's caller threw, with its own stack intact
            expect(scene.error).not.toBeInstanceOf(ConstraintError);
            expect(scene.error).not.toBeInstanceOf(MalfunctionError);
            expect(scene.error.message).toEqual(OUR_DEFECT);
          },
        );

        then('it names no cure the human cannot act on', () => {
          // `--no-socket` would be a false cure here — the human cannot free a port
          // we bound wrong. the absence of that token IS the party claim
          expect(scene.error.message).not.toContain('--no-socket');
          expect(scene.error.message).not.toContain(
            'reach socket is unavailable',
          );
        });

        then('the staged clone dir was reaped all the same', () => {
          // the reap is unconditional and precedes the classification, so a
          // propagated malfunction leaves no orphan dir either
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
        });
      });
    },
  );
});
