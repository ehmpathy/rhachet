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
  writeFileSync,
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
 * .what = a v1 manifest of `foreign` rows, each a declared command the dispatcher runs as claude ran it
 * .why = the merge, matcher and watchdog paths are reached with no fixture role churn
 */
const asManifestOfCommands = (input: {
  header?: string;
  rows: Array<{
    event: string;
    matcher: string;
    timeout: number;
    command: string;
  }>;
}): string =>
  [
    input.header ?? '# rhachet hooks.dispatch manifest v1',
    ...input.rows.map((row) =>
      [
        row.event,
        row.matcher,
        String(row.timeout),
        'repo=test/role=tester',
        'foreign',
        '',
        '',
        '',
        row.command,
        '',
      ].join('\x1f'),
    ),
    '',
  ].join('\n');

/**
 * .what = a claude PreToolUse json decision, as a rule prints it
 */
const asDecisionJson = (decision: 'allow' | 'ask' | 'deny'): string =>
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: `rule says ${decision}`,
    },
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

      // a hand-written manifest, dispatched for one event, as claude would run its dispatcher
      const dispatchManifest = (input: {
        name: string;
        manifest: string;
        event: string;
        payload: string;
        env?: Record<string, string | undefined>;
      }) => {
        writeFileSync(join(cwd, '.claude', `${input.name}.manifest`), input.manifest);
        return runAsClaude({
          cwd,
          command: `bash ./node_modules/rhachet/bin/hooks.dispatch.sh .claude/${input.name}.manifest ${input.event}`,
          payload: input.payload,
          env: input.env,
        });
      };

      return { cwd, init, settings, dispatch, standalone, dispatchManifest };
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

    when('[t2b] a Bash call where two rules block and one crashes', () => {
      const payload = asPayloadBash('deny crash');
      const result = useBeforeAll(async () => ({
        dispatched: scene.dispatch('PreToolUse', payload),
        block: scene.standalone(DECLARED.block, payload),
        trap: scene.standalone(DECLARED.trap, payload),
        crash: scene.standalone(DECLARED.crash, payload),
      }));

      then('the dispatcher exits 2, so the block holds', () => {
        expect(result.block.code).toEqual(2);
        expect(result.crash.code).toEqual(1);
        expect(result.dispatched.code).toEqual(2);
      });

      then('stderr is every blocker stderr, then the crash stderr, never lost', () => {
        expect(result.dispatched.stderr).toEqual(
          [result.block.stderr, result.trap.stderr, result.crash.stderr].join(''),
        );
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

      then('stderr is the init stderr, as rhx printed it', () => {
        expect(result.dispatched.stderr).toEqual(result.boot.stderr);
      });

      then('stdout is the init frame and its output, as rhx printed them', () => {
        expect(result.dispatched.code).toEqual(0);
        expect(JSON.stringify(result.dispatched.stdout)).toEqual(JSON.stringify(result.boot.stdout));
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

    when('[t7b] the manifest is absent, on the events where a block erases a prompt or holds a stop', () => {
      const result = useBeforeAll(async () => ({
        talk: runAsClaude({
          cwd: scene.cwd,
          command:
            'bash ./node_modules/rhachet/bin/hooks.dispatch.sh .claude/absent.manifest UserPromptSubmit',
          payload: JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: 'hi' }),
        }),
        stop: runAsClaude({
          cwd: scene.cwd,
          command:
            'bash ./node_modules/rhachet/bin/hooks.dispatch.sh .claude/absent.manifest Stop',
          payload: JSON.stringify({ hook_event_name: 'Stop' }),
        }),
      }));

      then('each fails closed with exit 2, and names the fix', () => {
        expect(result.talk.code).toEqual(2);
        expect(result.stop.code).toEqual(2);
        expect(result.talk.stderr).toContain('rhx init --hooks');
        expect(result.stop.stderr).toContain('rhx init --hooks');
      });

      then('the refusals match the snapshot', () => {
        expect({ talk: result.talk.stderr, stop: result.stop.stderr }).toMatchSnapshot();
      });
    });

    when('[t9] a rule crashes with no stderr', () => {
      const result = useBeforeAll(async () =>
        scene.dispatchManifest({
          name: 'silent-crash',
          manifest: asManifestOfCommands({
            rows: [{ event: 'PreToolUse', matcher: 'Bash', timeout: 5, command: 'exit 3' }],
          }),
          event: 'PreToolUse',
          payload: asPayloadBash('pwd'),
        }),
      );

      then('the dispatcher exits with the crash code, a non-block', () => {
        expect(result.code).toEqual(3);
      });

      then('stderr names the rule that crashed, since claude labels only the dispatcher', () => {
        expect(result.stderr).toEqual(
          '💥 MalfunctionError: hook rule exited 3 with no stderr (exit 3)\n',
        );
      });
    });

    when('[t10] two rules emit json decisions of different rank', () => {
      const result = useBeforeAll(async () => ({
        allowThenDeny: scene.dispatchManifest({
          name: 'json-allow-deny',
          manifest: asManifestOfCommands({
            rows: [
              { event: 'PreToolUse', matcher: 'Bash', timeout: 5, command: `printf '%s' '${asDecisionJson('allow')}'` },
              { event: 'PreToolUse', matcher: 'Bash', timeout: 5, command: `printf '%s' '${asDecisionJson('deny')}'` },
            ],
          }),
          event: 'PreToolUse',
          payload: asPayloadBash('pwd'),
        }),
        askThenAllow: scene.dispatchManifest({
          name: 'json-ask-allow',
          manifest: asManifestOfCommands({
            rows: [
              { event: 'PreToolUse', matcher: 'Bash', timeout: 5, command: `printf '%s' '${asDecisionJson('ask')}'` },
              { event: 'PreToolUse', matcher: 'Bash', timeout: 5, command: `printf '%s' '${asDecisionJson('allow')}'` },
            ],
          }),
          event: 'PreToolUse',
          payload: asPayloadBash('pwd'),
        }),
      }));

      then('a later deny wins over an earlier allow, as claude ranks them', () => {
        expect(result.allowThenDeny.code).toEqual(0);
        expect(result.allowThenDeny.stdout).toEqual(asDecisionJson('deny'));
      });

      then('an earlier ask holds over a later allow', () => {
        expect(result.askThenAllow.code).toEqual(0);
        expect(result.askThenAllow.stdout).toEqual(asDecisionJson('ask'));
      });
    });

    when('[t11] a rule whose matcher is no valid regex', () => {
      const result = useBeforeAll(async () =>
        scene.dispatchManifest({
          name: 'invalid-matcher',
          manifest: asManifestOfCommands({
            rows: [{ event: 'PreToolUse', matcher: '(?i)bash', timeout: 5, command: 'echo ran' }],
          }),
          event: 'PreToolUse',
          payload: asPayloadBash('pwd'),
        }),
      );

      then('the rule does not run', () => {
        expect(result.stdout).not.toContain('ran');
      });

      then('the dispatcher reports it as a crash, never a silent skip', () => {
        expect(result.code).toEqual(1);
        expect(result.stderr).toEqual(
          '💥 MalfunctionError: hook rule matcher is no valid regex: (?i)bash (echo ran)\n',
        );
      });
    });

    when('[t12] a rule that ignores TERM hangs past its timeout', () => {
      const result = useBeforeAll(async () => {
        const startedAt = Date.now();
        const dispatched = scene.dispatchManifest({
          name: 'hang-ignores-term',
          manifest: asManifestOfCommands({
            rows: [
              { event: 'PreToolUse', matcher: 'Bash', timeout: 1, command: "trap '' TERM; sleep 9" },
            ],
          }),
          event: 'PreToolUse',
          payload: asPayloadBash('pwd'),
        });
        return { dispatched, elapsed: Date.now() - startedAt };
      });

      then('the dispatcher returns within the timeout plus the grace, not the hang', () => {
        expect(result.elapsed).toBeLessThan(6_000);
      });

      then('the rule counts as timed out', () => {
        expect(result.dispatched.code).toEqual(124);
        expect(result.dispatched.stderr).toContain(
          '💥 MalfunctionError: hook rule timed out after 1s',
        );
      });
    });

    when('[t13] the manifest is of a version this dispatcher does not read', () => {
      const result = useBeforeAll(async () =>
        scene.dispatchManifest({
          name: 'version-skew',
          manifest: asManifestOfCommands({
            header: '# rhachet hooks.dispatch manifest v2 — written by `rhx init --hooks`',
            rows: [{ event: 'PreToolUse', matcher: 'Bash', timeout: 5, command: 'echo ran' }],
          }),
          event: 'PreToolUse',
          payload: asPayloadBash('pwd'),
        }),
      );

      then('the dispatcher fails closed, runs no rule, and names the fix', () => {
        expect(result.code).toEqual(2);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toContain('✋ ConstraintError');
        expect(result.stderr).toContain('rhx init --hooks');
      });

      then('the refusal matches the snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t16] a bash rule file reads `$$`', () => {
      const result = useBeforeAll(async () => {
        // sourced in a subshell, `$$` would name the dispatcher and differ from BASHPID
        writeFileSync(
          join(scene.cwd, '.claude', 'own-pid.sh'),
          '[ "$$" = "$BASHPID" ] && echo own || echo shared\n',
        );
        return scene.dispatchManifest({
          name: 'own-pid',
          manifest: [
            '# rhachet hooks.dispatch manifest v1',
            [
              'PreToolUse',
              'Bash',
              '5',
              'repo=test/role=tester',
              'shell',
              '.claude/own-pid.sh',
              '',
              '',
              'bash .claude/own-pid.sh',
              '',
            ].join('\x1f'),
            '',
          ].join('\n'),
          event: 'PreToolUse',
          payload: asPayloadBash('pwd'),
        });
      });

      then('the rule runs as its own process, so `$$` is its own pid', () => {
        expect(result.code).toEqual(0);
        expect(result.stdout.trim()).toEqual('own');
      });
    });

    when('[t17] a rule file whose shebang is not bash (`exec`)', () => {
      const result = useBeforeAll(async () => {
        const path = join(scene.cwd, '.claude', 'node-rule.js');
        writeFileSync(path, "#!/usr/bin/env node\nprocess.stdout.write('node ran');\n");
        chmodSync(path, 0o755);
        return scene.dispatchManifest({
          name: 'exec-rule',
          manifest: [
            '# rhachet hooks.dispatch manifest v1',
            [
              'PreToolUse',
              'Bash',
              '5',
              'repo=test/role=tester',
              'exec',
              '.claude/node-rule.js',
              '',
              '',
              './.claude/node-rule.js',
              '',
            ].join('\x1f'),
            '',
          ].join('\n'),
          event: 'PreToolUse',
          payload: asPayloadBash('pwd'),
        });
      });

      then('the rule runs as its own process, under its own shebang', () => {
        expect(result.code).toEqual(0);
        expect(result.stdout).toEqual('node ran');
      });
    });

    when('[t18] a rule file vanished since the sync', () => {
      const result = useBeforeAll(async () =>
        scene.dispatchManifest({
          name: 'vanished-rule',
          manifest: [
            '# rhachet hooks.dispatch manifest v1',
            [
              'PreToolUse',
              'Bash',
              '5',
              'repo=test/role=tester',
              'shell',
              '.claude/gone.sh',
              '',
              '',
              'echo declared command ran',
              '',
            ].join('\x1f'),
            '',
          ].join('\n'),
          event: 'PreToolUse',
          payload: asPayloadBash('pwd'),
        }),
      );

      then('the rule runs its declared command, as claude ran it', () => {
        expect(result.code).toEqual(0);
        expect(result.stdout.trim()).toEqual('declared command ran');
      });
    });

    when('[t15] a manifest row is truncated, with no kind and no command', () => {
      const result = useBeforeAll(async () =>
        scene.dispatchManifest({
          name: 'truncated-row',
          manifest: [
            '# rhachet hooks.dispatch manifest v1',
            ['PreToolUse', 'Bash', '5', 'repo=demo/role=tester'].join('\x1f'),
            '',
          ].join('\n'),
          event: 'PreToolUse',
          payload: asPayloadBash('pwd'),
        }),
      );

      then('the dispatcher fails closed, runs no rule, and names the fix', () => {
        expect(result.code).toEqual(2);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toContain(
          '✋ ConstraintError: hook dispatch manifest row is malformed',
        );
        expect(result.stderr).toContain('rhx init --hooks');
      });
    });

    when('[t14] a rule lists the per-call files and reads its umask', () => {
      const tmpdir = genTempDir({ slug: 'hooks-dispatch-tmpdir' });
      const result = useBeforeAll(async () => ({
        dispatched: scene.dispatchManifest({
          name: 'private-files',
          manifest: asManifestOfCommands({
            rows: [
              { event: 'PreToolUse', matcher: 'Bash', timeout: 5, command: 'ls -l "$TMPDIR"; umask' },
            ],
          }),
          event: 'PreToolUse',
          payload: asPayloadBash('pwd'),
          env: { TMPDIR: tmpdir },
        }),
        umask: scene.standalone('umask', ''),
      }));

      then('the payload and output files are private to the owner', () => {
        const lines = result.dispatched.stdout.split('\n');
        const inLine = lines.find((line) => line.endsWith('.in'));
        const outLine = lines.find((line) => line.endsWith('.0.out'));
        expect(inLine).toMatch(/^-rw------- /);
        expect(outLine).toMatch(/^-rw------- /);
      });

      then('the rule runs under the umask the dispatcher was started with', () => {
        const lines = result.dispatched.stdout.trim().split('\n');
        expect(lines[lines.length - 1]).toEqual(result.umask.stdout.trim());
      });

      then('no per-call file is left once the dispatcher exits', () => {
        expect(readdirSync(tmpdir).filter((name) => name.startsWith('rhachet.hooks.dispatch.'))).toEqual([]);
      });
    });
  });
});
