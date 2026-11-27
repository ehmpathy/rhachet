import { MalfunctionError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { setupStubBrainPath } from '@/blackbox/.test/infra/setupStubBrainPath';

import { spawn, spawnSync } from 'node:child_process';
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
  talkAllow: './node_modules/.bin/rhx allow --mode talk',
  talkBoot: `bash ${INITS}/boot.sh talk`,
  stop: 'echo "stop as declared"',
  stopBlock: './node_modules/.bin/rhx block --mode stop',
} as const;

/**
 * .what = the file each blocker rule runs, as the manifest row names it
 */
const PATH_OF = {
  block: '.agent/repo=test/role=tester/skills/block.sh',
  trap: `${INITS}/trap.sh`,
} as const;

/**
 * .what = the tail a blocked call ends with: one line per blocker, in manifest order, which names
 *   the rule's file, since claude's own label names the dispatcher
 * .why = the oracle for a block is every blocker's stderr byte for byte, then exactly this tail
 */
const asBlockedByTail = (input: { event: string; paths: string[] }): string =>
  input.paths.map((path) => `🪝 hooks.dispatch ${input.event} blocked by ${path}\n`).join('');

/**
 * .what = a v1 manifest of one `shell` rule on PreToolUse:Bash, which runs the bash file at `path`
 * .why = a case=11 probe runs a file rule as the sync would write it, so the dispatcher sources it
 */
const asManifestOfFileRule = (input: { path: string }): string =>
  [
    '# rhachet hooks.dispatch manifest v1',
    ['PreToolUse', 'Bash', '5', 'repo=test/role=tester', 'shell', input.path, '', '', `bash ${input.path}`, ''].join(
      '\x1f',
    ),
    '',
  ].join('\n');

/**
 * .what = one call as a human reads it: its exit code, then each stream under its own label
 * .why = a snapshot of an object leaves a stream's line breaks raw inside a quoted value, so the
 *   value reads as broken output; a labeled text block reads as the terminal showed it
 */
const asCallView = (input: { code: number | null; stdout: string | null; stderr: string }): string =>
  [
    `exit = ${input.code}`,
    ...(input.stdout === null ? [] : ['--- stdout ---', input.stdout || '(empty)']),
    '--- stderr ---',
    input.stderr || '(empty)',
  ].join('\n');

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
 * .what = runAsClaude, without a block on the event loop, so many calls overlap
 */
const runAsClaudeAsync = (input: {
  cwd: string;
  command: string;
  payload: string;
  env?: Record<string, string | undefined>;
}): Promise<{ code: number; stdout: string; stderr: string }> =>
  new Promise((done, fail) => {
    const env = Object.fromEntries(
      Object.entries({ ...process.env, HOME: input.cwd, ...input.env }).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    );
    const child = spawn('/bin/sh', ['-c', input.command], { cwd: input.cwd, env });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', fail);
    child.on('close', (code) =>
      done({
        code: code ?? 1,
        stdout: Buffer.concat(stdout).toString('utf-8'),
        stderr: Buffer.concat(stderr).toString('utf-8'),
      }),
    );
    child.stdin.end(input.payload);
  });

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
 * .what = a claude PreToolUse payload for a call to any tool
 */
const asPayloadOfTool = (tool: string): string =>
  JSON.stringify({ session_id: 'abc', hook_event_name: 'PreToolUse', tool_name: tool, tool_input: {} });

/**
 * .what = link the rhachet this repo builds into a fixture repo, as a consumer reaches it
 */
