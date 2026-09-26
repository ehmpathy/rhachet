import { spawn, spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * .what = strip machine-specific content from CLI output for snapshots
 * .why = paths and pids vary by machine — strip them so snapshots work across environments
 */
export const asSnapshotSafe = (output: string): string => {
  return (
    output
      // strip ansi escape sequences (color/dim codes) — terminal render noise that must
      // not leak into a snapshot; a snapshot captures the text a human reads, not the
      // control bytes that style it
      // biome-ignore lint/suspicious/noControlCharactersInRegex: the ansi-escape pattern needs the esc control char
      .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
      // strip daemon spawn messages (pids vary)
      .replace(/\[keyrack-daemon\] spawned background daemon \(pid: \d+\)\n?/g, '')
      // strip absolute file paths (vary by machine)
      //
      // ⚠️ the tail class is the whole contract here: it decides where the path ENDS, and
      //   a mask that over-consumes silently eats the delimiter that proved the value
      //   closed. the three terminators are one per context the mask actually meets:
      //
      //   | context | how the path ends | terminator |
      //   |---|---|---|
      //   | a stack frame | `at fn (/home/u/f.ts:1:2)` | `)` |
      //   | prose | `loaded from /home/u/rhx — compare` | whitespace |
      //   | a JSON value | `"realpath": "/home/u/rhx",` | `"` |
      //
      // 🚨 .why `"` is in the class = it was NOT, and the docblock said so — this mask read
      //   *"strip absolute file paths in stack traces"*, and `)` + whitespace are complete
      //   for a stack trace. then a path arrived as a whole METADATA VALUE, where the
      //   terminator is a quote, so the mask consumed `rhx",` and rendered
      //   `"rhachetRealpath": "/PATH_STRIPPED` — an unclosed string, in a block a reader
      //   scans as json. the producer emitted valid json; the MASK broke it, and the
      //   snapshot blamed the producer (`rule.forbid.snapshot-visual-blemishes`).
      //
      // ⚠️ `,` is deliberately NOT a terminator — a comma is legal in a path, and the `"`
      //   already bounds every json value. to add it would trade a real defect for a
      //   speculative one
      // strip the HUMAN'S OWN home `.claude` dir to a token that names its root, and do
      // it BEFORE the generic host-path mask below.
      //
      // ⚠️ .why it is not left to the generic mask: `/PATH_STRIPPED` is a catch-all the
      //   generic mask stamps on any host path, and it names no root. an enroll config's
      //   `claudeMdExcludes` array renders five entries rooted at `/TMP_TEST_DIR/...` and
      //   one bare `/PATH_STRIPPED` between them — so a reader who scans the locked array
      //   cannot tell "a genuinely different root, correctly masked" from "one per-run
      //   root stamped two ways" without a read of the source. that is the vibecheck a
      //   contract snapshot exists to serve (`rule.require.contract-snapshot-exhaustiveness`),
      //   and one vocabulary per concept is what restores it (`rule.forbid.ambiguous-labels`).
      //
      // the mask is anchored on the literal `.claude` segment, so it reaches ONLY the
      // human's own claude config root. every other host path still falls through to the
      // generic mask below, where the catch-all token is the right answer — the path is
      // incidental there, and a token that named a root would over-claim.
      .replace(
        /\/(?:home\/[^/]+|Users\/[^/]+)\/\.claude\/([^)\s"]+)/g,
        '/HOME_DIR/.claude/$1',
      )
      .replace(
        /\/(?:home\/[^/]+|Users\/[^/]+|runner\/work)\/[^)\s"]+/g,
        '/PATH_STRIPPED',
      )
      // strip temp test repo paths (vary by run)
      .replace(/\/tmp\/rhachet-test-[a-z0-9-]+/g, '/TMP_REPO')
      // strip a `genTempDir` root. its shape is fixed by test-fns —
      // `/tmp/test-fns/<repo-dirname>/.temp/<stamp>.<slug>.<8hex>` — and BOTH of its
      // variable segments move: the repo-dirname differs per checkout (a worktree
      // carries its own basename), and the run segment carries a fresh stamp plus a
      // fresh uuid prefix on every single spawn.
      //
      // ⚠️ the peer masks above cannot reach it. the home/Users/runner-work pattern is
      //   anchored elsewhere in the filesystem, and the iso-stamp mask demands COLONS —
      //   test-fns writes the stamp with dashes so the name is filesystem-safe. so this
      //   root went unmasked, and stayed invisible only while the render redacted the
      //   metadata that carries it. with the payload rendered, it reaches the snapshots
      //
      // the mask is anchored on both literal segments and bounded by the 8-hex tail, so
      // it cannot over-consume into the RELATIVE path that follows — and that path is the
      // part a reader is owed, since it names which file the report is about
      .replace(
        /\/tmp\/test-fns\/[^/\s]+\/\.temp\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z\.[^/\s]*\.[0-9a-f]{8}/gi,
        '/TMP_TEST_DIR',
      )
      // strip the say debug log's calendar day (`debug.2026-09-16.log`). the ISO mask
      // below cannot reach it — that one demands COLONS, and a filename-safe day carries
      // dashes only. the mask keeps the `debug.` / `.log` literals, so the snapshot still
      // proves WHICH artifact the envelope names, and only the day floats
      .replace(/debug\.\d{4}-\d{2}-\d{2}\.log/g, 'debug.__DATE__.log')
      // strip a boot census char count. it sums every linked role's rendered corpus, so
      // any role package bump moves it; the role count beside it stays, since that is
      // the part a reader checks
      .replace(/(\d+ roles?, )\d+ chars/g, '$1__CHARS__ chars')
      // strip ISO timestamps (vary by run). the millis are OPTIONAL: iso-time's
      // now() omits `.000` when the instant lands on a whole second, so a spawn on
      // an exact second renders `…30Z` (no millis) — the mask must catch both forms
      // or the clone-list `since=` snapshot flakes ~1-in-1000 (rule.require.clamp-edge-cases)
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z/g, '__TIMESTAMP__')
      // strip the stamp in a `.bak` filename. the mask above demands COLONS, and a
      // filename cannot carry one — the backup a role init writes is
      // `settings.2026-09-25T17-41-02Z.bak.json`, dashes throughout — so the stamp
      // reached the snapshots raw and every brain-dir tree that reports a moved backup
      // was flaky by construction (`rule.require.clamp-edge-cases`)
      //
      // `$STAMP` is the token `src/contract/cli/invokeInit.integration.test.ts` already
      // uses for this exact concept — ONE vocabulary per concept, so a reader of either
      // snapshot set never has to ask whether the two placeholders mean one value
      //
      // the lookahead anchors on `.bak.`, so the mask cannot reach a stamp that is not a
      // backup name — a `since=` field, a transcript name, an enrollment log line
      .replace(
        /\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(\.\d{3})?Z(?=\.bak\.)/g,
        '$STAMP',
      )
      // strip a clone socket path (host-scoped, varies by run) BEFORE the serial
      // mask, so the whole `.sock` token collapses to one stable placeholder
      .replace(/\S*clone\.[0-9a-f-]+\.[0-9a-f]+\.sock/gi, '__SOCKET__')
      // strip a clone serial (a uuid — varies every spawn). the actor hash is a
      // 64-char sha256 (a different shape) and stays UNMASKED — it is deterministic
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '__SERIAL__',
      )
      // strip an ABBREVIATED clone serial (the 8-hex prefix + `…`) — a legacy render
      // form. the actor hash abbreviates to 7 hex + `…` (a shorter shape), so this
      // 8-hex-before-ellipsis mask never touches the deterministic actor hash
      .replace(/[0-9a-f]{8}…/gi, '__SERIAL8__…')
      // strip the `serial=<8hex>` field `clone list` shows for a NAMED clone (the
      // human short form, asCloneSerialHuman — the first uuid segment, so it varies
      // every spawn). the actor line carries no `serial=`, so this is serial-only
      .replace(/serial=[0-9a-f]{8}\b/gi, 'serial=__SERIAL8__')
      // strip the `@:<8hex>` short ADDRESS `clone list` shows for an UNNAMED clone. the
      // lookahead bounds it to exactly 8 hex as the whole token, so a full serial (already
      // masked to `@:__SERIAL__` above) and a slug like `@:driver` are never touched
      .replace(/@:[0-9a-f]{8}(?=\s|$)/gi, '@:__SERIAL8__')
      // strip the `clone get` relative-time offset (`T0+HHhMM`) — the wall-clock gap
      // between turns varies by run (a say + reply may straddle a minute boundary), so
      // the offset is masked; a functional assert checks the `T0+\d\dH\d\dM` FORMAT
      .replace(/T0\+\d{2}H\d{2}M/g, 'T0+__ELAPSED__')
  );
};

