import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  symlinkSync,
} from 'node:fs';
import { join } from 'node:path';

/**
 * .what = the repo root, whose `bin/` the fixture reaches through its node_modules
 */
const REPO_ROOT = join(__dirname, '../..');

/**
 * .what = the hook commands the fixture role declares (see the fixture's dist/index.js)
 */
const INITS = '.agent/repo=test/role=tester/inits/claude.hooks';
const DECLARED = {
  boot: './node_modules/.bin/rhachet run --repo test --role tester --init claude.hooks/boot',
  allow: './node_modules/.bin/rhx allow --mode hook',
  block: './node_modules/.bin/rhx block --mode hook',
  trap: `bash ${INITS}/trap.sh`,
  crash: `bash ${INITS}/crash.sh`,
  json: `bash ${INITS}/json.sh`,
} as const;

/**
 * .what = run one shell command in the fixture repo with a payload on stdin, as claude runs a hook
 */
const runAsClaude = (input: {
  cwd: string;
  command: string;
  payload: string;
  env?: Record<string, string | undefined>;
}): { code: number; stdout: string; stderr: string } => {
  const env = Object.fromEntries(
    Object.entries({ ...process.env, HOME: input.cwd, ...input.env }).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
  const result = spawnSync('/bin/sh', ['-c', input.command], {
    cwd: input.cwd,
    input: input.payload,
    encoding: 'utf-8',
    timeout: 60_000,
    env,
  });
  return {
    code: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
};

/**
 * .what = a claude PreToolUse payload for a Bash call
 */
const asPayloadBash = (command: string): string =>
  JSON.stringify({
    session_id: 'abc',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command },
  });

/**
 * .what = mark every file under a dir executable, as a published package ships its skills
 */
const setAllExecutable = (input: { dir: string }): void => {
  for (const entry of readdirSync(input.dir, { withFileTypes: true })) {
    const path = join(input.dir, entry.name);
    if (entry.isDirectory()) setAllExecutable({ dir: path });
    if (entry.isFile()) chmodSync(path, 0o755);
  }
};

/**
 * .what = the hooks of one event in a settings file, flat
 */
const asHooksOfEvent = (input: {
  settings: { hooks?: Record<string, unknown[]> };
  event: string;
}): Array<{ command: string; author?: string; timeout?: unknown }> =>
  (input.settings.hooks?.[input.event] ?? []).flatMap(
    (entry) =>
      (entry as { hooks: Array<{ command: string; author?: string }> }).hooks,
  );

describe('hook dispatcher (one process per claude event)', () => {
  given('[case1] a repo whose role declares hook rules of every kind', () => {
    const scene = useBeforeAll(async () => {
      const cwd = (await genTestTempRepo({ fixture: 'with-hook-dispatch' }))
        .path;
      setAllExecutable({ dir: join(cwd, 'node_modules/rhachet-roles-test/roles') });

      // the rhachet this repo builds, reached as a consumer reaches it
      mkdirSync(join(cwd, 'node_modules/.bin'), { recursive: true });
      symlinkSync(join(REPO_ROOT, 'bin/rhx'), join(cwd, 'node_modules/.bin/rhx'));
      symlinkSync(
        join(REPO_ROOT, 'bin/run'),
        join(cwd, 'node_modules/.bin/rhachet'),
      );
      symlinkSync(REPO_ROOT, join(cwd, 'node_modules/rhachet'));

      // link the role and sync its hooks
      const init = invokeRhachetCliBinary({
        args: ['init', '--roles', 'tester', '--hooks'],
        cwd,
        env: { HOME: genTempDir({ slug: 'hooks-dispatch-home' }) },
      });
      const settings = JSON.parse(
        readFileSync(join(cwd, '.claude/settings.of.repo.json'), 'utf-8'),
      );

      // the dispatcher command claude would run for one event
      const commandOf = (event: string): string => {
        const hooks = asHooksOfEvent({ settings, event });
        if (hooks.length !== 1)
          throw new Error(`expected one ${event} hook, found ${hooks.length}`);
        return hooks[0]!.command;
      };
      const dispatch = (
        event: string,
        payload: string,
        env?: Record<string, string | undefined>,
      ) => runAsClaude({ cwd, command: commandOf(event), payload, env });
      const standalone = (
        command: string,
        payload: string,
        env?: Record<string, string | undefined>,
      ) => runAsClaude({ cwd, command, payload, env });

      return { cwd, init, settings, dispatch, standalone };
    });

    then('init succeeds', () => {
      expect(scene.init.status).toEqual(0);
    });

    then('each claude event holds one dispatcher hook, and no role hook', () => {
      for (const event of ['SessionStart', 'PreToolUse', 'Stop']) {
        const hooks = asHooksOfEvent({ settings: scene.settings, event });
        expect(hooks).toHaveLength(1);
        expect(hooks[0]!.author).toEqual('rhachet/hooks.dispatch');
        expect(hooks[0]!.command).toContain(
          'bash ./node_modules/rhachet/bin/hooks.dispatch.sh ',
        );
        expect(hooks[0]!.command).toMatch(new RegExp(` ${event}$`));
      }
    });

    then('the manifest holds one row per declared rule', () => {
      const manifestPath = asHooksOfEvent({
        settings: scene.settings,
        event: 'PreToolUse',
      })[0]!.command.split(' ')[2]!;
      const rows = readFileSync(join(scene.cwd, manifestPath), 'utf-8')
        .split('\n')
        .filter((line) => line.length > 0 && !line.startsWith('#'));
      expect(rows).toHaveLength(9);
    });

    when('[t0] a Bash call every rule allows', () => {
      const payload = asPayloadBash('pwd');
      const result = useBeforeAll(async () => ({
        dispatched: scene.dispatch('PreToolUse', payload),
        allow: scene.standalone(DECLARED.allow, payload),
        block: scene.standalone(DECLARED.block, payload),
        trap: scene.standalone(DECLARED.trap, payload),
      }));

      then('the dispatcher exits 0', () => {
        expect(result.dispatched.code).toEqual(0);
      });

      then('stdout is each rule stdout, rhx frames included, in manifest order', () => {
        expect(result.dispatched.stdout).toEqual(
          [result.allow.stdout, result.block.stdout, result.trap.stdout].join(''),
        );
        expect(result.dispatched.stdout).toContain(
          '🪨 run solid skill repo=test/role=tester/skill=allow',
        );
      });

      then('a rule whose matcher names another tool does not run', () => {
        expect(result.dispatched.stdout).not.toContain('--mode read');
      });
    });

    when('[t1] a Bash call two rules block', () => {
      const payload = asPayloadBash('deny me');
      const result = useBeforeAll(async () => ({
        dispatched: scene.dispatch('PreToolUse', payload),
        block: scene.standalone(DECLARED.block, payload),
        trap: scene.standalone(DECLARED.trap, payload),
      }));

      then('each blocker exits 2 alone', () => {
        expect(result.block.code).toEqual(2);
        expect(result.trap.code).toEqual(2);
      });

      then('the dispatcher exits 2', () => {
        expect(result.dispatched.code).toEqual(2);
      });

      then('stderr is every blocker stderr, byte for byte, in manifest order', () => {
        expect(result.dispatched.stderr).toEqual(
          [result.block.stderr, result.trap.stderr].join(''),
        );
      });

      then('the subshell rule names its own file in its trap', () => {
        expect(result.dispatched.stderr).toContain(
          'trap fired in trap.sh, src=trap.sh',
        );
      });
    });

    when('[t1b] a Bash call two rules block, under an env that paints no color', () => {
      const payload = asPayloadBash('deny me');
      const env = { FORCE_COLOR: undefined, NO_COLOR: '1' };
      const result = useBeforeAll(async () => ({
        dispatched: scene.dispatch('PreToolUse', payload, env),
        block: scene.standalone(DECLARED.block, payload, env),
        trap: scene.standalone(DECLARED.trap, payload, env),
      }));

      then('stderr is every blocker stderr, byte for byte, in manifest order', () => {
        expect(result.dispatched.code).toEqual(2);
        expect(result.dispatched.stderr).toEqual(
          [result.block.stderr, result.trap.stderr].join(''),
        );
      });
    });

    when('[t2] a Bash call one rule crashes', () => {
      const payload = asPayloadBash('crash');
      const result = useBeforeAll(async () => ({
        dispatched: scene.dispatch('PreToolUse', payload),
        crash: scene.standalone(DECLARED.crash, payload),
      }));

      then('the dispatcher exits with the crash code, a non-block', () => {
        expect(result.crash.code).toEqual(1);
        expect(result.dispatched.code).toEqual(1);
      });

      then('stderr is the crash stderr', () => {
        expect(result.dispatched.stderr).toEqual(result.crash.stderr);
      });
    });

    when('[t3] a Bash call where one rule asks via json and one crashes', () => {
      const payload = asPayloadBash('ask crash');
      const result = useBeforeAll(async () => ({
        dispatched: scene.dispatch('PreToolUse', payload),
        json: scene.standalone(DECLARED.json, payload),
        crash: scene.standalone(DECLARED.crash, payload),
      }));

      then('the dispatcher exits 0, so claude reads the json', () => {
        expect(result.dispatched.code).toEqual(0);
      });

      then('stdout is the json decision, parseable, its decision intact', () => {
        expect(JSON.parse(result.dispatched.stdout)).toMatchObject({
          ...JSON.parse(result.json.stdout),
          hookSpecificOutput: { permissionDecision: 'ask' },
        });
      });

      then('the crash reaches the human as the json systemMessage, never lost', () => {
        expect(result.crash.code).toEqual(1);
        expect(JSON.parse(result.dispatched.stdout).systemMessage).toEqual(
          result.crash.stderr,
        );
        expect(result.dispatched.stderr).toEqual(result.crash.stderr);
      });
    });

    when('[t4] a Bash call where one rule hangs past its timeout', () => {
      const payload = asPayloadBash('hang deny');
      const result = useBeforeAll(async () => {
        const startedAt = Date.now();
        const dispatched = scene.dispatch('PreToolUse', payload, {
          FORCE_COLOR: undefined,
          NO_COLOR: '1',
        });
        return { dispatched, elapsed: Date.now() - startedAt };
      });

      then('the dispatcher returns near the rule timeout, not the hang', () => {
        expect(result.elapsed).toBeLessThan(10_000);
      });

      then('the blockers still block', () => {
        expect(result.dispatched.code).toEqual(2);
        expect(result.dispatched.stderr).toContain('block.sh refuses');
      });

      then('the stderr matches the snapshot', () => {
        expect(result.dispatched.stderr).toMatchSnapshot();
      });
    });

    when('[t4b] the bash < 5 path, where each rule runs as `bash <path>`', () => {
      // .note = RHACHET_HOOKS_DISPATCH_SOURCE=0 takes the path a bash < 5 host takes (no
      //   BASH_ARGV0, so no sourced rule); the verdicts and bytes must match as before
      const env = { RHACHET_HOOKS_DISPATCH_SOURCE: '0' };
      const result = useBeforeAll(async () => ({
        allowed: scene.dispatch('PreToolUse', asPayloadBash('pwd'), env),
        blocked: scene.dispatch('PreToolUse', asPayloadBash('deny me'), env),
        allow: scene.standalone(DECLARED.allow, asPayloadBash('pwd')),
        block: scene.standalone(DECLARED.block, asPayloadBash('pwd')),
        trap: scene.standalone(DECLARED.trap, asPayloadBash('pwd')),
        blockDenied: scene.standalone(DECLARED.block, asPayloadBash('deny me')),
        trapDenied: scene.standalone(DECLARED.trap, asPayloadBash('deny me')),
      }));

      then('an allowed call exits 0 with each rule stdout, in manifest order', () => {
        expect(result.allowed.code).toEqual(0);
        expect(result.allowed.stdout).toEqual(
          [result.allow.stdout, result.block.stdout, result.trap.stdout].join(''),
        );
      });

      then('a blocked call exits 2 with every blocker stderr, byte for byte', () => {
        expect(result.blocked.code).toEqual(2);
        expect(result.blocked.stderr).toEqual(
          [result.blockDenied.stderr, result.trapDenied.stderr].join(''),
        );
      });
    });

    when('[t5] a SessionStart', () => {
      const payload = JSON.stringify({
        hook_event_name: 'SessionStart',
        source: 'startup',
      });
      const result = useBeforeAll(async () => ({
        dispatched: scene.dispatch('SessionStart', payload),
        boot: scene.standalone(DECLARED.boot, payload),
      }));

      then('stdout is the init frame and its output, as rhx printed them', () => {
        expect(result.dispatched.code).toEqual(0);
        expect(result.dispatched.stdout).toEqual(result.boot.stdout);
        expect(result.dispatched.stdout).toContain(
          '💪 init role repo=test/role=tester/init=claude.hooks/boot',
        );
      });
    });

    when('[t6] a Stop, whose one rule runs as declared', () => {
      const result = useBeforeAll(async () =>
        scene.dispatch('Stop', JSON.stringify({ hook_event_name: 'Stop' })),
      );

      then('stdout is the declared command output', () => {
        expect(result.code).toEqual(0);
        expect(result.stdout).toEqual('stop as declared\n');
      });
    });

    when('[t7] the manifest is absent', () => {
      const result = useBeforeAll(async () =>
        runAsClaude({
          cwd: scene.cwd,
          command:
            'bash ./node_modules/rhachet/bin/hooks.dispatch.sh .claude/absent.manifest PreToolUse',
          payload: asPayloadBash('pwd'),
        }),
      );

      then('the dispatcher fails closed, and names the fix', () => {
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError');
        expect(result.stderr).toContain('rhx init --hooks');
      });

      then('the refusal matches the snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t8] init --hooks runs again', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--hooks'],
          cwd: scene.cwd,
          env: { HOME: genTempDir({ slug: 'hooks-dispatch-home' }) },
        }),
      );

      then('the settings are unchanged', () => {
        expect(result.status).toEqual(0);
        const after = JSON.parse(
          readFileSync(join(scene.cwd, '.claude/settings.of.repo.json'), 'utf-8'),
        );
        expect(after.hooks).toEqual(scene.settings.hooks);
      });
    });
  });
});