const setRhachetLinkedInto = (input: { cwd: string }): void => {
  mkdirSync(join(input.cwd, 'node_modules/.bin'), { recursive: true });
  symlinkSync(join(REPO_ROOT, 'bin/rhx'), join(input.cwd, 'node_modules/.bin/rhx'));
  symlinkSync(join(REPO_ROOT, 'bin/run'), join(input.cwd, 'node_modules/.bin/rhachet'));
  symlinkSync(REPO_ROOT, join(input.cwd, 'node_modules/rhachet'));
};

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
      setRhachetLinkedInto({ cwd });

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
          throw new MalfunctionError('the fixture settings hold not exactly one dispatcher for the event', {
            event,
            hooks: hooks.length,
            hint: 'read the init --hooks output above; the fixture sync did not write one dispatcher per event',
          });
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
      for (const event of ['SessionStart', 'PreToolUse', 'UserPromptSubmit', 'Stop']) {
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
      expect(rows).toHaveLength(12);
    });

    when('[t0] a Bash call every rule allows', () => {
      const payload = asPayloadBash('pwd');
      const result = useBeforeAll(async () => ({
        dispatched: scene.dispatch('PreToolUse', payload),
        colorless: scene.dispatch('PreToolUse', payload, { FORCE_COLOR: undefined, NO_COLOR: '1' }),
        allow: scene.standalone(DECLARED.allow, payload),
        block: scene.standalone(DECLARED.block, payload),
        trap: scene.standalone(DECLARED.trap, payload),
      }));

      then('the output a human reads matches the snapshot', () => {
        expect(
          asCallView({
            code: result.colorless.code,
            stdout: result.colorless.stdout.split(scene.cwd).join('$CWD'),
            stderr: result.colorless.stderr.split(scene.cwd).join('$CWD'),
          }),
        ).toMatchSnapshot();
      });

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
          [
            result.block.stderr,
            result.trap.stderr,
            asBlockedByTail({ event: 'PreToolUse', paths: [PATH_OF.block, PATH_OF.trap] }),
          ].join(''),
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
          [
            result.block.stderr,
            result.trap.stderr,
            asBlockedByTail({ event: 'PreToolUse', paths: [PATH_OF.block, PATH_OF.trap] }),
          ].join(''),
        );
      });

      then('the stderr that holds the call matches the snapshot, its blocked-by tail included', () => {
        expect(result.dispatched.stderr.split(scene.cwd).join('$CWD')).toMatchSnapshot();
      });
    });

    when('[t2] a Bash call one rule crashes', () => {
      const payload = asPayloadBash('crash');
      const result = useBeforeAll(async () => ({
        dispatched: scene.dispatch('PreToolUse', payload),
        colorless: scene.dispatch('PreToolUse', payload, { FORCE_COLOR: undefined, NO_COLOR: '1' }),
        crash: scene.standalone(DECLARED.crash, payload),
      }));

      then('the crash a human reads matches the snapshot', () => {
        expect(
          asCallView({
            code: result.colorless.code,
            stdout: null,
            stderr: result.colorless.stderr.split(scene.cwd).join('$CWD'),
          }),
        ).toMatchSnapshot();
      });

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
          [
            result.block.stderr,
            result.trap.stderr,
            result.crash.stderr,
            asBlockedByTail({ event: 'PreToolUse', paths: [PATH_OF.block, PATH_OF.trap] }),
          ].join(''),
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

      then('the merged json matches the snapshot', () => {
        // pretty json text, so a newline inside a value reads as `\n`, never as a broken line
        expect(JSON.stringify(JSON.parse(result.dispatched.stdout), null, 2)).toMatchSnapshot();
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
          [
            result.blockDenied.stderr,
            result.trapDenied.stderr,
            asBlockedByTail({ event: 'PreToolUse', paths: [PATH_OF.block, PATH_OF.trap] }),
          ].join(''),
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

      then('the context that lands matches the snapshot', () => {
        expect(result.dispatched.stdout.split(scene.cwd).join('$CWD')).toMatchSnapshot();
      });
    });

    when('[t5b] a UserPromptSubmit, whose two rules each add context', () => {
      const payload = JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: 'hi' });
      const result = useBeforeAll(async () => ({
        dispatched: scene.dispatch('UserPromptSubmit', payload),
        allow: scene.standalone(DECLARED.talkAllow, payload),
        boot: scene.standalone(DECLARED.talkBoot, payload),
      }));

      then('stdout is each rule stdout, rhx frame included, in manifest order', () => {
        expect(result.dispatched.code).toEqual(0);
        expect(result.dispatched.stdout).toEqual(
          [result.allow.stdout, result.boot.stdout].join(''),
        );
        expect(result.dispatched.stdout).toContain('boot context, args=talk');
      });

      then('the context that lands matches the snapshot', () => {
        expect(result.dispatched.stdout.split(scene.cwd).join('$CWD')).toMatchSnapshot();
      });
    });

    when('[t6] a Stop every rule lets pass', () => {
      const payload = JSON.stringify({ hook_event_name: 'Stop', stop_hook_active: false });
      const result = useBeforeAll(async () => ({
        dispatched: scene.dispatch('Stop', payload),
        declared: scene.standalone(DECLARED.stop, payload),
        block: scene.standalone(DECLARED.stopBlock, payload),
      }));

      then('stdout is the declared command output, then the rhx rule output', () => {
        expect(result.dispatched.code).toEqual(0);
        expect(result.dispatched.stdout).toEqual(
          [result.declared.stdout, result.block.stdout].join(''),
        );
        expect(result.dispatched.stdout).toContain('stop as declared\n');
      });
    });

    when('[t6b] a Stop an rhx skill rule blocks', () => {
      const payload = JSON.stringify({
        hook_event_name: 'Stop',
        stop_hook_active: false,
        last_assistant_message: 'deny',
      });
      // no color, so the snapshot holds the same bytes on every box, as its siblings do
      const env = { FORCE_COLOR: undefined, NO_COLOR: '1' };
      const result = useBeforeAll(async () => ({
        dispatched: scene.dispatch('Stop', payload, env),
        block: scene.standalone(DECLARED.stopBlock, payload, env),
      }));

      then('the rule blocks alone, and the dispatcher exits 2, so the stop is held', () => {
        expect(result.block.code).toEqual(2);
        expect(result.dispatched.code).toEqual(2);
      });

      then('stderr is the blocker stderr, byte for byte, then its blocked-by line', () => {
        expect(result.dispatched.stderr).toEqual(
          result.block.stderr + asBlockedByTail({ event: 'Stop', paths: [PATH_OF.block] }),
        );
      });

      then('the stderr that holds the stop matches the snapshot', () => {
        expect(result.dispatched.stderr.split(scene.cwd).join('$CWD')).toMatchSnapshot();
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

      then('the hooks report of the rerun matches the snapshot', () => {
        // from the `🪝` header to the end of stdout; a rerun must read as a no-op
        const lines = result.stdout.split('\n');
        const start = lines.findIndex((line) => line.includes('🪝'));
        expect(start).toBeGreaterThanOrEqual(0);
        expect(lines.slice(start).join('\n').split(scene.cwd).join('$DIR')).toMatchSnapshot();
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
          payload: JSON.stringify({ hook_event_name: 'Stop', stop_hook_active: false }),
        }),
        stopAgain: runAsClaude({
          cwd: scene.cwd,
          command:
            'bash ./node_modules/rhachet/bin/hooks.dispatch.sh .claude/absent.manifest Stop',
          payload: JSON.stringify({ hook_event_name: 'Stop', stop_hook_active: true }),
        }),
      }));

      then('the prompt is not held (exit 1), so no prompt is erased, and the fix is named', () => {
        expect(result.talk.code).toEqual(1);
        expect(result.talk.stderr).toContain('rhx init --hooks');
      });

      then('the first stop is held (exit 2), and names the fix', () => {
        expect(result.stop.code).toEqual(2);
        expect(result.stop.stderr).toContain('rhx init --hooks');
      });

      then('a stop claude already held passes (exit 1), so the seat never loops', () => {
        expect(result.stopAgain.code).toEqual(1);
        expect(result.stopAgain.stderr).toEqual(result.stop.stderr);
      });

      then('the prompt refusal matches the snapshot', () => {
        expect(result.talk.stderr).toMatchSnapshot();
      });

      then('the stop refusal matches the snapshot', () => {
        expect(result.stop.stderr).toMatchSnapshot();
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
          '💥 MalfunctionError: hook rule exited 3 with no stderr (`exit 3`)\n' +
            "   └─ fix = run the rule alone with this event's payload on stdin, to see why it exits 3\n",
        );
        expect(result.stderr).toMatchSnapshot();
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

      then('the decisions claude reads match the snapshot', () => {
        // json text in emit order, as [t3] and [t30] snap it: the shape claude reads
        expect(
          JSON.stringify(
            {
              allowThenDeny: JSON.parse(result.allowThenDeny.stdout),
              askThenAllow: JSON.parse(result.askThenAllow.stdout),
            },
            null,
            2,
          ),
        ).toMatchSnapshot();
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
          '💥 MalfunctionError: hook rule matcher is no valid regex: `(?i)bash` (`echo ran`)\n' +
            '   └─ fix = run `npx rhx init --hooks` to rewrite the manifest from the roles\n',
        );
        expect(result.stderr).toMatchSnapshot();
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

      then("stderr holds no bash job notice, which would print the dispatcher's own source", () => {
        // claude killed a timed-out per-rule hook itself and printed naught; bash's `Killed`
        //   notice for a reaped job is a dispatcher artifact a human must never read
        expect(result.dispatched.stderr).not.toContain('Killed');
        expect(result.dispatched.stderr).not.toContain('__rhx_dispatch');
      });

      then('the timeout notice matches the snapshot', () => {
        expect(result.dispatched.stderr).toMatchSnapshot();
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

    when('[t28] a bash rule crashes on an unbound var under set -u (vision case=11 [t2])', () => {
      const result = useBeforeAll(async () => {
        writeFileSync(
          join(scene.cwd, '.claude', 'unbound.sh'),
          [
            'set -u',
            'trap \'code=$?; [ "$code" = 0 ] || echo "💥 MalfunctionError: ${0##*/} crashed ($code)" >&2\' EXIT',
            'echo "$absent_name"',
            '',
          ].join('\n'),
        );
        const payload = asPayloadBash('pwd');
        return {
          dispatched: scene.dispatchManifest({
            name: 'unbound',
            manifest: asManifestOfFileRule({ path: '.claude/unbound.sh' }),
            event: 'PreToolUse',
            payload,
          }),
          alone: scene.standalone('bash .claude/unbound.sh', payload),
        };
      });

      then('its EXIT trap fires and names the rule by its own file name, as alone', () => {
        expect(result.alone.stderr).toContain('💥 MalfunctionError: unbound.sh crashed');
        expect(result.dispatched.stderr).toEqual(result.alone.stderr);
      });

      then('the crash keeps its own exit code, a non-block, as alone', () => {
        expect(result.alone.code).not.toEqual(0);
        expect(result.alone.code).not.toEqual(2);
        expect(result.dispatched.code).toEqual(result.alone.code);
      });
    });

    when('[t29] a rule tests a name the dispatcher uses internally (vision case=11 [t3])', () => {
      const result = useBeforeAll(async () => {
        writeFileSync(
          join(scene.cwd, '.claude', 'internal-names.sh'),
          [
            'echo "payload=${__rhx_dispatch_payload-unset}"',
            'echo "names=$(compgen -v | grep -c \'^__rhx_dispatch\' || true)"',
            '',
          ].join('\n'),
        );
        const payload = asPayloadBash('pwd');
        return {
          dispatched: scene.dispatchManifest({
            name: 'internal-names',
            manifest: asManifestOfFileRule({ path: '.claude/internal-names.sh' }),
            event: 'PreToolUse',
            payload,
          }),
          alone: scene.standalone('bash .claude/internal-names.sh', payload),
        };
      });

      then('each dispatcher name reads unset, as alone', () => {
        expect(result.alone.stdout).toEqual('payload=unset\nnames=0\n');
        expect(result.dispatched.code).toEqual(0);
        expect(result.dispatched.stdout).toEqual(result.alone.stdout);
      });
    });

    when('[t31] a 1 MB payload reaches a rule that reads it (the one-pass payload read)', () => {
      // the dispatcher reads its payload once, then hands the same bytes to each rule; a large
      //   payload with a blank line and a final newline must arrive byte for byte
      const result = useBeforeAll(async () => {
        writeFileSync(join(scene.cwd, '.claude', 'payload-sum.sh'), 'cksum\n');
        const payload = `${asPayloadBash(`echo ${'x'.repeat(1024 * 1024)}`)}\n\nline after a blank\n`;
        return {
          payload,
          dispatched: scene.dispatchManifest({
            name: 'payload-sum',
            manifest: asManifestOfFileRule({ path: '.claude/payload-sum.sh' }),
            event: 'PreToolUse',
            payload,
          }),
          alone: scene.standalone('bash .claude/payload-sum.sh', payload),
        };
      });

      then('the payload is over 1 MB', () => {
        expect(Buffer.byteLength(result.payload)).toBeGreaterThan(1024 * 1024);
      });

      then('the rule reads the same bytes it reads alone', () => {
        expect(result.alone.code).toEqual(0);
        expect(result.alone.stdout).toMatch(/^\d+ \d+\n$/);
        expect(result.dispatched.code).toEqual(0);
        expect(result.dispatched.stdout).toEqual(result.alone.stdout);
      });
    });

    when('[t32] a rule whose matcher is a valid regex (`mcp__.*`)', () => {
      // claude reads a matcher of any char beyond letters, digits, `_` and `|` as a regex; the
      //   dispatcher must fit the same tools claude would start the rule for, and skip the rest
      const manifest = asManifestOfCommands({
        rows: [{ event: 'PreToolUse', matcher: 'mcp__.*', timeout: 5, command: 'echo mcp rule ran' }],
      });
      const result = useBeforeAll(async () => ({
        fits: scene.dispatchManifest({
          name: 'regex-fits',
          manifest,
          event: 'PreToolUse',
          payload: asPayloadOfTool('mcp__github__get_issue'),
        }),
        skips: scene.dispatchManifest({
          name: 'regex-skips',
          manifest,
          event: 'PreToolUse',
          payload: asPayloadOfTool('Bash'),
        }),
      }));

      then('a tool the regex fits runs the rule', () => {
        expect(result.fits.code).toEqual(0);
        expect(result.fits.stdout).toEqual('mcp rule ran\n');
      });

      then('a tool the regex does not fit skips the rule', () => {
        expect(result.skips.code).toEqual(0);
        expect(result.skips.stdout).toEqual('');
        expect(result.skips.stderr).toEqual('');
      });
    });

    when('[t33] one Stop through the repo actor manifest and through a `-driver` clone manifest (vision case=10)', () => {
      // a peer clone's dispatcher names its own manifest, which holds no driver rule; so its Stop
      //   runs no driver rule, while the repo actor's Stop still holds on the driver's rule
      const rowOther = { event: 'Stop', matcher: '*', timeout: 5, command: 'echo other ran' };
      const rowDriver = {
        event: 'Stop',
        matcher: '*',
        timeout: 5,
        command: 'echo "route.drive holds the stop" >&2; exit 2',
      };
      const payload = JSON.stringify({ hook_event_name: 'Stop', stop_hook_active: false });
      const result = useBeforeAll(async () => ({
        repo: scene.dispatchManifest({
          name: 'stop-repo-actor',
          manifest: asManifestOfCommands({ rows: [rowOther, rowDriver] }),
          event: 'Stop',
          payload,
        }),
        clone: scene.dispatchManifest({
          name: 'stop-clone-without-driver',
          manifest: asManifestOfCommands({ rows: [rowOther] }),
          event: 'Stop',
          payload,
        }),
      }));

      then('the repo actor stop is held by the driver rule', () => {
        expect(result.repo.code).toEqual(2);
        expect(result.repo.stderr).toContain('route.drive holds the stop');
      });

      then('the clone stop runs only its own rule and is not held', () => {
        expect(result.clone.code).toEqual(0);
        expect(result.clone.stdout).toEqual('other ran\n');
        expect(result.clone.stderr).not.toContain('route.drive');
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

      then('the refusal matches the snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
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

    when('[t19] the per-call dir cannot be written, and a rule would block', () => {
      const tmpdir = genTempDir({ slug: 'hooks-dispatch-tmpdir-readonly' });
      const result = useBeforeAll(async () => {
        chmodSync(tmpdir, 0o500);
        const dispatched = scene.dispatchManifest({
          name: 'readonly-tmpdir',
          manifest: asManifestOfCommands({
            rows: [{ event: 'PreToolUse', matcher: 'Bash', timeout: 5, command: 'echo blocked >&2; exit 2' }],
          }),
          event: 'PreToolUse',
          payload: asPayloadBash('deny me'),
          env: { TMPDIR: tmpdir },
        });
        chmodSync(tmpdir, 0o700);
        return dispatched;
      });

      then('the dispatcher fails closed, runs no rule, and names the fix', () => {
        expect(result.code).toEqual(2);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toContain(
          '✋ ConstraintError: hook dispatch cannot create its per-call files',
        );
      });

      then('the refusal matches the snapshot', () => {
        expect(result.stderr.replace(tmpdir, '$TMPDIR')).toMatchSnapshot();
      });
    });

    when('[t20] an entry is planted at the pid-keyed per-call name, as a symlink to a victim file', () => {
      const tmpdir = genTempDir({ slug: 'hooks-dispatch-tmpdir-planted' });
      const victim = join(tmpdir, 'victim.txt');
      const result = useBeforeAll(async () => {
        writeFileSync(victim, 'untouched\n');
        writeFileSync(
          join(scene.cwd, '.claude', 'planted.manifest'),
          asManifestOfCommands({
            rows: [{ event: 'PreToolUse', matcher: 'Bash', timeout: 5, command: 'echo ran' }],
          }),
        );
        // `exec` keeps the shell's pid, so the planted name is the one a pid-keyed name would take
        return runAsClaude({
          cwd: scene.cwd,
          command: `ln -s "${victim}" "$TMPDIR/rhachet.hooks.dispatch.$$.umask"; exec bash ./node_modules/rhachet/bin/hooks.dispatch.sh .claude/planted.manifest PreToolUse`,
          payload: asPayloadBash('pwd'),
          env: { TMPDIR: tmpdir },
        });
      });

      then('the dispatcher takes a name of its own and runs the rule', () => {
        expect(result.code).toEqual(0);
        expect(result.stdout).toContain('ran');
        expect(result.stderr).not.toContain('ConstraintError');
      });

      then('the victim file is untouched', () => {
        expect(readFileSync(victim, 'utf-8')).toEqual('untouched\n');
      });

      then('the planted entry is left as it was, and no per-call file of its own remains', () => {
        const left = readdirSync(tmpdir).filter((name) => name.startsWith('rhachet.hooks.dispatch.'));
        expect(left).toHaveLength(1);
        expect(left[0]).toMatch(/^rhachet\.hooks\.dispatch\.\d+\.umask$/);
      });
    });

    when('[t21] a manifest row holds more fields than v1 declares', () => {
      const result = useBeforeAll(async () =>
        scene.dispatchManifest({
          name: 'long-row',
          manifest: [
            '# rhachet hooks.dispatch manifest v1',
            ['PreToolUse', 'Bash', '5', 'repo=test/role=tester', 'foreign', '', '', '', 'echo ran', '', 'extra'].join('\x1f'),
            '',
          ].join('\n'),
          event: 'PreToolUse',
          payload: asPayloadBash('pwd'),
        }),
      );

      then('the dispatcher fails closed, runs no rule, and names the fix', () => {
        expect(result.code).toEqual(2);
        expect(result.stdout).toEqual('');
      });

      then('the refusal matches the snapshot', () => {
        expect(result.stderr.replace(scene.cwd, '$CWD')).toMatchSnapshot();
      });
    });

    when('[t21b] a manifest that holds an unresolved merge conflict', () => {
      const row = (command: string) =>
        ['PreToolUse', 'Bash', '5', 'repo=test/role=tester', 'foreign', '', '', '', command, ''].join('\x1f');
      const result = useBeforeAll(async () =>
        scene.dispatchManifest({
          name: 'conflicted',
          manifest: [
            '# rhachet hooks.dispatch manifest v1',
            '<<<<<<< HEAD',
            row('echo ours'),
            '=======',
            row('echo theirs'),
            '>>>>>>> main',
            '',
          ].join('\n'),
          event: 'PreToolUse',
          payload: asPayloadBash('pwd'),
        }),
      );

      then('the dispatcher fails closed, runs neither side, and names the fix', () => {
        expect(result.code).toEqual(2);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toContain('✋ ConstraintError: hook dispatch manifest holds an unresolved merge conflict');
        expect(result.stderr).toContain('npx rhx init --hooks');
      });

      then('the refusal matches the snapshot', () => {
        expect(result.stderr.split(scene.cwd).join('$CWD')).toMatchSnapshot();
      });
    });

    when('[t22] two PermissionRequest rules decide via the behavior object', () => {
      const asBehaviorJson = (behavior: 'allow' | 'deny'): string =>
        JSON.stringify({
          hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior } },
        });
      const result = useBeforeAll(async () =>
        scene.dispatchManifest({
          name: 'permission-request',
          manifest: asManifestOfCommands({
            rows: [
              { event: 'PermissionRequest', matcher: 'Bash', timeout: 5, command: `printf '%s' '${asBehaviorJson('allow')}'` },
              { event: 'PermissionRequest', matcher: 'Bash', timeout: 5, command: `printf '%s' '${asBehaviorJson('deny')}'` },
            ],
          }),
          event: 'PermissionRequest',
          payload: JSON.stringify({ hook_event_name: 'PermissionRequest', tool_name: 'Bash' }),
        }),
      );

      then('the later deny wins over the earlier allow', () => {
        expect(result.code).toEqual(0);
        expect(result.stdout).toEqual(asBehaviorJson('deny'));
      });

      then('the decision claude reads matches the snapshot', () => {
        expect(JSON.stringify(JSON.parse(result.stdout), null, 2)).toMatchSnapshot();
      });
    });

    when('[t23] a rule whose EXIT trap turns any crash into a block hangs past its timeout', () => {
      const result = useBeforeAll(async () => {
        // the trap the mechanic guards set: any exit other than 0 or 2 becomes 2
        writeFileSync(
          join(scene.cwd, '.claude', 'exit-trap.sh'),
          [
            'trap \'rc=$?; [ "$rc" -eq 0 ] || [ "$rc" -eq 2 ] || exit 2\' EXIT',
            'while :; do :; done',
            '',
          ].join('\n'),
        );
        const manifest = [
          '# rhachet hooks.dispatch manifest v1',
          ['PreToolUse', 'Bash', '1', 'repo=test/role=tester', 'shell', '.claude/exit-trap.sh', '', '', 'bash .claude/exit-trap.sh', ''].join('\x1f'),
          '',
        ].join('\n');
        const startedAt = Date.now();
        const sourced = scene.dispatchManifest({
          name: 'exit-trap',
          manifest,
          event: 'PreToolUse',
          payload: asPayloadBash('pwd'),
        });
        // as its own process (`bash <path>`), as a rule that reads `$$` or a bash < 5 host runs it
        const spawned = scene.dispatchManifest({
          name: 'exit-trap',
          manifest,
          event: 'PreToolUse',
          payload: asPayloadBash('pwd'),
          env: { RHACHET_HOOKS_DISPATCH_SOURCE: '0' },
        });
        // a rule that traps TERM itself and exits 2 from it
        writeFileSync(
          join(scene.cwd, '.claude', 'term-trap.sh'),
          ["trap 'exit 2' TERM", 'while :; do :; done', ''].join('\n'),
        );
        const termTrapped = scene.dispatchManifest({
          name: 'term-trap',
          manifest: manifest.split('exit-trap.sh').join('term-trap.sh'),
          event: 'PreToolUse',
          payload: asPayloadBash('pwd'),
        });
        return { sourced, spawned, termTrapped, elapsed: Date.now() - startedAt };
      });

      then('a TERM trap that exits 2 still counts as timed out, never as a block', () => {
        expect(result.termTrapped.code).toEqual(124);
        expect(result.termTrapped.stderr).toContain(
          '💥 MalfunctionError: hook rule timed out after 1s (.claude/term-trap.sh)',
        );
      });

      then('it counts as timed out, a non-block, as claude reads a timed-out hook', () => {
        expect(result.elapsed).toBeLessThan(15_000);
        for (const dispatched of [result.sourced, result.spawned]) {
          expect(dispatched.code).toEqual(124);
          expect(dispatched.stderr).toContain(
            '💥 MalfunctionError: hook rule timed out after 1s (.claude/exit-trap.sh)',
          );
        }
      });
    });

    when('[t25] a Bash call two rules block, with a trace file set', () => {
      const traceDir = genTempDir({ slug: 'hooks-dispatch-trace' });
      const tracePath = join(traceDir, 'trace.log');
      const payload = asPayloadBash('deny me');
      const env = { FORCE_COLOR: undefined, NO_COLOR: '1' };
      const result = useBeforeAll(async () => ({
        traced: scene.dispatch('PreToolUse', payload, {
          ...env,
          RHACHET_HOOKS_DISPATCH_TRACE: tracePath,
        }),
        plain: scene.dispatch('PreToolUse', payload, env),
      }));

      then('the verdict claude reads is unchanged by the trace', () => {
        expect(result.traced.code).toEqual(result.plain.code);
        expect(result.traced.stdout).toEqual(result.plain.stdout);
        expect(result.traced.stderr).toEqual(result.plain.stderr);
      });

      then('the trace names each rule that ran, its exit, each rule skipped, and the verdict', () => {
        const trace = readFileSync(tracePath, 'utf-8');
        expect(trace).toMatch(
          /hooks\.dispatch\[\d+\] PreToolUse · ran rhx-skill, exit 2 · \.agent\/repo=test\/role=tester\/skills\/block\.sh/,
        );
        expect(trace).toMatch(
          /hooks\.dispatch\[\d+\] PreToolUse · skip, matcher Read does not fit Bash/,
        );
        expect(trace).toMatch(/hooks\.dispatch\[\d+\] PreToolUse · 6 ran, 1 skipped · exit 2, \d+\.\d{3}s\n$/);
      });

      then('every line of the call carries one pid, so seats that share a trace file stay apart', () => {
        const pids = readFileSync(tracePath, 'utf-8')
          .split('\n')
          .filter((line) => line.length > 0)
          .map((line) => line.match(/^hooks\.dispatch\[(\d+)\] /)?.[1]);
        expect(pids.every((pid) => pid !== undefined)).toEqual(true);
        expect(new Set(pids).size).toEqual(1);
      });

      then('the trace matches the snapshot', () => {
        expect(
          readFileSync(tracePath, 'utf-8')
            .replace(/^hooks\.dispatch\[\d+\] /gm, 'hooks.dispatch[__PID__] ')
            .replace(/, \d+\.\d{3}s\n$/, ', __DURATION__\n'),
        ).toMatchSnapshot();
      });
    });

    when('[t24] a SessionStart where one rule emits json context and another plain context', () => {
      const json = JSON.stringify({
        hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: 'from json' },
      });
      const result = useBeforeAll(async () =>
        scene.dispatchManifest({
          name: 'json-beside-plain',
          manifest: asManifestOfCommands({
            rows: [
              { event: 'SessionStart', matcher: '*', timeout: 5, command: 'echo plain context' },
              { event: 'SessionStart', matcher: '*', timeout: 5, command: `printf '%s' '${json}'` },
            ],
          }),
          event: 'SessionStart',
          payload: JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup' }),
        }),
      );

      then('the json is kept whole and the plain context is dropped, as one stdout carries one shape', () => {
        expect(result.code).toEqual(0);
        expect(result.stdout).toEqual(json);
      });

      then('the context claude reads matches the snapshot', () => {
        expect(JSON.stringify(JSON.parse(result.stdout), null, 2)).toMatchSnapshot();
      });
    });

    when('[t30] a SessionStart where one rule emits plain context with control bytes and another crashes (vision case=4)', () => {
      // the crash beside plain context turns the context into json, so it can carry the crash as a
      //   `systemMessage`; every control byte of the context must be escaped, or the json is invalid
      const result = useBeforeAll(async () =>
        scene.dispatchManifest({
          name: 'crash-beside-plain',
          manifest: asManifestOfCommands({
            rows: [
              { event: 'SessionStart', matcher: '*', timeout: 5, command: "printf 'ctx\\001bell\\fform\\btab\\tend\\n'" },
              { event: 'SessionStart', matcher: '*', timeout: 5, command: 'echo boom >&2; exit 3' },
            ],
          }),
          event: 'SessionStart',
          payload: JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup' }),
        }),
      );

      then('the context holds, so the event exits 0', () => {
        expect(result.code).toEqual(0);
      });

      then('stdout is valid json that carries the context byte for byte', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.hookSpecificOutput).toEqual({
          hookEventName: 'SessionStart',
          additionalContext: 'ctx\u0001bell\fform\btab\tend\n',
        });
      });

      then('the crash reaches the human as the systemMessage and on stderr', () => {
        expect(JSON.parse(result.stdout).systemMessage).toEqual('boom\n');
        expect(result.stderr).toEqual('boom\n');
      });

      then('the json claude reads matches the snapshot', () => {
        expect(JSON.stringify(JSON.parse(result.stdout), null, 2)).toMatchSnapshot();
      });
    });

    when('[t34] a UserPromptSubmit where one rule emits plain context and another crashes (vision case=4)', () => {
      // the same fold as [t30], on the other event whose stdout lands in context
      const result = useBeforeAll(async () =>
        scene.dispatchManifest({
          name: 'crash-beside-plain-talk',
          manifest: asManifestOfCommands({
            rows: [
              { event: 'UserPromptSubmit', matcher: '*', timeout: 5, command: 'echo talk context' },
              { event: 'UserPromptSubmit', matcher: '*', timeout: 5, command: 'echo boom >&2; exit 3' },
            ],
          }),
          event: 'UserPromptSubmit',
          payload: JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: 'hi' }),
        }),
      );

      then('the context holds, so the event exits 0', () => {
        expect(result.code).toEqual(0);
      });

      then('stdout is valid json that carries the context and the crash', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.hookSpecificOutput).toEqual({
          hookEventName: 'UserPromptSubmit',
          additionalContext: 'talk context\n',
        });
        expect(parsed.systemMessage).toEqual('boom\n');
        expect(result.stderr).toEqual('boom\n');
      });

      then('the json claude reads matches the snapshot', () => {
        expect(JSON.stringify(JSON.parse(result.stdout), null, 2)).toMatchSnapshot();
      });
    });

    when("[t36] a Bash call where one rule's json carries its own systemMessage and one crashes", () => {
      // the dispatcher never overwrites a rule's own systemMessage; the crash then shows on stderr alone
      const json = JSON.stringify({
        systemMessage: 'rule says hi',
        hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask' },
      });
      const result = useBeforeAll(async () =>
        scene.dispatchManifest({
          name: 'own-system-message',
          manifest: asManifestOfCommands({
            rows: [
              { event: 'PreToolUse', matcher: 'Bash', timeout: 5, command: `printf '%s' '${json}'` },
              { event: 'PreToolUse', matcher: 'Bash', timeout: 5, command: 'echo boom >&2; exit 3' },
            ],
          }),
          event: 'PreToolUse',
          payload: asPayloadBash('pwd'),
        }),
      );

      then('the decision holds, with the rule json byte for byte', () => {
        expect(result.code).toEqual(0);
        expect(result.stdout).toEqual(json);
      });

      then('the crash reaches the human on stderr', () => {
        expect(result.stderr).toEqual('boom\n');
      });
    });

    when('[t37] a Bash call where one rule names a .sh that is gone, beside a live blocker', () => {
      // an orphan rule fails as claude ran it alone: bash exits 127 with its own stderr; the live
      //   rule still decides, so its block holds
      const result = useBeforeAll(async () =>
        scene.dispatchManifest({
          name: 'orphan-beside-live',
          manifest: asManifestOfCommands({
            rows: [
              { event: 'PreToolUse', matcher: 'Bash', timeout: 5, command: 'bash .claude/gone.sh' },
              { event: 'PreToolUse', matcher: 'Bash', timeout: 5, command: 'echo live says no >&2; exit 2' },
            ],
          }),
          event: 'PreToolUse',
          payload: asPayloadBash('pwd'),
        }),
      );

      then('the live rule still decides: the call is blocked', () => {
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain('live says no');
      });

      then("the orphan's own crash stderr reaches the human beside the block", () => {
        expect(result.stderr).toContain('.claude/gone.sh: No such file or directory');
      });

      then('the result matches the snapshot', () => {
        expect({ code: result.code, stdout: result.stdout, stderr: result.stderr }).toMatchSnapshot();
      });
    });

    when('[t35] SessionStart rules whose matchers key on the session source', () => {
      // claude matches a SessionStart hook against the payload's `source`; a live role keys one on
      //   `compact`, so the dispatcher must run it on a compact and skip it on a startup
      const manifest = asManifestOfCommands({
        rows: [
          { event: 'SessionStart', matcher: 'compact', timeout: 5, command: 'echo compact ran' },
          { event: 'SessionStart', matcher: 'startup', timeout: 5, command: 'echo startup ran' },
        ],
      });
      const result = useBeforeAll(async () => ({
        startup: scene.dispatchManifest({
          name: 'source-startup',
          manifest,
          event: 'SessionStart',
          payload: JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup' }),
        }),
        compact: scene.dispatchManifest({
          name: 'source-compact',
          manifest,
          event: 'SessionStart',
          payload: JSON.stringify({ hook_event_name: 'SessionStart', source: 'compact' }),
        }),
      }));

      then('a startup runs only the rule keyed on startup', () => {
        expect(result.startup.code).toEqual(0);
        expect(result.startup.stdout).toEqual('startup ran\n');
      });

      then('a compact runs only the rule keyed on compact', () => {
        expect(result.compact.code).toEqual(0);
        expect(result.compact.stdout).toEqual('compact ran\n');
      });
    });

    when('[t26] one seat session, end to end (vision case=9)', () => {
      // one session in order over the one synced manifest: boot, an all-allow call, a many-block,
      //   an ask json beside a crash, a prompt, and a stop an rhx skill holds beside a foreign rule.
      //   each step must equal its rules run alone, and no step may leave a per-call file behind
      //   for the next to meet
      const tmp = genTempDir({ slug: 'hooks-dispatch-walk-tmp' });
      const tracePath = join(genTempDir({ slug: 'hooks-dispatch-walk-trace' }), 'trace.log');
      const env = { TMPDIR: tmp, RHACHET_HOOKS_DISPATCH_TRACE: tracePath };
      const payloadBoot = JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup' });
      const payloadTalk = JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: 'hi' });
      const payloadStop = JSON.stringify({
        hook_event_name: 'Stop',
        stop_hook_active: false,
        last_assistant_message: 'deny',
      });
      const walk = useBeforeAll(async () => ({
        boot: scene.dispatch('SessionStart', payloadBoot, env),
        allowed: scene.dispatch('PreToolUse', asPayloadBash('pwd'), env),
        blocked: scene.dispatch('PreToolUse', asPayloadBash('deny me'), env),
        asked: scene.dispatch('PreToolUse', asPayloadBash('ask crash'), env),
        talk: scene.dispatch('UserPromptSubmit', payloadTalk, env),
        stop: scene.dispatch('Stop', payloadStop, env),
        alone: {
          boot: scene.standalone(DECLARED.boot, payloadBoot),
          allow: scene.standalone(DECLARED.allow, asPayloadBash('pwd')),
          block: scene.standalone(DECLARED.block, asPayloadBash('pwd')),
          trap: scene.standalone(DECLARED.trap, asPayloadBash('pwd')),
          blockDenied: scene.standalone(DECLARED.block, asPayloadBash('deny me')),
          trapDenied: scene.standalone(DECLARED.trap, asPayloadBash('deny me')),
          json: scene.standalone(DECLARED.json, asPayloadBash('ask crash')),
          talkAllow: scene.standalone(DECLARED.talkAllow, payloadTalk),
          talkBoot: scene.standalone(DECLARED.talkBoot, payloadTalk),
          stopBlock: scene.standalone(DECLARED.stopBlock, payloadStop),
        },
      }));

      then('the boot lands the init frame and its output, as alone', () => {
        expect(walk.boot.code).toEqual(0);
        expect(walk.boot.stdout).toEqual(walk.alone.boot.stdout);
      });

      then('the all-allow call exits 0 with each rule stdout, in manifest order', () => {
        expect(walk.allowed.code).toEqual(0);
        expect(walk.allowed.stdout).toEqual(
          [walk.alone.allow.stdout, walk.alone.block.stdout, walk.alone.trap.stdout].join(''),
        );
      });

      then('the many-block call exits 2 with every blocker stderr, byte for byte', () => {
        expect(walk.blocked.code).toEqual(2);
        expect(walk.blocked.stderr).toEqual(
          [
            walk.alone.blockDenied.stderr,
            walk.alone.trapDenied.stderr,
            asBlockedByTail({ event: 'PreToolUse', paths: [PATH_OF.block, PATH_OF.trap] }),
          ].join(''),
        );
      });

      then('the ask call exits 0 with one parseable json, its decision intact', () => {
        expect(walk.asked.code).toEqual(0);
        expect(JSON.parse(walk.asked.stdout)).toMatchObject({
          ...JSON.parse(walk.alone.json.stdout),
          hookSpecificOutput: { permissionDecision: 'ask' },
        });
      });

      then('the prompt lands each rule context, in manifest order', () => {
        expect(walk.talk.code).toEqual(0);
        expect(walk.talk.stdout).toEqual(
          [walk.alone.talkAllow.stdout, walk.alone.talkBoot.stdout].join(''),
        );
      });

      then('the stop is held by the rhx skill rule, its stderr byte for byte', () => {
        expect(walk.stop.code).toEqual(2);
        expect(walk.stop.stderr).toEqual(
          walk.alone.stopBlock.stderr + asBlockedByTail({ event: 'Stop', paths: [PATH_OF.block] }),
        );
      });

      then('the foreign stop rule still ran beside the blocker', () => {
        expect(readFileSync(tracePath, 'utf-8')).toMatch(
          /hooks\.dispatch\[\d+\] Stop · ran foreign, exit 0/,
        );
      });

      then('each event left one verdict line in the trace, in session order', () => {
        const verdicts = readFileSync(tracePath, 'utf-8')
          .split('\n')
          .filter((line) => / · \d+ ran(, \d+ skipped)? · exit \d+, /.test(line))
          .map((line) => line.replace(/, \d+\.\d{3}s$/, ''));
        expect(verdicts.map((line) => line.split(' ')[1])).toEqual([
          'SessionStart',
          'PreToolUse',
          'PreToolUse',
          'PreToolUse',
          'UserPromptSubmit',
          'Stop',
        ]);
      });

      then('each call names its own dispatcher pid, so six calls read as six', () => {
        const pids = readFileSync(tracePath, 'utf-8')
          .split('\n')
          .filter((line) => / · \d+ ran(, \d+ skipped)? · exit \d+, /.test(line))
          .map((line) => line.match(/^hooks\.dispatch\[(\d+)\] /)?.[1]);
        expect(new Set(pids).size).toEqual(6);
      });

      then('no per-call file outlives its call', () => {
        expect(
          readdirSync(tmp).filter((name) => name.startsWith('rhachet.hooks.dispatch.')),
        ).toEqual([]);
      });
    });

    when('[t27] many calls at once, each with one rule that ends at once', () => {
      // a child signaled before its first command runs the dispatcher's traps; the watchdog, stopped
      //   the moment the last rule ends, once removed the call's output files, so the merge read a
      //   refusal. the race needs many fast calls under load to show, hence the count
      const RUNS = 240;
      const PARALLEL = 24;
      const result = useBeforeAll(async () => {
        const tmp = genTempDir({ slug: 'hooks-dispatch-race-tmp' });
        writeFileSync(
          join(scene.cwd, '.claude', 'race.manifest'),
          asManifestOfCommands({
            rows: [{ event: 'PreToolUse', matcher: 'Bash', timeout: 5, command: 'echo ran' }],
          }),
        );
        const outcomes: Array<{ code: number; stdout: string; stderr: string }> = [];
        for (let start = 0; start < RUNS; start += PARALLEL) {
          const batch = Array.from({ length: Math.min(PARALLEL, RUNS - start) }, () =>
            runAsClaudeAsync({
              cwd: scene.cwd,
              command: 'bash ./node_modules/rhachet/bin/hooks.dispatch.sh .claude/race.manifest PreToolUse',
              payload: asPayloadBash('pwd'),
              env: { TMPDIR: tmp },
            }),
          );
          outcomes.push(...(await Promise.all(batch)));
        }
        return { outcomes, tmp };
      });

      then('every call returns the rule verdict, never a false refusal', () => {
        const deviants = result.outcomes.filter(
          (outcome) => outcome.code !== 0 || outcome.stdout !== 'ran\n' || outcome.stderr !== '',
        );
        expect(deviants).toEqual([]);
        expect(result.outcomes).toHaveLength(RUNS);
      });

      then('no per-call file outlives its call', () => {
        expect(
          readdirSync(result.tmp).filter((name) => name.startsWith('rhachet.hooks.dispatch.')),
        ).toEqual([]);
      });
    });
  });

  given(
    '[case2] a repo synced once, whose role then adds a row on a tool and an event no prior row named',
    () => {
      // each event is wired whole (`*`) at the first sync, so a later row needs no settings write
      const asRoleRegistry = (input: { hooks: string }): string => `
const getRoleRegistry = () => ({
  slug: 'test',
  readme: { uri: 'readme.md' },
  roles: [
    {
      slug: 'tester',
      name: 'Tester',
      purpose: 'test role whose hooks grow after the first sync',
      readme: { uri: 'roles/tester/readme.md' },
      traits: [],
      skills: { dirs: { uri: 'roles/tester/skills' }, refs: [] },
      briefs: { dirs: { uri: 'roles/tester/briefs' } },
      inits: { dirs: { uri: 'roles/tester/inits' } },
      hooks: { onBrain: ${input.hooks} },
    },
  ],
});
module.exports = { getRoleRegistry };
`;
      const HOOKS_FIRST = `{
        onTool: [{ command: 'echo "bash guard ran"', timeout: 'PT10S', filter: { what: 'Bash' } }],
      }`;
      const HOOKS_LATER = `{
        onTool: [
          { command: 'echo "bash guard ran"', timeout: 'PT10S', filter: { what: 'Bash' } },
          { command: 'echo "agent guard ran"', timeout: 'PT10S', filter: { what: 'Agent' } },
        ],
        onTalk: [{ command: 'echo "talk guard ran"', timeout: 'PT10S' }],
        onStop: [{ command: 'echo "stop guard ran"', timeout: 'PT10S' }],
        onBoot: [{ command: 'echo "boot guard ran"', timeout: 'PT10S' }],
      }`;
      const payloadBoot = JSON.stringify({ session_id: 'abc', hook_event_name: 'SessionStart', source: 'startup' });
      const payloadTalk = JSON.stringify({ session_id: 'abc', hook_event_name: 'UserPromptSubmit', prompt: 'hi' });
      const payloadStop = JSON.stringify({ session_id: 'abc', hook_event_name: 'Stop', stop_hook_active: false });

      const scene = useBeforeAll(async () => {
        const cwd = (await genTestTempRepo({ fixture: 'with-hook-dispatch' })).path;
        setRhachetLinkedInto({ cwd });
        const registryPath = join(cwd, 'node_modules/rhachet-roles-test/dist/index.js');
        const settingsPath = join(cwd, '.claude/settings.of.repo.json');
        const syncHooks = (input: { hooks: string; args: string[] }) => {
          writeFileSync(registryPath, asRoleRegistry({ hooks: input.hooks }));
          return invokeRhachetCliBinary({
            args: input.args,
            cwd,
            env: { HOME: genTempDir({ slug: 'hooks-dispatch-later-home' }) },
          });
        };

        // the first sync: one PreToolUse row on Bash, no row on any other event
        const initFirst = syncHooks({ hooks: HOOKS_FIRST, args: ['init', '--roles', 'tester', '--hooks'] });
        const settingsTextFirst = readFileSync(settingsPath, 'utf-8');
        const settings = JSON.parse(settingsTextFirst);
        const commandOf = (event: string): string => asHooksOfEvent({ settings, event })[0]!.command;
        const dispatch = (event: string, payload: string) =>
          runAsClaude({ cwd, command: commandOf(event), payload });

        // before the later rows land: the wires hold, and do naught where no row fits
        const before = {
          agent: dispatch('PreToolUse', asPayloadOfTool('Agent')),
          talk: dispatch('UserPromptSubmit', payloadTalk),
          stop: dispatch('Stop', payloadStop),
        };

        // the later sync: the role adds an Agent row and a talk row
        const initLater = syncHooks({ hooks: HOOKS_LATER, args: ['init', '--hooks'] });
        const settingsTextLater = readFileSync(settingsPath, 'utf-8');

        // after: the wires the first sync wrote run the later rows
        const after = {
          agent: dispatch('PreToolUse', asPayloadOfTool('Agent')),
          bash: dispatch('PreToolUse', asPayloadOfTool('Bash')),
          read: dispatch('PreToolUse', asPayloadOfTool('Read')),
          talk: dispatch('UserPromptSubmit', payloadTalk),
          stop: dispatch('Stop', payloadStop),
          boot: dispatch('SessionStart', payloadBoot),
        };

        // last: a corrupt manifest, met by a tool no row names
        const manifestRel = commandOf('PreToolUse')
          .split(' ')
          .find((word) => word.endsWith('/hooks.dispatch.manifest'));
        if (!manifestRel)
          throw new MalfunctionError('the dispatcher command names no manifest path', {
            command: commandOf('PreToolUse'),
            hint: 'read the init --hooks output; each dispatcher command should end `<manifest> <event>`',
          });
        writeFileSync(join(cwd, manifestRel), 'not a manifest\n');
        const corrupt = { agent: dispatch('PreToolUse', asPayloadOfTool('Agent')) };

        return { cwd, initFirst, initLater, settings, settingsTextFirst, settingsTextLater, before, after, corrupt };
      });

      then('the calls a human reads match the snapshot', () => {
        const asView = (call: { code: number | null; stdout: string; stderr: string }): string =>
          asCallView({
            code: call.code,
            stdout: call.stdout.split(scene.cwd).join('$CWD'),
            stderr: call.stderr.split(scene.cwd).join('$CWD'),
          });
        expect(
          [
            '=== before: a tool no row names, under the first wire ===',
            asView(scene.before.agent),
            '=== before: a talk with no talk row ===',
            asView(scene.before.talk),
            '=== before: a stop with no stop row ===',
            asView(scene.before.stop),
            '=== a later Agent row, under the first wire ===',
            asView(scene.after.agent),
            '=== the first Bash row, under the first wire ===',
            asView(scene.after.bash),
            '=== a Read call no row names ===',
            asView(scene.after.read),
            '=== a later talk row, under the first wire ===',
            asView(scene.after.talk),
            '=== a later stop row, under the first wire ===',
            asView(scene.after.stop),
            '=== a later boot row, under the first wire ===',
            asView(scene.after.boot),
            '=== a corrupt manifest, met by a tool no row names ===',
            asView(scene.corrupt.agent),
          ].join('\n'),
        ).toMatchSnapshot();
      });

      then('both syncs succeed', () => {
        expect(scene.initFirst.status).toEqual(0);
        expect(scene.initLater.status).toEqual(0);
      });

      then('the first sync wires every mapped event with one `*` dispatcher, rows or not', () => {
        const events = ['PreToolUse', 'SessionStart', 'Stop', 'UserPromptSubmit'];
        expect(Object.keys(scene.settings.hooks).sort()).toEqual(events);
        expect(
          events.map((event) => ({
            event,
            matchers: (scene.settings.hooks[event] as Array<{ matcher: string }>).map((entry) => entry.matcher),
            dispatchers: asHooksOfEvent({ settings: scene.settings, event }).length,
          })),
        ).toEqual(events.map((event) => ({ event, matchers: ['*'], dispatchers: 1 })));
      });

      when('[t0] a tool and an event no row names yet are called (vision case=3, case=5)', () => {
        then('each call exits 0 with no bytes: the wire is a no-op where no row fits', () => {
          for (const call of [scene.before.agent, scene.before.talk, scene.before.stop]) {
            expect(call).toEqual({ code: 0, stdout: '', stderr: '' });
          }
        });
      });

      when('[t1] the role adds an Agent row, a talk row, a stop row and a boot row, and the hooks sync again (vision case=1, case=2)', () => {
        then('the settings are byte-equal: the later rows need no settings write', () => {
          expect(scene.settingsTextLater).toEqual(scene.settingsTextFirst);
        });

        then('the wire the first sync wrote runs the new Agent row', () => {
          expect(scene.after.agent).toEqual({ code: 0, stdout: 'agent guard ran\n', stderr: '' });
        });

        then('the later sync names the rows it added, with no swap report (vision case=4 [t2], F9)', () => {
          expect(scene.initLater.stdout).toContain('test/tester → anthropic/claude/code: +4');
          expect(scene.initLater.stdout).toContain('4 created');
          expect(scene.initLater.stdout).not.toContain('🪝 hook dispatchers set');
        });

        then('the wire the first sync wrote runs the new talk row', () => {
          expect(scene.after.talk).toEqual({ code: 0, stdout: 'talk guard ran\n', stderr: '' });
        });

        then('the wires the first sync wrote run the new stop and boot rows', () => {
          expect(scene.after.stop).toEqual({ code: 0, stdout: 'stop guard ran\n', stderr: '' });
          expect(scene.after.boot).toEqual({ code: 0, stdout: 'boot guard ran\n', stderr: '' });
        });

        then('each row still runs only on the tools its own matcher names (vision case=3 [t1])', () => {
          expect(scene.after.bash).toEqual({ code: 0, stdout: 'bash guard ran\n', stderr: '' });
          expect(scene.after.read).toEqual({ code: 0, stdout: '', stderr: '' });
        });
      });

      when('[t2] the manifest turns corrupt, and a tool no row names is called (vision case=8)', () => {
        then('the call fails closed, and names the fix', () => {
          expect(scene.corrupt.agent.code).toEqual(2);
          expect(scene.corrupt.agent.stderr).toContain('✋ ConstraintError');
          expect(scene.corrupt.agent.stderr).toContain('rhx init --hooks');
        });
      });
    },
  );

  given(
    '[case3] an enrolled clone actor, whose role then adds a row on a tool no prior row named',
    () => {
      // the seats a human starts are clones: each holds its own settings and manifest, and the
      //   actor pass of a later sync must land the row there with no clone settings write
      const asRoleRegistry = (input: { hooks: string }): string => `
const asRole = (slug, hooks) => ({
  slug,
  name: slug,
  purpose: 'test role for the clone actor case',
  readme: { uri: 'roles/' + slug + '/readme.md' },
  traits: [],
  skills: { dirs: { uri: 'roles/' + slug + '/skills' }, refs: [] },
  briefs: { dirs: { uri: 'roles/' + slug + '/briefs' } },
  inits: { dirs: { uri: 'roles/' + slug + '/inits' } },
  hooks: { onBrain: hooks },
});
const getRoleRegistry = () => ({
  slug: 'test',
  readme: { uri: 'readme.md' },
  roles: [asRole('tester', ${input.hooks}), asRole('helper', {})],
});
module.exports = { getRoleRegistry };
`;
      const HOOKS_FIRST = `{
        onTool: [{ command: 'echo "bash guard ran"', timeout: 'PT10S', filter: { what: 'Bash' } }],
      }`;
      const HOOKS_LATER = `{
        onTool: [
          { command: 'echo "bash guard ran"', timeout: 'PT10S', filter: { what: 'Bash' } },
          { command: 'echo "agent guard ran"', timeout: 'PT10S', filter: { what: 'Agent' } },
        ],
      }`;

      const scene = useBeforeAll(async () => {
        const cwd = (await genTestTempRepo({ fixture: 'with-hook-dispatch' })).path;
        setRhachetLinkedInto({ cwd });
        const packageDir = join(cwd, 'node_modules/rhachet-roles-test');
        for (const sub of ['skills', 'briefs', 'inits'])
          mkdirSync(join(packageDir, 'roles/helper', sub), { recursive: true });
        writeFileSync(join(packageDir, 'roles/helper/readme.md'), '# helper\n');
        writeFileSync(join(packageDir, 'roles/helper/briefs/helper.brief.md'), '# helper brief\n');
        const manifestPath = join(packageDir, 'rhachet.repo.yml');
        writeFileSync(
          manifestPath,
          readFileSync(manifestPath, 'utf-8') +
            [
              '  - slug: helper',
              '    name: helper',
              '    purpose: a second role, so a roleset without it lands in its own hash actor',
              '    readme: roles/helper/readme.md',
              '    briefs:',
              '      dirs: roles/helper/briefs',
              '    skills:',
              '      dirs: roles/helper/skills',
              '    inits:',
              '      dirs: roles/helper/inits',
              '',
            ].join('\n'),
        );
        const registryPath = join(packageDir, 'dist/index.js');
        const home = genTempDir({ slug: 'hooks-dispatch-clone-home' });
        const env = { HOME: home, PATH: setupStubBrainPath({ dir: cwd }) };
        const syncHooks = (input: { hooks: string; args: string[] }) => {
          writeFileSync(registryPath, asRoleRegistry({ hooks: input.hooks }));
          return invokeRhachetCliBinary({ args: input.args, cwd, env });
        };

        // the first sync links both roles; then a clone actor enrolls with the tester role alone
        const initFirst = syncHooks({ hooks: HOOKS_FIRST, args: ['init', '--roles', 'tester', 'helper', '--hooks'] });
        const enroll = invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '-helper'],
          cwd,
          env,
          logOnError: false,
        });
        const actorsRoot = join(cwd, '.agent/.actors');
        const actorDirs = readdirSync(actorsRoot).filter((name) => name.startsWith('actor.via.hash='));
        if (actorDirs.length !== 1)
          throw new MalfunctionError('the enroll did not land in exactly one hash actor', {
            actorDirs,
            stderr: enroll.stderr,
            hint: 'a `-helper` roleset differs from the ambient one, so it should land in its own hash actor',
          });
        const settingsPath = join(actorsRoot, actorDirs[0]!, 'brain/.claude/settings.of.repo.json');
        const settingsTextFirst = readFileSync(settingsPath, 'utf-8');
        const settings = JSON.parse(settingsTextFirst);
        const commandOf = (event: string): string => asHooksOfEvent({ settings, event })[0]!.command;
        const dispatch = (event: string, payload: string) =>
          runAsClaude({ cwd, command: commandOf(event), payload });
        const payloadStop = JSON.stringify({ session_id: 'abc', hook_event_name: 'Stop', stop_hook_active: false });
        const before = {
          agent: dispatch('PreToolUse', asPayloadOfTool('Agent')),
          stop: dispatch('Stop', payloadStop),
        };

        // the later sync: the role adds an Agent row; the actor pass re-derives the clone manifest
        const initLater = syncHooks({ hooks: HOOKS_LATER, args: ['init', '--hooks'] });
        const settingsTextLater = readFileSync(settingsPath, 'utf-8');
        const after = {
          agent: dispatch('PreToolUse', asPayloadOfTool('Agent')),
          bash: dispatch('PreToolUse', asPayloadOfTool('Bash')),
          read: dispatch('PreToolUse', asPayloadOfTool('Read')),
          stop: dispatch('Stop', payloadStop),
        };

        return { cwd, initFirst, enroll, initLater, settings, settingsTextFirst, settingsTextLater, before, after };
      });

      then('the clone calls a human reads match the snapshot', () => {
        const asView = (call: { code: number | null; stdout: string; stderr: string }): string =>
          asCallView({
            code: call.code,
            stdout: call.stdout.split(scene.cwd).join('$CWD'),
            stderr: call.stderr.split(scene.cwd).join('$CWD'),
          });
        expect(
          [
            '=== a later Agent row, under the clone wire ===',
            asView(scene.after.agent),
            '=== a Bash call, under the clone wire ===',
            asView(scene.after.bash),
            '=== a Stop, under the clone wire, with no stop row ===',
            asView(scene.after.stop),
          ].join('\n'),
        ).toMatchSnapshot();
      });

      then('the syncs and the enroll succeed', () => {
        expect(scene.initFirst.status).toEqual(0);
        expect(scene.enroll.status).toEqual(0);
        expect(scene.initLater.status).toEqual(0);
      });

      then('the clone actor holds one `*` wire per mapped event, named at its own manifest', () => {
        const events = ['PreToolUse', 'SessionStart', 'Stop', 'UserPromptSubmit'];
        expect(Object.keys(scene.settings.hooks).sort()).toEqual(events);
        for (const event of events) {
          const hooks = asHooksOfEvent({ settings: scene.settings, event });
          expect(hooks.length).toEqual(1);
          expect(hooks[0]!.command).toContain('.agent/.actors/actor.via.hash=');
        }
      });

      when('[t0] the clone calls a tool no row names yet, and stops (vision case=5)', () => {
        then('each call exits 0 with no bytes', () => {
          expect(scene.before.agent).toEqual({ code: 0, stdout: '', stderr: '' });
          expect(scene.before.stop).toEqual({ code: 0, stdout: '', stderr: '' });
        });
      });

      when('[t1] the role adds an Agent row, and the hooks sync again', () => {
        then('the clone settings are byte-equal: the later row needs no clone settings write', () => {
          expect(scene.settingsTextLater).toEqual(scene.settingsTextFirst);
        });

        then('the wire the clone was enrolled with runs the new Agent row', () => {
          expect(scene.after.agent).toEqual({ code: 0, stdout: 'agent guard ran\n', stderr: '' });
        });

        then('each row still runs only on the tools its own matcher names', () => {
          expect(scene.after.bash).toEqual({ code: 0, stdout: 'bash guard ran\n', stderr: '' });
          expect(scene.after.read).toEqual({ code: 0, stdout: '', stderr: '' });
        });

        then('the clone still stops quietly: its manifest holds no stop row', () => {
          expect(scene.after.stop).toEqual({ code: 0, stdout: '', stderr: '' });
        });
      });
    },
  );

  given('[case4] a role whose PreToolUse row runs slower than the wire floor', () => {
    // a 90s rule: the PreToolUse wire must rise to 95s, so claude never kills the dispatcher first
    const REGISTRY_SLOW = `
const getRoleRegistry = () => ({
  slug: 'test',
  readme: { uri: 'readme.md' },
  roles: [
    {
      slug: 'tester',
      name: 'Tester',
      purpose: 'test role with one slow hook',
      readme: { uri: 'roles/tester/readme.md' },
      traits: [],
      skills: { dirs: { uri: 'roles/tester/skills' }, refs: [] },
      briefs: { dirs: { uri: 'roles/tester/briefs' } },
      inits: { dirs: { uri: 'roles/tester/inits' } },
      hooks: {
        onBrain: {
          onTool: [{ command: 'echo "slow guard ran"', timeout: 'PT90S', filter: { what: 'Bash' } }],
        },
      },
    },
  ],
});
module.exports = { getRoleRegistry };
`;

    const scene = useBeforeAll(async () => {
      const cwd = (await genTestTempRepo({ fixture: 'with-hook-dispatch' })).path;
      setRhachetLinkedInto({ cwd });
      writeFileSync(join(cwd, 'node_modules/rhachet-roles-test/dist/index.js'), REGISTRY_SLOW);
      const init = invokeRhachetCliBinary({
        args: ['init', '--roles', 'tester', '--hooks'],
        cwd,
        env: { HOME: genTempDir({ slug: 'hooks-dispatch-slow-home' }) },
      });
      const settings = JSON.parse(readFileSync(join(cwd, '.claude/settings.of.repo.json'), 'utf-8'));
      return { init, settings };
    });

    when('[t0] the hooks sync', () => {
      then('the sync succeeds', () => {
        expect(scene.init.status).toEqual(0);
      });

      then('only the slow event wire rises above the floor, by the margin', () => {
        const timeoutsByEvent = Object.fromEntries(
          ['SessionStart', 'PreToolUse', 'UserPromptSubmit', 'Stop'].map((event) => [
            event,
            // this fixture's test brain writes the timeout as an iso-duration shape
            (scene.settings.hooks[event] as Array<{ hooks: Array<{ timeout: { seconds: number } }> }>).map(
              (entry) => entry.hooks.map((hook) => hook.timeout.seconds),
            ),
          ]),
        );
        expect(timeoutsByEvent).toEqual({
          SessionStart: [[65]],
          PreToolUse: [[95]],
          UserPromptSubmit: [[65]],
          Stop: [[65]],
        });
      });

      then('the settings a human reads match the snapshot', () => {
        expect(JSON.stringify(scene.settings.hooks, null, 2)).toMatchSnapshot();
      });
    });
  });
});