/**
 * .what = strip pty noise from a guided-prompt run's stdout, then trim to the tree header
 * .why = a guided `keyrack set` runs under a real pty so it can answer hidden prompts, and
 *        a pty emits control bytes and echoes the caller's own keystrokes. snapped raw, a
 *        snapshot captures terminal mechanics rather than the text a human reads
 *
 * .note = each strip is here because a pty produces it, and the reason belongs in ONE place
 *         rather than re-derived at each call site:
 *          - ansi   → color/cursor codes the tty writes around the text
 *          - osc    → the title/hyperlink sequences some shells emit
 *          - `\r`   → a pty ends lines `\r\n`; the `\r` would show as a diff artifact
 *          - `·`    → the pty renders some spaces as middle dots
 *          - eol pad → the pty pads to the terminal width, which varies by the runner.
 *                      `[ \t]` and NOT `\s`: `\s` matches `\n`, so a run of newlines at an
 *                      eol boundary matched as one blob and collapsed — which erased every
 *                      blank line a command deliberately emits between its sections. a pad
 *                      is spaces and tabs; it can never be a newline
 *          - pid    → the daemon announces its own spawn, and a pid varies per run
 *          - spawn  → the daemon's own spawn notice. it is written to STDERR by design, so
 *                     stdout stays parseable for `--json` (startKeyrackDaemon.ts). only a
 *                     PTY case sees it at all, because only a PTY merges the two streams
 *                     into one transcript — and its POSITION in that merged transcript
 *                     depends on which stream flushes first, so a snapshot that keeps the
 *                     line pins a runtime race rather than a contract. that is a latent
 *                     FLAKE, not merely a visual blemish. every non-PTY case already drops
 *                     it via `asSnapshotSafe`; this makes the two agree
 * .note = the trim to `🔐` drops the pty's echo of the command line itself, which precedes
 *         the tree. an absent glyph falls back to the whole string rather than to an empty
 *         one, so a run that failed BEFORE the tree still snaps its output instead of a
 *         blank — a silent empty snapshot would read as a pass (`rule.forbid.failhide`)
 */
