import { Command } from 'commander';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { genSampleCloneOndisk } from '@src/.test/assets/genSampleCloneOndisk';
import { withCapturedStreams } from '@src/.test/assets/withCapturedStreams';
import { findsertActorOndisk } from '@src/domain.operations/actor/enrolled/findsertActorOndisk';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';

import { mkdirSync } from 'node:fs';
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
}): Promise<{ out: string; err: string; exitCode: number | undefined }> => {
  // .note = deliberate mutation — swap cwd + reset exitCode for the span of the
  //   drive, restore both in the finally; neither escapes driveClone
  const cwdBefore = process.cwd();
  const exitBefore = process.exitCode;
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
  }
};

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
        const a = findsertActorOndisk({
          repoPath,
          brain: 'claude',
          roles: ['mechanic'],
          delta: null,
          reason: null,
          logEnrollment: true,
        });
        const b = findsertActorOndisk({
          repoPath,
          brain: 'claude',
          roles: ['driver'],
          delta: null,
          reason: null,
          logEnrollment: true,
        });
        // the shortest prefix of A that B does NOT share — a git-style unique reach
        let len = 1;
        while (len < a.hash.length && b.hash.startsWith(a.hash.slice(0, len)))
          len += 1;
        return { prefixCwd, a, b, uniquePrefix: a.hash.slice(0, len) };
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
            expect(result.out).toContain(scene.a.hash.slice(0, 7));
            expect(result.out).not.toContain(scene.b.hash.slice(0, 7));
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
        driveClone({ cwd, argv: ['clone', 'whoami'] }),
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
        genSampleCloneOndisk({
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
});
