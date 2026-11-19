import { Command } from 'commander';
import { asIsoTimeStamp } from 'iso-time';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { genSampleCloneOndisk } from '@src/.test/assets/genSampleCloneOndisk';
import { genSampleContextNoAmbient } from '@src/.test/assets/genSampleContextNoAmbient';
import { withCapturedStreams } from '@src/.test/assets/withCapturedStreams';
import { asSnapshotSafe } from '@src/.test/infra/asSnapshotSafe';
import { findsertActorOndisk } from '@src/domain.operations/actor/enrolled/findsertActorOndisk';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { genActorBootRevision } from '@src/domain.operations/boot/genActorBootRevision';
import { setActorBootDrifts } from '@src/domain.operations/boot/setActorBootDrifts';
import { asClaudeProjectSlug } from '@src/domain.operations/clone/asClaudeProjectSlug';
import { setCloneBootSpawnedRef } from '@src/domain.operations/clone/setCloneBootSpawnedRef';
import { setCloneBootSpawnedResumed } from '@src/domain.operations/clone/setCloneBootSpawnedResumed';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';
import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { mkdirSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { invokeClone } from './invokeClone';

/**
 * .what = drive one `rhx clone …` invocation in a temp cwd; capture stdout,
 *   stderr, and the exit code it sets
 * .why = the talk verbs read process.cwd() + write the process channels + set
 *   process.exitCode; a real drive (chdir + a stream redirect) proves the wire-up
 *   end-to-end, never a mock
 */
const driveClone = async (input: {
  cwd: string;
  argv: string[];
  /**
   * env overrides for the span of the drive; `undefined` UNSETS a key.
   *
   * ⚠️ this drive runs IN-PROCESS, so a verb that reads an env var reads whatever the
   *   jest worker itself carries. `clone whoami` reads `RHACHET_CLONE_SERIAL` — so when
   *   the runner IS an enrolled clone, a case that means "outside a clone" silently drives
   *   the inside-a-clone branch instead. measured 2026-09-16: case4 passes for a human and
   *   fails for a clone, with the clone's own serial in the error (`rule.require.hermetic-tests`)
   */
  env?: Record<string, string | undefined>;
}): Promise<{ out: string; err: string; exitCode: number | undefined }> => {
  // .note = deliberate mutation — swap cwd + reset exitCode + apply the env overrides for
  //   the span of the drive, restore all three in the finally; none escapes driveClone
  const cwdBefore = process.cwd();
  const exitBefore = process.exitCode;
  const envBefore = Object.keys(input.env ?? {}).map(
    (key) => [key, process.env[key]] as const,
  );
  for (const [key, value] of Object.entries(input.env ?? {}))
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  process.chdir(input.cwd);
  process.exitCode = 0;
  try {
    const { out, err } = await withCapturedStreams({
      run: async () => {
        const program = new Command();
        program.exitOverride(); // never call process.exit under test
        invokeClone({ program });
        await program.parseAsync(input.argv, { from: 'user' });
      },
    });
    return { out, err, exitCode: process.exitCode };
  } finally {
    process.chdir(cwdBefore);
    process.exitCode = exitBefore;
    for (const [key, value] of envBefore)
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
};

/**
 * .what = the clone env-var keys, each set to `undefined`, so an in-process drive reads as
 *   "outside a clone" — spread into `driveClone`'s `env`
 * .why = both keys, never only the serial: `whoami` reads a PAIR (`cloneEnvKeys.ts`), so to
 *   unset one and inherit the other leaves a half-identity the verb can still act on
 */
const CLONE_ENV_UNSET: Record<string, undefined> = {
  [CLONE_ENV_KEYS.serial]: undefined,
  [CLONE_ENV_KEYS.socket]: undefined,
};

/**
 * .what = a fault message with the scene's temp repo masked, under both of its names
 * .why = a fault names its path; the temp dir and the clone serial differ per run, and the temp
 *        dir's realpath may differ from the path it was made by
 *        (`rule.require.mask-both-names-of-a-temp-dir`)
 */
const asSnapshotSafeOfScene = (input: {
  of: string;
  scene: { repoPath: string; cwd: string; serial: string };
}): string =>
  asSnapshotSafe({
    of: input.of,
    masks: [
      { path: input.scene.cwd, into: '<repo>' },
      { path: input.scene.repoPath, into: '<repo>' },
      { path: input.scene.serial, into: '<serial>' },
    ],
  });

describe('invokeClone (integration)', () => {
  // a LINKED repo with no clones: an `.agent/` dir exists (roles linked) but no
  // clone has been enrolled — the "(no actors enrolled yet)" empty state
  const cwd = genTempDir({ slug: 'invokeClone' });
  mkdirSync(join(cwd, '.agent'), { recursive: true });

  // a NEVER-linked repo: a bare temp dir with NO `.agent/` — the distinct
  // "(repo not linked)" empty state that names the link fix, not the enroll one
  const cwdUnlinked = genTempDir({ slug: 'invokeClone-unlinked' });

  given('[case1] a LINKED repo with no clones enrolled', () => {
    when('[t0] `clone list` runs (tree)', () => {
      const result = useBeforeAll(async () =>
        driveClone({ cwd, argv: ['clone', 'list'] }),
      );

      then('it names the empty state + the enroll get-started move', () => {
        expect(result.out).toContain('no actors enrolled yet');
        expect(result.out).toContain('rhx enroll');
      });

      then('it exits 0 (an empty list is not an error)', () => {
        expect(result.exitCode).toEqual(0);
      });
    });

    when('[t1] `clone list --output json` runs', () => {
      const result = useBeforeAll(async () =>
        driveClone({ cwd, argv: ['clone', 'list', '--output', 'json'] }),
      );

      then('it emits machine json with an empty actors array', () => {
        expect(JSON.parse(result.out)).toEqual({ actors: [] });
      });
    });
  });

  given('[case1b] a NEVER-linked repo (no .agent/)', () => {
    when('[t0] `clone list` runs (tree)', () => {
      const result = useBeforeAll(async () =>
        driveClone({ cwd: cwdUnlinked, argv: ['clone', 'list'] }),
      );

      then('it names the DISTINCT not-linked state + the link fix', () => {
        expect(result.out).toContain('repo not linked');
        expect(result.out).toContain('rhx init --roles');
      });

      then('it omits the inaccurate linked-but-empty enroll state', () => {
        expect(result.out).not.toContain('no actors enrolled yet');
      });

      then('it still exits 0 (a read degrades gracefully)', () => {
        expect(result.exitCode).toEqual(0);
      });
    });
  });

  given('[case2] an address that names no clone', () => {
    when('[t0] `clone say @:ghost --what hi` runs', () => {
      const result = useBeforeAll(async () =>
        driveClone({
          cwd,
          argv: ['clone', 'say', '@:ghost', '--what', 'hi'],
        }),
      );

      then('it fails loud with the fix, never a silent drop', () => {
        expect(result.err).toContain("no clone answers to '@:ghost'");
        expect(result.err).toContain('rhx clone list');
      });

      then('it exits 2 (caller fault)', () => {
        expect(result.exitCode).toEqual(2);
      });
    });

    when('[t1] `clone get @:ghost` runs', () => {
      const result = useBeforeAll(async () =>
        driveClone({ cwd, argv: ['clone', 'get', '@:ghost'] }),
      );

      then('it fails loud (unknown address, not a silent empty)', () => {
        expect(result.err).toContain("no clone answers to '@:ghost'");
        expect(result.exitCode).toEqual(2);
      });
    });
  });

  given('[case3] a wrong-grain actor address given to a clone verb', () => {
    when('[t0] `clone say @ghost --what hi` runs (bare @ = actor)', () => {
      const result = useBeforeAll(async () =>
        driveClone({
          cwd,
          argv: ['clone', 'say', '@ghost', '--what', 'hi'],
        }),
      );

      then('it fails loud with a @:-did-you-mean', () => {
        expect(result.err).toContain('@:ghost');
        expect(result.exitCode).toEqual(2);
      });
    });
  });

  given(
    '[case5] enrolled actors reached by @<hash-prefix> (clone list scope)',
    () => {
      const scene = useBeforeAll(async () => {
        const prefixCwd = genTempDir({ slug: 'invokeClone-prefix' });
        // seed at the SAME canonical path the invoker resolves from cwd, so the
        // on-disk actor identity the invoker reads matches what we wrote
        const repoPath = getOneRepoPath({ from: prefixCwd });
        const a = await findsertActorOndisk(
          {
            repoPath,
            brain: 'claude',
            roles: ['mechanic'],
            delta: null,
            reason: null,
            exidDeclared: null,
            logEnrollment: true,
          },
          genSampleContextNoAmbient(),
        );
        const b = await findsertActorOndisk(
          {
            repoPath,
            brain: 'claude',
            roles: ['driver'],
            delta: null,
            reason: null,
            exidDeclared: null,
            logEnrollment: true,
          },
          genSampleContextNoAmbient(),
        );
        // the shortest prefix of A that B does NOT share — a git-style unique reach
        let len = 1;
        while (len < a.exid.length && b.exid.startsWith(a.exid.slice(0, len)))
          len += 1;
        return { prefixCwd, a, b, uniquePrefix: a.exid.slice(0, len) };
      });

      when('[t0] `clone list @<unique-prefix>` runs', () => {
        const result = useBeforeAll(async () =>
          driveClone({
            cwd: scene.prefixCwd,
            argv: ['clone', 'list', `@${scene.uniquePrefix}`],
          }),
        );

        then(
          'it scopes to exactly that one actor (usecase.5 + addendum 2)',
          () => {
            // the WHOLE hash is asserted, never a 7-char prefix of it: the view renders
            // the hash entire (it is the actor's whole name), so a prefix assert would
            // pass on a truncated render too and pin the weaker claim
            expect(result.out).toContain(scene.a.exid);
            expect(result.out).not.toContain(scene.b.exid);
          },
        );

        then('it exits 0', () => {
          expect(result.exitCode).toEqual(0);
        });
      });

      when('[t1] `clone list @<no-match-prefix>` runs', () => {
        const result = useBeforeAll(async () =>
          // 'z' is not a hex char, so it can never prefix a hash
          driveClone({
            cwd: scene.prefixCwd,
            argv: ['clone', 'list', '@zzzzzzzz'],
          }),
        );

        then('it fails loud (unknown actor), never a silent empty', () => {
          expect(result.err).toContain('no enrolled actor');
          expect(result.exitCode).toEqual(2);
        });
      });
    },
  );

  given('[case6] the clone subcommands expose help text on --help', () => {
    // commander.helpInformation() renders help PURELY (no exit, no stdout), so
    // this clamps discoverability: a flag rename or a commander upgrade that
    // silently drops a subcommand/flag goes red here (adherence: help-on-demand)
    const scene = useBeforeAll(async () => {
      const program = new Command();
      invokeClone({ program });
      const clone = program.commands.find((c) => c.name() === 'clone')!;
      const sub = (name: string) =>
        clone.commands.find((c) => c.name() === name)!;
      return {
        cloneHelp: clone.helpInformation(),
        listHelp: sub('list').helpInformation(),
        sayHelp: sub('say').helpInformation(),
        getHelp: sub('get').helpInformation(),
        whoamiHelp: sub('whoami').helpInformation(),
      };
    });

    then('the clone group help lists all four talk verbs', () => {
      expect(scene.cloneHelp).toContain('list');
      expect(scene.cloneHelp).toContain('say');
      expect(scene.cloneHelp).toContain('get');
      expect(scene.cloneHelp).toContain('whoami');
    });

    then('each verb help names its command + its key input', () => {
      expect(scene.listHelp).toContain('list');
      expect(scene.sayHelp).toContain('--what');
      expect(scene.getHelp).toContain('--tail');
      expect(scene.whoamiHelp).toContain('whoami');
    });
  });

  given('[case4] whoami run OUTSIDE any enrolled clone', () => {
    when('[t0] `clone whoami` runs with no clone env', () => {
      const result = useBeforeAll(async () =>
        driveClone({ cwd, argv: ['clone', 'whoami'], env: CLONE_ENV_UNSET }),
      );

      then('it fails loud — never a fabricated self-identity', () => {
        expect(result.err).toContain('not run inside an enrolled clone');
        expect(result.exitCode).toEqual(2);
      });
    });
  });

  given(
    '[case7] a clone spawned on ANOTHER host, reached from this one (usecase.10 cross-host)',
    () => {
      // the invoker threads cloneFound.hostHash vs getHomeHash() into asCloneReachError;
      // this proves the wire-up end-to-end (not just the unit branch): a foreign-host
      // clone, socket-eligible but with no live server here, resolves to DEAD-cross-host
      // and the invoker fails loud with the message that names the OTHER host + the fix
      const scene = useBeforeAll(async () => {
        const foreignCwd = genTempDir({ slug: 'invokeClone-crosshost' });
        const repoPath = getOneRepoPath({ from: foreignCwd });
        const serial = getUuid();
        await genSampleCloneOndisk({
          repoPath,
          serial,
          slug: null,
          socketEligible: true, // had a socket, but only on the foreign host
          hostHash: 'foreign-host-abc123',
        });
        return { foreignCwd, serial };
      });

      when('[t0] `clone say @:<serial> --what hi` runs from THIS host', () => {
        const result = useBeforeAll(async () =>
          driveClone({
            cwd: scene.foreignCwd,
            argv: ['clone', 'say', `@:${scene.serial}`, '--what', 'hi'],
          }),
        );

        then('it fails loud, NAMES the other host, never a silent drop', () => {
          expect(result.err).toContain('another host');
          expect(result.err).toContain('foreign-host-abc123');
        });

        then('the fix tells the caller to reach it from the spawn host', () => {
          expect(result.err).toContain('reach it from the host');
        });

        then('it exits 2 (caller fault — reach it from the right host)', () => {
          expect(result.exitCode).toEqual(2);
        });
      });

      when('[t1] `clone say … --output json` runs from THIS host', () => {
        const result = useBeforeAll(async () =>
          driveClone({
            cwd: scene.foreignCwd,
            argv: [
              'clone',
              'say',
              `@:${scene.serial}`,
              '--what',
              'hi',
              '--output',
              'json',
            ],
          }),
        );

        then(
          'a machine reads the cross-host fault as a STRUCTURED field',
          () => {
            // uc.11 addendum: the machine branches on error fields, never on ✋ prose.
            // reachState is threaded onto the error metadata asCliErrorJson projects
            const parsed = JSON.parse(result.err) as {
              class: string;
              reachState?: string;
              message: string;
            };
            expect(parsed.class).toEqual('ConstraintError');
            expect(parsed.reachState).toEqual('DEAD');
            expect(parsed.message).toContain('another host');
          },
        );

        then('it exits 2', () => {
          expect(result.exitCode).toEqual(2);
        });
      });
    },
  );

  given(
    '[case8] a clone spawned after its actor brain dir was born (D8 route)',
    () => {
      // the transcript sits under the actor's brain dir, the dir the clone was
      // spawned with; `clone get` must link and read it from there, never `~/.claude`
      const scene = useBeforeAll(async () => {
        const brainCwd = genTempDir({ slug: 'invokeClone-d8' });
        const repoPath = getOneRepoPath({ from: brainCwd });
        const serial = getUuid();
        const clone = await genSampleCloneOndisk({
          repoPath,
          serial,
          slug: null,
          socketEligible: false,
        });

        // the brain dir is born first
        const brainDir = getBrainOndiskDir({ actorDir: clone.actorDir });
        const projectDir = join(
          brainDir,
          'projects',
          asClaudeProjectSlug({ cwd: clone.repoPath }),
        );
        mkdirSync(projectDir, { recursive: true });

        // the spawn instant is stamped AFTER the birth, so `born < spawnedAt` holds however
        //   slow the setup above ran — a spawn instant computed before the mkdir lost that
        //   race under a loaded suite, and D8 routed the clone to `~/.claude` instead
        const spawnedAtMs = Date.now() + 1_000;
        await genSampleCloneOndisk({
          repoPath,
          serial,
          slug: null,
          socketEligible: false,
          spawnedAt: asIsoTimeStamp(new Date(spawnedAtMs)),
        });
        const transcriptPath = join(projectDir, `${getUuid()}.jsonl`);
        writeFileSync(
          transcriptPath,
          JSON.stringify({
            type: 'assistant',
            message: {
              content: [{ type: 'text', text: 'sentinel-from-brain-dir' }],
            },
          }) + '\n',
          'utf8',
        );
        const transcriptAt = new Date(spawnedAtMs + 5_000);
        utimesSync(transcriptPath, transcriptAt, transcriptAt);
        return { brainCwd, serial };
      });

      when('[t0] `clone get @:<serial>` runs', () => {
        const result = useBeforeAll(async () =>
          driveClone({
            cwd: scene.brainCwd,
            argv: ['clone', 'get', `@:${scene.serial}`],
          }),
        );

        then('it reads the transcript from the actor brain dir', () => {
          expect(result.out).toContain('sentinel-from-brain-dir');
        });

        then('it exits 0', () => {
          expect(result.exitCode).toEqual(0);
        });
      });
    },
  );

  given(
    '[case9] one actor, a clone spawned before its brain dir was born and one after (D8 legacy route)',
    () => {
      // a clone alive across the upgrade still writes under `~/.claude`; one spawned
      //   after writes under the brain dir, so `~/.claude` must never enter its reads.
      //   HOME is a temp dir for the whole scene, so the host hash and `~/.claude` agree
      const scene = useBeforeAll(async () => {
        const homeBefore = process.env['HOME'];
        const home = genTempDir({ slug: 'invokeClone-d8-legacy-home' });
        process.env['HOME'] = home;
        try {
          const brainCwd = genTempDir({ slug: 'invokeClone-d8-legacy' });
          const repoPath = getOneRepoPath({ from: brainCwd });

          // the prior clone spawns a minute before the brain dir is born
          const serialPrior = getUuid();
          const clonePrior = await genSampleCloneOndisk({
            repoPath,
            serial: serialPrior,
            slug: null,
            socketEligible: false,
            spawnedAt: asIsoTimeStamp(new Date(Date.now() - 60_000)),
          });
          mkdirSync(getBrainOndiskDir({ actorDir: clonePrior.actorDir }), {
            recursive: true,
          });

          // the later clone of the same actor spawns after the brain dir is born
          const spawnedAtLaterMs = Date.now() + 2_000;
          const serialLater = getUuid();
          await genSampleCloneOndisk({
            repoPath,
            serial: serialLater,
            slug: null,
            socketEligible: false,
            spawnedAt: asIsoTimeStamp(new Date(spawnedAtLaterMs)),
          });

          // one transcript under `~/.claude`, newer than both spawns
          const projectDir = join(
            home,
            '.claude',
            'projects',
            asClaudeProjectSlug({ cwd: clonePrior.repoPath }),
          );
          mkdirSync(projectDir, { recursive: true });
          const transcriptPath = join(projectDir, `${getUuid()}.jsonl`);
          writeFileSync(
            transcriptPath,
            JSON.stringify({
              type: 'assistant',
              message: {
                content: [{ type: 'text', text: 'sentinel-from-home' }],
              },
            }) + '\n',
            'utf8',
          );
          const transcriptAt = new Date(spawnedAtLaterMs + 5_000);
          utimesSync(transcriptPath, transcriptAt, transcriptAt);

          const resultPrior = await driveClone({
            cwd: brainCwd,
            argv: ['clone', 'get', `@:${serialPrior}`],
          });
          const resultLater = await driveClone({
            cwd: brainCwd,
            argv: ['clone', 'get', `@:${serialLater}`],
          });
          return { resultPrior, resultLater };
        } finally {
          process.env['HOME'] = homeBefore;
        }
      });

      when('[t0] `clone get` runs for each clone', () => {
        then('the prior clone reads its transcript from ~/.claude', () => {
          expect(scene.resultPrior.out).toContain('sentinel-from-home');
          expect(scene.resultPrior.exitCode).toEqual(0);
        });

        then('the later clone never reads ~/.claude', () => {
          expect(scene.resultLater.exitCode).toEqual(0);
          expect(scene.resultLater.out).toContain('talk of @:');
          expect(scene.resultLater.out).not.toContain('sentinel-from-home');
        });
      });
    },
  );

  given(
    '[case12] a clone whose boot drifted past the threshold since it spawned',
    () => {
      // a clone `@:reviewer` on boot v1; the actor boot then moved to v2, 240 lines of new brief
      const scene = useBeforeAll(async () => {
        const seeded = await genSampleCloneOndisk({
          repoPath: genTempDir({ slug: 'invokeClone-drift', git: true }),
          serial: getUuid(),
          slug: 'reviewer',
        });
        const brainDir = getBrainOndiskDir({ actorDir: seeded.actorDir });
        mkdirSync(brainDir, { recursive: true });
        writeFileSync(join(brainDir, 'boot.md'), BOOT_V1);
        const revision = genActorBootRevision({ actorDir: seeded.actorDir })!;
        setCloneBootSpawnedRef({
          cloneDir: seeded.cloneDir,
          hash: revision.hash,
        });
        writeFileSync(join(brainDir, 'boot.md'), BOOT_V2);
        setActorBootDrifts({
          actorDir: seeded.actorDir,
          bootMdPathCurrent: join(brainDir, 'boot.md'),
        });
        return { ...seeded, cwd: getOneRepoPath({ from: seeded.repoPath }) };
      });

      when('[t0] `clone boot drift --of @:reviewer` runs', () => {
        const result = useBeforeAll(async () =>
          driveClone({
            cwd: scene.cwd,
            argv: ['clone', 'boot', 'drift', '--of', '@:reviewer'],
            env: CLONE_ENV_UNSET,
          }),
        );

        then(
          'it exits 0 and names the drift a compacted clone must hold',
          () => {
            expect(result.exitCode).toEqual(0);
            expect(result.out).toMatch(/drift = [0-9a-f]{16}/);
            expect(result.out).toContain(
              '1 block drifted since this clone spawned (1 added)',
            );
            expect(result.out).toContain('over the 200 line threshold');
            expect(result.out).toContain('; if it does not, respawn it');
          },
        );

        then('the tree matches snapshot', () => {
          expect(result.out).toMatchSnapshot();
        });
      });

      when('[t1] the onStop hook runs inside the clone, twice', () => {
        const result = useBeforeAll(async () => {
          const env = {
            ...CLONE_ENV_UNSET,
            [CLONE_ENV_KEYS.serial]: scene.serial,
          };
          const argv = ['clone', 'boot', 'drift', '--when', 'hook.onStop'];
          const first = await driveClone({ cwd: scene.cwd, argv, env });
          const second = await driveClone({ cwd: scene.cwd, argv, env });
          return { first, second };
        });

        then(
          'the first stop is blocked once, with the two ways out on stderr',
          () => {
            expect(result.first.exitCode).toEqual(2);
            expect(result.first.out).toEqual('');
            expect(result.first.err).toContain('to take it');
            expect(result.first.err).toContain('/compact');
            expect(result.first.err).toContain('respawn');
          },
        );

        then('the copy never says the drift loaded', () => {
          expect(result.first.err).not.toContain('loaded');
        });

        then(
          'the second stop is silent: the latch holds this drift as told',
          () => {
            expect(result.second.exitCode).toEqual(0);
            expect(result.second.err).toEqual('');
          },
        );

        then('the nudge matches snapshot', () => {
          expect(result.first.err).toMatchSnapshot();
        });
      });

      when(
        '[t1b] the boot moves again after the clone was told, and the hook runs twice more',
        () => {
          // a scene of its own: the told latch and the drift are mutated here, never in [t1]
          const result = useBeforeAll(async () => {
            const seeded = await genSampleCloneOndisk({
              repoPath: genTempDir({
                slug: 'invokeClone-drift-moves',
                git: true,
              }),
              serial: getUuid(),
              slug: 'mover',
            });
            const brainDir = getBrainOndiskDir({ actorDir: seeded.actorDir });
            mkdirSync(brainDir, { recursive: true });
            writeFileSync(join(brainDir, 'boot.md'), BOOT_V1);
            const revision = genActorBootRevision({
              actorDir: seeded.actorDir,
            })!;
            setCloneBootSpawnedRef({
              cloneDir: seeded.cloneDir,
              hash: revision.hash,
            });
            const sweep = (boot: string) => {
              writeFileSync(join(brainDir, 'boot.md'), boot);
              setActorBootDrifts({
                actorDir: seeded.actorDir,
                bootMdPathCurrent: join(brainDir, 'boot.md'),
              });
            };
            const cwd = getOneRepoPath({ from: seeded.repoPath });
            const env = {
              ...CLONE_ENV_UNSET,
              [CLONE_ENV_KEYS.serial]: seeded.serial,
            };
            const argv = ['clone', 'boot', 'drift', '--when', 'hook.onStop'];

            // told of the first drift
            sweep(BOOT_V2);
            const toldFirst = await driveClone({ cwd, argv, env });
            const silentFirst = await driveClone({ cwd, argv, env });

            // the boot moves again: a new drift
            sweep(BOOT_V3);
            const toldSecond = await driveClone({ cwd, argv, env });
            const silentSecond = await driveClone({ cwd, argv, env });
            return { toldFirst, silentFirst, toldSecond, silentSecond };
          });

          then('the first drift is told once, then silent', () => {
            expect(result.toldFirst.exitCode).toEqual(2);
            expect(result.silentFirst.exitCode).toEqual(0);
            expect(result.silentFirst.err).toEqual('');
          });

          then(
            'the new drift speaks again, with its own counts and hash',
            () => {
              expect(result.toldSecond.exitCode).toEqual(2);
              expect(result.toldSecond.err).toContain(
                '2 blocks drifted since this clone spawned (2 added)',
              );
              const hashOf = (text: string) =>
                /drift = ([0-9a-f]{16})/.exec(text)?.[1] ?? null;
              expect(hashOf(result.toldSecond.err)).not.toBeNull();
              expect(hashOf(result.toldSecond.err)).not.toEqual(
                hashOf(result.toldFirst.err),
              );
            },
          );

          then('the new drift is told once too, then silent', () => {
            expect(result.silentSecond.exitCode).toEqual(0);
            expect(result.silentSecond.err).toEqual('');
          });
        },
      );

      when('[t2] the onStop hook runs in a process that is no clone', () => {
        const result = useBeforeAll(async () =>
          driveClone({
            cwd: scene.cwd,
            argv: ['clone', 'boot', 'drift', '--when', 'hook.onStop'],
            env: CLONE_ENV_UNSET,
          }),
        );

        then('it exits 0, silent', () => {
          expect(result.exitCode).toEqual(0);
          expect(result.out).toEqual('');
          expect(result.err).toEqual('');
        });
      });

      when('[t3] `clone boot drift --of @:nobody` runs', () => {
        const result = useBeforeAll(async () =>
          driveClone({
            cwd: scene.cwd,
            argv: ['clone', 'boot', 'drift', '--of', '@:nobody'],
            env: CLONE_ENV_UNSET,
          }),
        );

        then('it exits 2 and names the list command', () => {
          expect(result.exitCode).toEqual(2);
          expect(result.err).toContain('no clone answers to that address');
          expect(result.err).toContain('@:nobody');
          expect(result.err).toContain('rhx clone list');
        });

        then('the error matches snapshot', () => {
          expect(result.err).toMatchSnapshot();
        });
      });

      when(
        '[t3b] `clone boot drift` runs outside a clone, with no --of',
        () => {
          const result = useBeforeAll(async () =>
            driveClone({
              cwd: scene.cwd,
              argv: ['clone', 'boot', 'drift'],
              env: CLONE_ENV_UNSET,
            }),
          );

          then(
            'it exits 2 and names both the flag and the list command',
            () => {
              expect(result.exitCode).toEqual(2);
              expect(result.out).toEqual('');
              expect(result.err).toContain('no clone is named');
              expect(result.err).toContain('--of @:<slug|serial>');
              expect(result.err).toContain('rhx clone list');
            },
          );

          then('the error matches snapshot', () => {
            expect(result.err).toMatchSnapshot();
          });
        },
      );

      when(
        '[t3c] `clone boot drift` runs inside the clone, with no --of',
        () => {
          const result = useBeforeAll(async () =>
            driveClone({
              cwd: scene.cwd,
              argv: ['clone', 'boot', 'drift'],
              env: {
                ...CLONE_ENV_UNSET,
                [CLONE_ENV_KEYS.serial]: scene.serial,
              },
            }),
          );
          const resultOf = useBeforeAll(async () =>
            driveClone({
              cwd: scene.cwd,
              argv: ['clone', 'boot', 'drift', '--of', '@:reviewer'],
              env: CLONE_ENV_UNSET,
            }),
          );

          then(
            'it reads this clone by its serial: the same tree as --of',
            () => {
              expect(result.exitCode).toEqual(0);
              expect(result.out).toContain('@:reviewer');
              expect(result.out).toContain('over the 200 line threshold');
              expect(resultOf.exitCode).toEqual(0);
              expect(result.out).toEqual(resultOf.out);
            },
          );
        },
      );

      when('[t4] an unknown --when moment is given', () => {
        const result = useBeforeAll(async () =>
          driveClone({
            cwd: scene.cwd,
            argv: ['clone', 'boot', 'drift', '--when', 'hook.onBoot'],
            env: CLONE_ENV_UNSET,
          }),
        );

        then('it exits 2 and names the one moment', () => {
          expect(result.exitCode).toEqual(2);
          expect(result.err).toContain('--when hook.onStop');
        });

        then('the error matches snapshot', () => {
          expect(result.err).toMatchSnapshot();
        });
      });

      when('[t5] the hook moment is given with --of', () => {
        const result = useBeforeAll(async () =>
          driveClone({
            cwd: scene.cwd,
            argv: [
              'clone',
              'boot',
              'drift',
              '--when',
              'hook.onStop',
              '--of',
              '@:reviewer',
            ],
            env: { ...CLONE_ENV_UNSET, [CLONE_ENV_KEYS.serial]: scene.serial },
          }),
        );

        then('it refuses the pair with exit 2, never drops --of', () => {
          expect(result.exitCode).toEqual(2);
          expect(result.err).toContain('--of cannot ride --when hook.onStop');
          expect(result.err).toContain('rhx clone boot drift --of @:reviewer');
        });

        then('the error matches snapshot', () => {
          expect(result.err).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case13] a clone spawned before boot drift (no boot.spawned.ref)',
    () => {
      const scene = useBeforeAll(async () => {
        const seeded = await genSampleCloneOndisk({
          repoPath: genTempDir({ slug: 'invokeClone-drift-legacy', git: true }),
          serial: getUuid(),
          slug: 'old',
        });
        return { ...seeded, cwd: getOneRepoPath({ from: seeded.repoPath }) };
      });

      when('[t0] `clone boot drift --of @:old` runs', () => {
        const result = useBeforeAll(async () =>
          driveClone({
            cwd: scene.cwd,
            argv: ['clone', 'boot', 'drift', '--of', '@:old'],
            env: CLONE_ENV_UNSET,
          }),
        );

        then(
          'it exits 0 and says the clone holds its spawn boot until a respawn',
          () => {
            expect(result.exitCode).toEqual(0);
            expect(result.out).toContain(
              'spawned before boot drift, so it holds its spawn boot until a respawn',
            );
          },
        );

        then('the tree matches snapshot', () => {
          expect(result.out).toMatchSnapshot();
        });
      });

      when('[t1] the onStop hook runs inside it', () => {
        const result = useBeforeAll(async () =>
          driveClone({
            cwd: scene.cwd,
            argv: ['clone', 'boot', 'drift', '--when', 'hook.onStop'],
            env: { ...CLONE_ENV_UNSET, [CLONE_ENV_KEYS.serial]: scene.serial },
          }),
        );

        then('it exits 0, silent', () => {
          expect(result.exitCode).toEqual(0);
          expect(result.err).toEqual('');
        });
      });
    },
  );

  given('[case13b] a clone spawned by a resume (boot.spawned.resumed)', () => {
    const scene = useBeforeAll(async () => {
      const seeded = await genSampleCloneOndisk({
        repoPath: genTempDir({ slug: 'invokeClone-drift-resumed', git: true }),
        serial: getUuid(),
        slug: 'back',
      });
      setCloneBootSpawnedResumed({ cloneDir: seeded.cloneDir });
      return { ...seeded, cwd: getOneRepoPath({ from: seeded.repoPath }) };
    });

    when('[t0] `clone boot drift --of @:back` runs', () => {
      const result = useBeforeAll(async () =>
        driveClone({
          cwd: scene.cwd,
          argv: ['clone', 'boot', 'drift', '--of', '@:back'],
          env: CLONE_ENV_UNSET,
        }),
      );

      then('it exits 0 and says the drift is unknown, never current', () => {
        expect(result.exitCode).toEqual(0);
        expect(result.out).toContain(
          'it takes no drift at any compaction; respawn it to take the current boot',
        );
        expect(result.out).not.toContain('holds the current boot');
      });

      then('the tree matches snapshot', () => {
        expect(result.out).toMatchSnapshot();
      });
    });

    when('[t1] the onStop hook runs inside it', () => {
      const result = useBeforeAll(async () =>
        driveClone({
          cwd: scene.cwd,
          argv: ['clone', 'boot', 'drift', '--when', 'hook.onStop'],
          env: { ...CLONE_ENV_UNSET, [CLONE_ENV_KEYS.serial]: scene.serial },
        }),
      );

      then('it exits 0, silent', () => {
        expect(result.exitCode).toEqual(0);
        expect(result.err).toEqual('');
      });
    });
  });

  given('[case14] a clone whose ref names a boot revision that is gone', () => {
    const scene = useBeforeAll(async () => {
      const seeded = await genSampleCloneOndisk({
        repoPath: genTempDir({ slug: 'invokeClone-drift-gone', git: true }),
        serial: getUuid(),
        slug: 'lost',
      });
      setCloneBootSpawnedRef({
        cloneDir: seeded.cloneDir,
        hash: '0123456789abcdef',
      });
      return { ...seeded, cwd: getOneRepoPath({ from: seeded.repoPath }) };
    });

    when('[t0] the onStop hook runs inside it', () => {
      const result = useBeforeAll(async () =>
        driveClone({
          cwd: scene.cwd,
          argv: ['clone', 'boot', 'drift', '--when', 'hook.onStop'],
          env: { ...CLONE_ENV_UNSET, [CLONE_ENV_KEYS.serial]: scene.serial },
        }),
      );

      then(
        'it fails loud with the path, and exits 1, which never blocks a stop',
        () => {
          expect(result.exitCode).toEqual(1);
          expect(result.err).toContain('MalfunctionError');
          expect(result.err).toContain('sha256=0123456789abcdef');
        },
      );

      then('the error matches snapshot, its repo path masked', () => {
        expect(
          asSnapshotSafeOfScene({ of: result.err, scene }),
        ).toMatchSnapshot();
      });
    });

    when('[t1] `clone boot drift --of @:lost` runs', () => {
      const result = useBeforeAll(async () =>
        driveClone({
          cwd: scene.cwd,
          argv: ['clone', 'boot', 'drift', '--of', '@:lost'],
          env: CLONE_ENV_UNSET,
        }),
      );

      then('it fails loud with the path, and exits 1', () => {
        expect(result.exitCode).toEqual(1);
        expect(result.err).toContain('MalfunctionError');
        expect(result.err).toContain('sha256=0123456789abcdef');
      });

      then('the error matches snapshot, its repo path masked', () => {
        expect(
          asSnapshotSafeOfScene({ of: result.err, scene }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case15] a drifted clone whose told latch cannot be read', () => {
    // the case12 scene, with a dir where the latch file belongs
    const scene = useBeforeAll(async () => {
      const seeded = await genSampleCloneOndisk({
        repoPath: genTempDir({ slug: 'invokeClone-drift-latch', git: true }),
        serial: getUuid(),
        slug: 'latched',
      });
      const brainDir = getBrainOndiskDir({ actorDir: seeded.actorDir });
      mkdirSync(brainDir, { recursive: true });
      writeFileSync(join(brainDir, 'boot.md'), BOOT_V1);
      const revision = genActorBootRevision({ actorDir: seeded.actorDir })!;
      setCloneBootSpawnedRef({
        cloneDir: seeded.cloneDir,
        hash: revision.hash,
      });
      writeFileSync(join(brainDir, 'boot.md'), BOOT_V2);
      setActorBootDrifts({
        actorDir: seeded.actorDir,
        bootMdPathCurrent: join(brainDir, 'boot.md'),
      });
      mkdirSync(join(seeded.cloneDir, 'boot.drift.told'));
      return { ...seeded, cwd: getOneRepoPath({ from: seeded.repoPath }) };
    });

    when('[t0] the onStop hook runs inside it', () => {
      const result = useBeforeAll(async () =>
        driveClone({
          cwd: scene.cwd,
          argv: ['clone', 'boot', 'drift', '--when', 'hook.onStop'],
          env: { ...CLONE_ENV_UNSET, [CLONE_ENV_KEYS.serial]: scene.serial },
        }),
      );

      then(
        'it fails loud with the latch path, and exits 1, which never blocks a stop',
        () => {
          expect(result.exitCode).toEqual(1);
          expect(result.err).toContain('MalfunctionError');
          expect(result.err).toContain('a boot drift file could not be read');
          expect(result.err).toContain('boot.drift.told');
        },
      );

      then('the error matches snapshot, its repo path masked', () => {
        expect(
          asSnapshotSafeOfScene({ of: result.err, scene }),
        ).toMatchSnapshot();
      });
    });
  });

  given(
    '[case18] a drifted clone whose drift on disk lags the current boot',
    () => {
      // the case12 scene, then the actor boot moves again with no sweep: the drift on disk is stale
      const scene = useBeforeAll(async () => {
        const seeded = await genSampleCloneOndisk({
          repoPath: genTempDir({ slug: 'invokeClone-drift-stale', git: true }),
          serial: getUuid(),
          slug: 'stale',
        });
        const brainDir = getBrainOndiskDir({ actorDir: seeded.actorDir });
        mkdirSync(brainDir, { recursive: true });
        writeFileSync(join(brainDir, 'boot.md'), BOOT_V1);
        const revision = genActorBootRevision({ actorDir: seeded.actorDir })!;
        setCloneBootSpawnedRef({
          cloneDir: seeded.cloneDir,
          hash: revision.hash,
        });
        writeFileSync(join(brainDir, 'boot.md'), BOOT_V2);
        setActorBootDrifts({
          actorDir: seeded.actorDir,
          bootMdPathCurrent: join(brainDir, 'boot.md'),
        });
        writeFileSync(join(brainDir, 'boot.md'), BOOT_V1);
        return { ...seeded, cwd: getOneRepoPath({ from: seeded.repoPath }) };
      });

      when('[t0] `clone boot drift --of @:stale` runs', () => {
        const result = useBeforeAll(async () =>
          driveClone({
            cwd: scene.cwd,
            argv: ['clone', 'boot', 'drift', '--of', '@:stale'],
            env: CLONE_ENV_UNSET,
          }),
        );

        then(
          'it fails loud, names the stale drift path, and hints the re-write',
          () => {
            expect(result.exitCode).toEqual(1);
            expect(result.err).toContain('MalfunctionError');
            expect(result.err).toContain(
              'the boot drift on disk is stale: the last render did not reach it',
            );
            expect(result.err).toContain('CLAUDE.md');
            expect(result.err).toContain('rhx init');
          },
        );

        then('the error matches snapshot, its repo path masked', () => {
          expect(
            asSnapshotSafeOfScene({ of: result.err, scene }),
          ).toMatchSnapshot();
        });
      });
    },
  );

  given('[case16] a clone whose boot has not moved since it spawned', () => {
    const scene = useBeforeAll(async () => {
      const seeded = await genSampleCloneOndisk({
        repoPath: genTempDir({ slug: 'invokeClone-drift-current', git: true }),
        serial: getUuid(),
        slug: 'fresh',
      });
      const brainDir = getBrainOndiskDir({ actorDir: seeded.actorDir });
      mkdirSync(brainDir, { recursive: true });
      writeFileSync(join(brainDir, 'boot.md'), BOOT_V1);
      const revision = genActorBootRevision({ actorDir: seeded.actorDir })!;
      setCloneBootSpawnedRef({
        cloneDir: seeded.cloneDir,
        hash: revision.hash,
      });
      setActorBootDrifts({
        actorDir: seeded.actorDir,
        bootMdPathCurrent: join(brainDir, 'boot.md'),
      });
      return { ...seeded, cwd: getOneRepoPath({ from: seeded.repoPath }) };
    });

    when('[t0] `clone boot drift --of @:fresh` runs', () => {
      const result = useBeforeAll(async () =>
        driveClone({
          cwd: scene.cwd,
          argv: ['clone', 'boot', 'drift', '--of', '@:fresh'],
          env: CLONE_ENV_UNSET,
        }),
      );

      then('it exits 0 and names no drift', () => {
        expect(result.exitCode).toEqual(0);
        expect(result.out).toContain('@:fresh');
        expect(result.out).not.toMatch(/drift = [0-9a-f]{16}/);
      });

      then('the tree matches snapshot', () => {
        expect(result.out).toMatchSnapshot();
      });
    });

    when('[t1] the onStop hook runs inside it', () => {
      const result = useBeforeAll(async () =>
        driveClone({
          cwd: scene.cwd,
          argv: ['clone', 'boot', 'drift', '--when', 'hook.onStop'],
          env: { ...CLONE_ENV_UNSET, [CLONE_ENV_KEYS.serial]: scene.serial },
        }),
      );

      then('it exits 0, silent', () => {
        expect(result.exitCode).toEqual(0);
        expect(result.err).toEqual('');
      });
    });
  });

  given('[case17] a clone whose boot drifted, but under the threshold', () => {
    const scene = useBeforeAll(async () => {
      const seeded = await genSampleCloneOndisk({
        repoPath: genTempDir({ slug: 'invokeClone-drift-small', git: true }),
        serial: getUuid(),
        slug: 'small',
      });
      const brainDir = getBrainOndiskDir({ actorDir: seeded.actorDir });
      mkdirSync(brainDir, { recursive: true });
      writeFileSync(join(brainDir, 'boot.md'), BOOT_V1);
      const revision = genActorBootRevision({ actorDir: seeded.actorDir })!;
      setCloneBootSpawnedRef({
        cloneDir: seeded.cloneDir,
        hash: revision.hash,
      });
      writeFileSync(join(brainDir, 'boot.md'), BOOT_V1.replace('dawn', 'dusk'));
      setActorBootDrifts({
        actorDir: seeded.actorDir,
        bootMdPathCurrent: join(brainDir, 'boot.md'),
      });
      return { ...seeded, cwd: getOneRepoPath({ from: seeded.repoPath }) };
    });

    when('[t0] `clone boot drift --of @:small` runs', () => {
      const result = useBeforeAll(async () =>
        driveClone({
          cwd: scene.cwd,
          argv: ['clone', 'boot', 'drift', '--of', '@:small'],
          env: CLONE_ENV_UNSET,
        }),
      );

      then(
        'it exits 0, names the drift, and claims no threshold breach',
        () => {
          expect(result.exitCode).toEqual(0);
          expect(result.out).toMatch(/drift = [0-9a-f]{16}/);
          expect(result.out).not.toContain('over the 200 line threshold');
        },
      );

      then('the tree matches snapshot', () => {
        expect(result.out).toMatchSnapshot();
      });
    });

    when('[t1] the onStop hook runs inside it', () => {
      const result = useBeforeAll(async () =>
        driveClone({
          cwd: scene.cwd,
          argv: ['clone', 'boot', 'drift', '--when', 'hook.onStop'],
          env: { ...CLONE_ENV_UNSET, [CLONE_ENV_KEYS.serial]: scene.serial },
        }),
      );

      then('it exits 0, silent: no nudge under the threshold', () => {
        expect(result.exitCode).toEqual(0);
        expect(result.err).toEqual('');
      });
    });
  });
});

/** a boot of one brief, as a clone spawned on it */
const BOOT_V1 =
  '<brief.say path="surf.md">\npaddle out at dawn\n</brief.say>\n';

/** the same boot, plus one long brief: past the nudge threshold */
const BOOT_V2 = [
  BOOT_V1,
  '<brief.say path="tides.md">',
  ...Array.from({ length: 240 }, (_, index) => `tide line ${index}`),
  '</brief.say>',
  '',
].join('\n');

/** the boot moved again after the clone was told: one more brief, so a new drift */
const BOOT_V3 = [
  BOOT_V2,
  '<brief.say path="swell.md">',
  'read the swell before you paddle',
  '</brief.say>',
  '',
].join('\n');