export const asPtySnapshotSafe = (output: string): string => {
  const stripped = output
    // biome-ignore lint/suspicious/noControlCharactersInRegex: the ansi-escape pattern needs the esc control char
    .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
    // biome-ignore lint/suspicious/noControlCharactersInRegex: the osc pattern needs the esc control char
    .replace(/\x1B\]/g, '')
    .replace(/\r/g, '')
    .replace(/·/g, '')
    // drop the daemon spawn notice BEFORE the pid redaction — the notice carries a pid of
    // its own, so the order decides whether the line vanishes or leaves a redacted stub
    .replace(/\[keyrack-daemon\] spawned background daemon \(pid: \d+\)\n?/g, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\(pid: \d+\)/g, '(pid: __PID__)');
  const treeStart = stripped.indexOf('\u{1F510}');
  return stripped.slice(treeStart >= 0 ? treeStart : 0).trim();
};

/**
 * .what = parse a `keyrack status --json` payload and blank the fields that vary per run
 * .why = a status payload carries THREE volatile fields, and every one of them will differ
 *        on the next run: a live `ttlLeftMs` countdown, a per-daemon `socketPath` hash, and
 *        the wall-clock stamps. snapped raw, such a snapshot is green exactly once — on the
 *        run that wrote it — and red for everyone after, which is a flake shipped as a clamp
 *
 * .note = ⚠️ `--resnap` CANNOT catch this, and that is why the helper exists rather than a
 *         convention. resnap writes what it just saw, so an immediate re-run compares a
 *         volatile value against itself and passes. only a SECOND, independent run diverges
 * .note = `asSnapshotSafe` does not cover these. it strips iso stamps, but `ttlLeftMs` is a
 *         bare integer, and the socket lives under `/run/user/...`, which its path pattern
 *         (home / Users / runner-work) does not reach
 * .note = the redaction reads a PARSED OBJECT rather than scrubs a string, so a field rename
 *         cannot silently stop the redaction — an absent key shows up as a visible diff
 */
