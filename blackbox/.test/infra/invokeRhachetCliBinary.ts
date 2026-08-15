import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
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
      // strip absolute file paths in stack traces (vary by machine)
      .replace(
        /\/(?:home\/[^/]+|Users\/[^/]+|runner\/work)\/[^)\s]+/g,
        '/PATH_STRIPPED',
      )
      // strip temp test repo paths (vary by run)
      .replace(/\/tmp\/rhachet-test-[a-z0-9-]+/g, '/TMP_REPO')
      // strip ISO timestamps (vary by run). the millis are OPTIONAL: iso-time's
      // now() omits `.000` when the instant lands on a whole second, so a spawn on
      // an exact second renders `…30Z` (no millis) — the mask must catch both forms
      // or the clone-list `since=` snapshot flakes ~1-in-1000 (rule.require.clamp-edge-cases)
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z/g, '__TIMESTAMP__')
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
  const mergedEnv = { ...process.env, ...input.env };
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
  const mergedEnv = { ...process.env, ...input.env };
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
