import { Command } from 'commander';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { withCapturedStreams } from '@src/.test/assets/withCapturedStreams';

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { invokeActor } from './invokeActor';

/**
 * .what = drive one `rhx actor …` invocation in a temp cwd; capture stdout + exit
 * .why = `actor list` reads process.cwd() and writes stdout; a real drive (chdir +
 *   a stream redirect) proves the wire-up, never a mock
 */
const driveActor = async (input: {
  cwd: string;
  argv: string[];
}): Promise<{ out: string; exitCode: number | undefined }> => {
  // .note = deliberate mutation — swap cwd + reset exitCode for the span of the
  //   drive, restore both in the finally; neither escapes driveActor
  const cwdBefore = process.cwd();
  const exitBefore = process.exitCode;
  process.chdir(input.cwd);
  process.exitCode = 0;
  try {
    const { out } = await withCapturedStreams({
      run: async () => {
        const program = new Command();
        program.exitOverride();
        invokeActor({ program });
        await program.parseAsync(input.argv, { from: 'user' });
      },
    });
    return { out, exitCode: process.exitCode };
  } finally {
    process.chdir(cwdBefore);
    process.exitCode = exitBefore;
  }
};

describe('invokeActor (integration)', () => {
  // a LINKED repo with no actors: an `.agent/` dir exists (roles were linked) but
  // no enrollment has happened yet — the "(no actors enrolled yet)" empty state
  const cwd = genTempDir({ slug: 'invokeActor' });
  mkdirSync(join(cwd, '.agent'), { recursive: true });

  // a NEVER-linked repo: a bare temp dir with NO `.agent/` — the distinct
  // "(repo not linked)" empty state that names the link fix, not the enroll one
  const cwdUnlinked = genTempDir({ slug: 'invokeActor-unlinked' });

  given('[case1] a LINKED repo with no actors enrolled', () => {
    when('[t0] `actor list` runs (tree)', () => {
      const result = useBeforeAll(async () =>
        driveActor({ cwd, argv: ['actor', 'list'] }),
      );

      then('it names the empty state + the enroll get-started move', () => {
        expect(result.out).toContain('no actors enrolled yet');
        expect(result.out).toContain('rhx enroll');
      });

      then('it exits 0', () => {
        expect(result.exitCode).toEqual(0);
      });
    });

    when('[t1] `actor list --output json` runs', () => {
      const result = useBeforeAll(async () =>
        driveActor({ cwd, argv: ['actor', 'list', '--output', 'json'] }),
      );

      then('it emits machine json with an empty actors array', () => {
        expect(JSON.parse(result.out)).toEqual({ actors: [] });
      });
    });
  });

  given('[case1b] a NEVER-linked repo (no .agent/)', () => {
    when('[t0] `actor list` runs (tree)', () => {
      const result = useBeforeAll(async () =>
        driveActor({ cwd: cwdUnlinked, argv: ['actor', 'list'] }),
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

  given('[case2] the actor subcommands expose help text on --help', () => {
    // commander.helpInformation() renders help PURELY (no exit, no stdout), so
    // this clamps discoverability: a rename that silently drops the `list`
    // subcommand goes red here (adherence: help-on-demand)
    const scene = useBeforeAll(async () => {
      const program = new Command();
      invokeActor({ program });
      const actor = program.commands.find((c) => c.name() === 'actor')!;
      const list = actor.commands.find((c) => c.name() === 'list')!;
      return {
        actorHelp: actor.helpInformation(),
        listHelp: list.helpInformation(),
      };
    });

    then('the actor group help lists its `list` subcommand', () => {
      expect(scene.actorHelp).toContain('list');
    });

    then('the list help names its command + the --output option', () => {
      expect(scene.listHelp).toContain('list');
      expect(scene.listHelp).toContain('--output');
    });
  });
});