export const asKeyrackStatusSnapshotSafe = (input: {
  stdout: string;
}): Record<string, unknown> => {
  const parsed = JSON.parse(input.stdout);
  parsed.socketPath = '__REDACTED__';
  for (const key of parsed.keys ?? []) {
    key.expiresAt = '__REDACTED__';
    key.ttlLeftMs = '__REDACTED__';
  }
  for (const recipient of parsed.recipients ?? []) {
    recipient.addedAt = '__REDACTED__';
  }
  return parsed;
};

/**
 * .what = the inherited env, with every trace of the RUNNER's own clone membership
 *   stripped out
 *
 * .why =
 *   - a blackbox test declares its own axes. whether the CLI is invoked BY A CLONE is
 *     one of them, and `{...process.env}` silently answers it from whoever happened to
 *     run the suite — so the same file returns a different verdict on ci (a human's
 *     shell, no clone vars) than in a clone's shell, which is the exact divergence
 *     `rule.require.hermetic-tests` forbids
 *   - `isCloneEnrollAttended` reads `CLONE_ENV_KEYS.serial` to decide whether a socket
 *     stands up, so a leaked serial flips `socketEligible` on four extant enroll
 *     assertions whose own comments read "no tty under spawnSync → no socket"
 *
 * .note = a test that WANTS the clone axis sets it back through the `env` option,
 *   which merges after this strip. `[case1]`/`[case2]` of the depth budget do exactly
 *   that, which is what makes the axis explicit instead of ambient
 *
 * .note = exported because the OUTER-pty spawner needs the identical strip. that one
 *   runs `rhx enroll` on a real tty, so `attended` is true by its tty leg and the
 *   serial leak is inert there — but `RHACHET_CLONE_DEPTH` is not: inherited from a
 *   depth-1 runner it spends the budget before the enroll starts, and every pty-backed
 *   reach test fails with `depth budget spent`. same divergence, a different var
 */
