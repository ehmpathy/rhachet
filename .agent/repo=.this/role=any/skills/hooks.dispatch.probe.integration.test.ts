import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = the clamp on `rhx hooks.dispatch.probe`'s refusal of settings that already start the
 *   hook dispatcher
 * .why = its cost and verdicts modes read each settings hook as one rule. on a dispatcher hook they
 *   compared the dispatcher against itself and printed `0 of 1 agree` — a false disagreement a
 *   reader would take as a verdict that changed. the probe must refuse that shape and name the
 *   instrument that reads it
 *
 * .note = integration tier: it spawns bash and jq, and writes a temp dir
 */

const SKILL = join(__dirname, 'hooks.dispatch.probe.sh');

/** a payload for one Bash call */
const PAYLOAD = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'pwd' } });

/**
 * .what = a settings file whose PreToolUse:Bash entry runs the given commands
 */
const asSettings = (commands: string[]): string =>
  JSON.stringify({
    hooks: {
      PreToolUse: [
        { matcher: 'Bash', hooks: commands.map((command) => ({ type: 'command', command })) },
      ],
    },
  });

/**
 * .what = run the probe with args, in a dir
 */
const runProbe = (input: { cwd: string; args: string[] }) => {
  const result = spawnSync('bash', [SKILL, ...input.args], {
    cwd: input.cwd,
    encoding: 'utf-8',
    timeout: 120_000,
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

/**
 * .what = one probe run as the text a human reads, with the temp dir masked
 * .why = a snapshot shows each render in the pr diff, so a reword of a frame cannot ship green
 */
const asRunView = (input: {
  run: { status: number | null; stdout: string; stderr: string };
  dir: string;
}): string =>
  [
    `exit = ${input.run.status}`,
    '--- stdout ---',
    input.run.stdout || '(empty)',
    '--- stderr ---',
    input.run.stderr || '(empty)',
  ]
    .join('\n')
    .split(input.dir)
    .join('$DIR');

describe('hooks.dispatch.probe', () => {
  given('[case1] one settings file per shape: per-rule, and one that starts the dispatcher', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'hooks-dispatch-probe' });
      const rule = join(dir, 'pretooluse.block.sh');
      writeFileSync(rule, 'cat > /dev/null\necho "nope" >&2\nexit 2\n');
      const perRule = join(dir, 'settings.per-rule.json');
      const dispatched = join(dir, 'settings.dispatched.json');
      writeFileSync(perRule, asSettings([`bash ${rule}`]));
      writeFileSync(
        dispatched,
        asSettings(['bash ./node_modules/rhachet/bin/hooks.dispatch.sh .claude/hooks.dispatch.manifest PreToolUse']),
      );
      return { dir, perRule, dispatched };
    });

    when('[t0] verdicts are read from the settings that start the dispatcher', () => {
      const result = useBeforeAll(async () =>
        runProbe({
          cwd: scene.dir,
          args: ['--what', 'verdicts', '--settings', scene.dispatched, '--payload', PAYLOAD],
        }),
      );

      then('it refuses with exit 2, never a false `0 of 1 agree`', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout).not.toContain('agree');
      });

      then('the refusal names both fixes', () => {
        expect(result.stderr).toContain(
          '✋ ConstraintError: these settings already start the hook dispatcher',
        );
        expect(result.stderr).toContain('--settings <a per-rule settings file>');
        expect(result.stderr).toContain('rhx hooks.dispatch.cost --what verdicts');
      });

      then('the refusal matches the snapshot', () => {
        expect(asRunView({ run: result, dir: scene.dir })).toMatchSnapshot();
      });
    });

    when('[t1] cost is read from the settings that start the dispatcher', () => {
      const result = useBeforeAll(async () =>
        runProbe({
          cwd: scene.dir,
          args: ['--what', 'cost', '--settings', scene.dispatched, '--tool', 'Bash', '--runs', '1'],
        }),
      );

      then('it refuses with exit 2 and names the cost instrument', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('rhx hooks.dispatch.cost --what cost');
      });

      then('the refusal matches the snapshot', () => {
        expect(asRunView({ run: result, dir: scene.dir })).toMatchSnapshot();
      });
    });

    when('[t2] verdicts are read from per-rule settings', () => {
      const result = useBeforeAll(async () =>
        runProbe({
          cwd: scene.dir,
          args: ['--what', 'verdicts', '--settings', scene.perRule, '--payload', PAYLOAD],
        }),
      );

      then('it reads the rule, unrefused, and both forms agree', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('pretooluse.block.sh → declared 2, resolved 2');
        expect(result.stdout).toContain('1 of 1 agree');
      });

      then('the verdicts read matches the snapshot', () => {
        expect(asRunView({ run: result, dir: scene.dir })).toMatchSnapshot();
      });
    });

    when('[t3] the hooks list is read from the settings that start the dispatcher', () => {
      const result = useBeforeAll(async () =>
        runProbe({
          cwd: scene.dir,
          args: ['--what', 'hooks', '--settings', scene.dispatched, '--tool', 'Bash'],
        }),
      );

      then('it lists the one dispatcher hook, since a list makes no per-rule claim', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('1 hook fires');
        expect(result.stdout).toContain('hooks.dispatch.sh');
      });

      then('the hooks list matches the snapshot', () => {
        expect(asRunView({ run: result, dir: scene.dir })).toMatchSnapshot();
      });
    });

    when('[t4] the own-process idioms are read', () => {
      const result = useBeforeAll(async () =>
        runProbe({ cwd: scene.dir, args: ['--what', 'idioms'] }),
      );

      then('each idiom acts the same alone and in a subshell, and the caller survives', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('stdout = same');
        expect(result.stdout).toContain('stderr = same');
        expect(result.stdout).toContain('exit code = same (alone 2, subshell 2)');
        expect(result.stdout).toContain('caller survives a rule exit = yes');
      });

      then('the idioms read matches the snapshot, the bash version masked', () => {
        expect(
          asRunView({ run: result, dir: scene.dir }).replace(
            /bash = .+/,
            'bash = __VER__',
          ),
        ).toMatchSnapshot();
      });
    });

    when('[t5] cost is read from per-rule settings', () => {
      const result = useBeforeAll(async () =>
        runProbe({
          cwd: scene.dir,
          args: ['--what', 'cost', '--settings', scene.perRule, '--tool', 'Bash', '--runs', '1'],
        }),
      );

      then('it reads the one bash rule, both ways', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('bash rules (1)');
        expect(result.stdout).toContain('whole event (1 declared, 1 resolved)');
      });

      then('the cost read matches the snapshot, its cpu figures masked', () => {
        expect(
          asRunView({ run: result, dir: scene.dir }).replace(
            /= \d+ ms cpu per call/g,
            '= __N__ ms cpu per call',
          ),
        ).toMatchSnapshot();
      });
    });

    when('[t6] each input the probe refuses', () => {
      const result = useBeforeAll(async () => ({
        noTool: runProbe({
          cwd: scene.dir,
          args: ['--what', 'hooks', '--settings', scene.perRule],
        }),
        noPayload: runProbe({
          cwd: scene.dir,
          args: ['--what', 'verdicts', '--settings', scene.perRule],
        }),
        badWhat: runProbe({ cwd: scene.dir, args: ['--what', 'colors'] }),
      }));

      then('each exits 2 and names what to pass', () => {
        expect(result.noTool.status).toEqual(2);
        expect(result.noTool.stderr).toContain('--what hooks needs --tool <name>');
        expect(result.noPayload.status).toEqual(2);
        expect(result.noPayload.stderr).toContain('--what verdicts needs --payload');
        expect(result.badWhat.status).toEqual(2);
        expect(result.badWhat.stderr).toContain(
          '--what must be hooks, idioms, cost, or verdicts',
        );
      });

      then('the refusals match the snapshot', () => {
        expect(
          [result.noTool, result.noPayload, result.badWhat]
            .map((run) => asRunView({ run, dir: scene.dir }))
            .join('\n\n'),
        ).toMatchSnapshot();
      });
    });

    when('[t7] the help is asked for', () => {
      const result = useBeforeAll(async () => ({
        long: runProbe({ cwd: scene.dir, args: ['--help'] }),
        short: runProbe({ cwd: scene.dir, args: ['-h'] }),
      }));

      then('it exits 0 and names usage and each mode', () => {
        expect(result.long.status).toEqual(0);
        expect(result.long.stdout).toContain('usage');
        expect(result.long.stdout).toContain('--what');
      });

      then('-h reads the same as --help', () => {
        expect(result.short.status).toEqual(0);
        expect(result.short.stdout).toEqual(result.long.stdout);
      });

      then('the help matches the snapshot', () => {
        expect(result.long.stdout).toMatchSnapshot();
      });
    });
  });
});