export const asEnvWithoutCloneIdentity = (
  env: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv => {
  const {
    RHACHET_CLONE_SERIAL: _serial,
    RHACHET_CLONE_SOCKET: _socket,
    RHACHET_CLONE_DEPTH: _depth,
    ...rest
  } = env;
  return rest;
};

/**
 * .what = paths to CLI binaries
 * .why = acceptance tests invoke compiled binaries for black-box test
 */
const RHACHET_BIN = resolve(__dirname, '../../../bin/run');
const RHX_BIN = resolve(__dirname, '../../../bin/rhx');

/**
 * .what = invokes the compiled rhachet or rhx CLI binary
 * .why = enables true black-box acceptance test against the built artifact
 */
export const invokeRhachetCliBinary = (input: {
  /** which binary to invoke (default: 'rhachet') */
  binary?: 'rhachet' | 'rhx';
  /** CLI args after the binary name (e.g., ['run', '--skill', 'foo'] for rhachet, ['foo'] for rhx) */
  args: string[];
  /** cwd for the command */
  cwd: string;
  /** optional stdin data to pipe */
  stdin?: string;
  /** whether to log output on failure (default: true) */
  logOnError?: boolean;
  /** optional env vars to merge with process.env */
  env?: Record<string, string | undefined>;
  /** optional wall-clock cap (ms); a child past it is SIGKILLed so a hang surfaces as a failed
   *  result (with its captured output) instead of a spawnSync block that stalls the whole suite */
  timeoutMs?: number;
}): SpawnSyncReturns<string> => {
  const binPath = input.binary === 'rhx' ? RHX_BIN : RHACHET_BIN;

  // merge env vars, filter out undefined to unset inherited vars
  const mergedEnv = { ...asEnvWithoutCloneIdentity(process.env), ...input.env };
  // .note = deliberate cast: the filter above removes every undefined value, so the
  //   object is a plain { [key: string]: string } — but Object.fromEntries widens the
  //   value type back to `string | undefined`, which NodeJS.ProcessEnv already permits.
  //   the runtime filter guarantees no undefined survives, so the cast only re-narrows
  //   the compile-time type to what the value already is. removal path: drops when a
  //   typed fromEntries utility lands (rule.forbid.as-cast, test boundary)
  const envFiltered = Object.fromEntries(
    Object.entries(mergedEnv).filter(([, v]) => v !== undefined),
  ) as NodeJS.ProcessEnv;

  const result = spawnSync(binPath, input.args, {
    cwd: input.cwd,
    input: input.stdin,
    encoding: 'utf-8',
    // shell mode removed: args with spaces (like pubkeys) were split by bash
    // absolute binPath doesn't need shell for PATH resolution
    env: envFiltered,
    ...(input.timeoutMs
      ? { timeout: input.timeoutMs, killSignal: 'SIGKILL' as const }
      : {}),
  });

  // log output for debug on failure
  const shouldLog = input.logOnError ?? true;
  if (shouldLog && result.status !== 0) {
    console.error('stderr:', result.stderr);
    console.error('stdout:', result.stdout);
  }

  return result;
};

/**
 * .what = invokes the compiled rhachet CLI binary WITHOUT a block of the event loop
 * .why = a test that holds a live pty (`spawnRhachetCliBackground`) is that pty's ONLY
 *   reader, and it reads only when its event loop turns. a `spawnSync` freezes the loop,
 *   so the pty goes undrained for the whole call. the enrolled clone mirrors its brain's
 *   screen into that pty with a SYNCHRONOUS tty write, so once the kernel buffer fills the
 *   clone's own event loop blocks too — and its socket server can no longer ack a `say`.
 *   the say then waits out its 30s wedge window, exits 2, and only THEN does the loop
 *   resume, drain the pty, and let the clone deliver the message it held. a test-made
 *   deadlock that reads as a product wedge
 *
 * .note = a human's terminal always drains, so this is a harness defect, never a product
 *   one. a call made while a background pty is live uses this twin, never the sync one
 */
export const invokeRhachetCliBinaryAsync = (input: {
  /** CLI args after the binary name */
  args: string[];
  /** cwd for the command */
  cwd: string;
  /** optional stdin data to pipe */
  stdin?: string;
  /** optional env vars to merge with process.env; undefined unsets an inherited var */
  env?: Record<string, string | undefined>;
  /** whether to log output on failure (default: true), as the sync twin does */
  logOnError?: boolean;
}): Promise<{ status: number | null; stdout: string; stderr: string }> => {
  // merge env, drop undefined so a test can unset an inherited var
  const mergedEnv = { ...process.env, ...input.env };
  const envFiltered = Object.fromEntries(
    Object.entries(mergedEnv).filter(([, v]) => v !== undefined),
  ) as NodeJS.ProcessEnv;

  return new Promise((done, fail) => {
    const child = spawn(RHACHET_BIN, input.args, {
      cwd: input.cwd,
      env: envFiltered,
    });

    // .note = deliberate mutation — a child streams its output over time, so the two
    //   buffers accumulate as chunks arrive; both are local to this promise
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString('utf-8')));
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString('utf-8')));
    child.once('error', fail);
    child.once('close', (status) => {
      // log output for debug on failure, as the sync twin does
      if ((input.logOnError ?? true) && status !== 0) {
        console.error('stderr:', stderr);
        console.error('stdout:', stdout);
      }
      done({ status, stdout, stderr });
    });

    // pipe stdin when given, then close it so a `@stdin` read sees its EOF
    if (input.stdin !== undefined) child.stdin.write(input.stdin);
    child.stdin.end();
  });
};

/**
 * .what = invokes multiple CLI commands chained with &&
 * .why = enables test of commands that need to share shell state
 *
 * .note = returns stdout/stderr of the last command only (prior commands redirect to /dev/null)
 */
export const invokeRhachetCliBinaryChain = (input: {
  /** which binary to invoke (default: 'rhachet') */
  binary?: 'rhachet' | 'rhx';
  /** array of arg arrays, each executed in sequence with && */
  argsChain: string[][];
  /** cwd for the command */
  cwd: string;
  /** whether to log output on failure (default: true) */
  logOnError?: boolean;
  /** optional env vars to merge with process.env */
  env?: Record<string, string | undefined>;
}): SpawnSyncReturns<string> => {
  const binPath = input.binary === 'rhx' ? RHX_BIN : RHACHET_BIN;

  // build the chained command string (redirect all but last to /dev/null)
  const commands = input.argsChain.map((args, i) => {
    const cmd = `"${binPath}" ${args.map((a) => `"${a}"`).join(' ')}`;
    // redirect stdout to /dev/null for all but the last command
    return i < input.argsChain.length - 1 ? `${cmd} > /dev/null` : cmd;
  });
  const chainedCommand = commands.join(' && ');

  // merge env vars, filter out undefined to unset inherited vars
  const mergedEnv = { ...asEnvWithoutCloneIdentity(process.env), ...input.env };
  // .note = deliberate cast: the filter above removes every undefined value, so the
  //   object is a plain { [key: string]: string } — but Object.fromEntries widens the
  //   value type back to `string | undefined`, which NodeJS.ProcessEnv already permits.
  //   the runtime filter guarantees no undefined survives, so the cast only re-narrows
  //   the compile-time type to what the value already is. removal path: drops when a
  //   typed fromEntries utility lands (rule.forbid.as-cast, test boundary)
  const envFiltered = Object.fromEntries(
    Object.entries(mergedEnv).filter(([, v]) => v !== undefined),
  ) as NodeJS.ProcessEnv;

  const result = spawnSync('bash', ['-c', chainedCommand], {
    cwd: input.cwd,
    encoding: 'utf-8',
    env: envFiltered,
  });

  // log output for debug on failure
  const shouldLog = input.logOnError ?? true;
  if (shouldLog && result.status !== 0) {
    console.error('stderr:', result.stderr);
    console.error('stdout:', result.stdout);
  }

  return result;
};

/**
 * .what = asSnapshotSafe, minus the one enroll line that depends on the host's claude login
 * .why = enroll prints `ℹ no claude credential to link …` only on a host with no login, so
 *   a snapshot of enroll stderr differs between a dev box and ci. the line is its own
 *   concern, clamped where the journey pins a HOME with no credential; elsewhere it is
 *   host noise
 */
export const asSnapshotSafeOfHostLogin = (output: string): string =>
  asSnapshotSafe(output).replace(/^ℹ no claude credential to link into .*\n?/gm, '');
