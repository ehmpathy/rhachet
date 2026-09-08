import { ConstraintError } from 'helpful-errors';

import { invokeRhachetCliBinary } from './invokeRhachetCliBinary';
import { setupRoleFixtureRepo } from './roleFixtureRepo';
import {
  spawnRhachetCliBackground,
  type RhachetBackgroundHandle,
} from './spawnRhachetCliBackground';

import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';

/**
 * .what = shared harness for clone-reach acceptance tests — link roles, shim a
 *   `claude` that execs the rich stub brain, and enroll a clone through a real pty
 * .why =
 *   - the socket only stands up on an interactive tty, so every reach test must
 *     enroll through the OUTER pty (spawnRhachetCliBackground). that setup is
 *     identical across clone/actor/journey acceptance files — one home for it, per
 *     rule.require.shared-test-fixtures
 *   - the rich stub is a REAL child (never a mock): it stays alive, replies with a
 *     transformed ack, and writes a claude-shaped transcript, so say/get are proven
 *     end to end
 */

// the rich stub brain — stays alive, transforms `poke <n>` → `ack:<n>`, writes a
// claude-shaped transcript so `get` has real output to read
export const STUB_BRAIN = join(
  __dirname,
  '../../../src/.test/assets/stubBrainCli.cjs',
);

/**
 * .what = link a known role set so enroll's default roleset is non-empty
 */
export const setupEnrollFixture = (input: { dir: string }): void => {
  setupRoleFixtureRepo({ dir: input.dir });
  invokeRhachetCliBinary({
    args: ['init', '--roles', 'mechanic', 'architect', 'driver'],
    cwd: input.dir,
  });
};

/**
 * .what = write a `claude` shim that execs the rich stub, return a PATH that finds
 *   it first
 * .why = enroll spawns the brain by its command name (`claude`); the shim makes the
 *   stub answer to that name so the whole reach path runs against a real child
 */
export const setupRichStubBrainPath = (input: { dir: string }): string => {
  const binDir = join(input.dir, '.stub-bin');
  mkdirSync(binDir, { recursive: true });
  const shimPath = join(binDir, 'claude');
  writeFileSync(
    shimPath,
    `#!/usr/bin/env bash\nexec "${process.execPath}" "${STUB_BRAIN}" "$@"\n`,
    'utf-8',
  );
  chmodSync(shimPath, 0o755);
  return `${binDir}:${process.env.PATH ?? ''}`;
};

/**
 * .what = enroll a clone through the outer pty and wait for the stub's ready line
 * .why = the one setup every reach test shares — spawn `rhx enroll` under a pty (so
 *   the socket stands up), then block until the stub announces `ready serial=<uuid>`.
 *   yields the live background handle + the clone's serial
 */
export const enrollCloneAndWaitReady = async (input: {
  dir: string;
  env: Record<string, string | undefined>;
  as?: string;
  extraArgs?: string[];
  timeoutMs?: number;
}): Promise<{ bg: RhachetBackgroundHandle; serial: string }> => {
  const bg = spawnRhachetCliBackground({
    args: [
      'enroll',
      'claude',
      ...(input.as ? ['--as', input.as] : []),
      ...(input.extraArgs ?? []),
    ],
    cwd: input.dir,
    env: input.env,
  });
  const ready = await bg.waitForOutput({
    pattern: /ready serial=(?<serial>[0-9a-f-]{36})/,
    timeoutMs: input.timeoutMs ?? 20000,
  });
  return { bg, serial: ready.groups!.serial! };
};

/**
 * .what = poll `rhx clone get <address>` until its output carries `ack:<nonce>`
 * .why = the say returns once the byte is DELIVERED to the child; the child writes
 *   its transcript a tick later, so `get` is polled until the reply appears (or a
 *   bounded number of tries elapse, after which the last read is handed back so the
 *   assertion fails loud with real context)
 */
export const pollForAck = async (input: {
  address: string;
  nonce: string;
  dir: string;
  env: Record<string, string | undefined>;
}): Promise<string> => {
  const readOnce = (): ReturnType<typeof invokeRhachetCliBinary> =>
    invokeRhachetCliBinary({
      args: ['clone', 'get', input.address, '--tail', '5'],
      cwd: input.dir,
      env: input.env,
      logOnError: false,
    });

  // .note = deliberate mutation — a bounded poll counter local to this loop; it
  //   counts ack-poll attempts (max 50) and never escapes this function
  for (let attempt = 0; attempt < 50; attempt++) {
    const got = readOnce();
    if (got.stdout.includes(`ack:${input.nonce}`)) return got.stdout;
    await new Promise((r) => setTimeout(r, 100));
  }

  const last = readOnce();
  return `NO ack:${input.nonce} after 50 tries.\n--- last stdout ---\n${last.stdout}\n--- last stderr ---\n${last.stderr}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// the REAL-claude reach tier — shared by every real-brain reach acceptance test
// (the 1-turn sentinel reach + the 5-turn joker conversation). a real claude spawn
// is credential-gated + costly, so these fixtures gate LOUD (never skip) and drive a
// real say/get exchange against a live brain.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * .what = locate the real `claude` binary this host would spawn, or null if absent
 * .why = the real tier needs the genuine brain-cli on PATH. an override env lets a
 *   nightly runner pin an exact binary; otherwise the well-known pnpm global path and
 *   a PATH scan are tried. null means "no real claude" — the gate then fails loud.
 */
export const getRealClaudeBinPath = (): string | null => {
  const override = process.env.RHACHET_REAL_CLAUDE_BIN;
  if (override && existsSync(override)) return override;

  const candidates = [
    join(homedir(), '.local', 'share', 'pnpm', 'claude'),
    ...(process.env.PATH ?? '')
      .split(delimiter)
      .filter((dir) => dir.length > 0)
      .map((dir) => join(dir, 'claude')),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
};

/**
 * .what = is a real claude authenticated on this host?
 * .why = the binary alone is not enough — claude-code needs credentials (an oauth
 *   login file, or an api-key env). absent auth would hang or 401 mid-reach, so the
 *   gate refuses up front with a fix-named error rather than burn a 2-minute wait.
 */
export const isRealClaudeAuthed = (): boolean => {
  const credsFile = join(homedir(), '.claude', '.credentials.json');
  return (
    existsSync(credsFile) ||
    !!process.env.ANTHROPIC_API_KEY ||
    !!process.env.CLAUDE_CODE_OAUTH_TOKEN
  );
};

/**
 * .what = assert a real, authenticated claude is reachable — else fail LOUD
 * .why = the roadmap mandate: an absent credential is a ConstraintError (exit 2) that
 *   names the fix, NEVER a skip and NEVER a pass. it also names the local-auth reality
 *   (claude auth is a login on THIS host, not a keyrack env-var), so the hint is truly
 *   actionable. shared so every real-brain tier gates identically.
 */
export const getRealClaudeOrThrow = (): { binPath: string; binDir: string } => {
  const binPath = getRealClaudeBinPath();
  if (!binPath)
    throw new ConstraintError(
      [
        'no real `claude` binary found for the real-claude reach tier.',
        'fix: install claude-code (`pnpm add -g @anthropic-ai/claude-code`) or set',
        'RHACHET_REAL_CLAUDE_BIN to its path. this tier NEVER skips — an absent brain',
        'is a loud gate, not a silent pass.',
      ].join(' '),
    );

  if (!isRealClaudeAuthed())
    throw new ConstraintError(
      [
        'real `claude` found but NOT authenticated — the reach round-trip would 401 or hang.',
        'fix: authenticate claude-code (`claude` interactive login) or export ANTHROPIC_API_KEY;',
        'in ci, `rhx keyrack unlock --owner ehmpath --env test`. this tier NEVER skips.',
      ].join(' '),
    );

  return { binPath, binDir: binPath.slice(0, binPath.lastIndexOf('/')) };
};

/**
 * .what = run `mutate` while this process holds an exclusive on-disk lock beside `path`
 *
 * 🚨 .why = the mutation below is a READ-MODIFY-WRITE of `~/.claude.json`, which is
 *   HOST-GLOBAL and shared with the human's own claude. jest runs test files in parallel
 *   worker PROCESSES, so two real-brain files that each read-then-write it interleave, and
 *   the later write is built on a snapshot taken before the earlier one landed:
 *
 *   | worker A | worker B |
 *   |---|---|
 *   | read `{…}` | |
 *   | | read `{…}` — the SAME snapshot |
 *   | write `{…, projects: {A}}` | |
 *   | | write `{…, projects: {B}}` ⇒ **A's trust grant is gone** |
 *
 *   ⇒ worker A's enroll then wedges on the folder-trust dialog it already answered, and a
 *   field the human's own claude expects can be dropped the same way. the merge is
 *   non-destructive per invocation and NO lever serialized the invocations
 *   (raised by the r007 `behavior-hazards` lane at i076).
 *
 * .why an `O_EXCL` create rather than a flock = `openSync(…, 'wx')` is atomic on posix and
 *   on win32 and needs no library. the lock is a FILE beside the target, never the target
 *   itself, so a crash mid-mutate cannot leave the config truncated.
 *
 * ⚠️ a stale lock is RECLAIMED by age rather than waited on forever — a worker killed
 *   mid-mutate would otherwise wedge every later run on this host, which is a worse
 *   failure than the race it guards. the reclaim window is far longer than the mutation.
 */
const withHostFileLock = <T>(input: { path: string; mutate: () => T }): T => {
  const lockPath = `${input.path}.rhachet-test.lock`;
  const staleAfterMs = 30_000;
  const deadline = Date.now() + 15_000;

  // .note = deliberate mutation — the spin must carry its own acquired-flag out of the
  //   loop, and a lock is by nature a stateful claim. bounded to this call
  let held = false;
  while (!held) {
    try {
      closeSync(openSync(lockPath, 'wx'));
      held = true;
    } catch (error) {
      // ⚠️ an ALLOWLIST, never a blanket catch — only "someone else holds it" is a
      //   condition to wait on. every other fault (a read-only home, a bad path) rethrows
      //   so it is never absorbed into a spin (`rule.forbid.failhide`)
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;

      const age = Date.now() - statSync(lockPath).mtimeMs;
      if (age > staleAfterMs) {
        rmSync(lockPath, { force: true });
        continue;
      }
      if (Date.now() > deadline)
        throw new ConstraintError(
          `could not acquire the ${lockPath} lock within 15s`,
          {
            lockPath,
            ageMs: age,
            hint: 'another jest worker may be wedged mid-mutate; remove the lock file to clear it',
          },
        );
      // a short SYNC pause — this whole path is sync so its callers keep their signature,
      // and a jest worker has no other work to do while it waits its turn
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }

  try {
    return input.mutate();
  } finally {
    // ⚠️ released on EVERY exit path. a throw inside `mutate` that leaked the lock would
    //   wedge this host until the stale window expired
    rmSync(lockPath, { force: true });
  }
};

/**
 * .what = pre-accept EVERY one-time gate claude-code puts between a cold start and a
 *   ready input box — the per-project folder-trust dialog, the account-level first-run
 *   setup, and the "detected a custom API key in your environment" prompt — so a fresh
 *   fixture dir on a fresh host never wedges an enroll on a question there is no
 *   keyboard to answer.
 * .why =
 *   - each of these blocks the tui until a human presses Enter, and a pty enroll has
 *     no human behind it. a dev box cleared all three by hand, long ago; a ci runner
 *     with a just-installed claude and no ~/.claude.json meets all three at once.
 *   - the API-key gate is the one that actually bit (ci run 31886980514): the runner
 *     exports ANTHROPIC_API_KEY from keyrack, claude asks whether to use it and waits
 *     on `1. Yes / 2. No`. the enroll's own handoff still prints and the socket still
 *     stands up, so the clone reads LIVE — but every `say` types into that prompt
 *     instead of the input box. no turn is submitted, the transcript stays empty,
 *     `get` reads empty, and `say` fails loud with "did NOT leave its input buffer".
 *   - claude records the answer as the key's LAST 20 CHARACTERS under
 *     customApiKeyResponses.approved (the same suffix its prompt displays), so
 *     recording it up front is exactly the state a human's "1. Yes" leaves behind.
 *   - this replicates a set-up host; it does NOT fake the brain — real claude still
 *     boots, thinks, and replies.
 *   - findsert + non-destructive: reads the real ~/.claude.json, fills ONLY absent
 *     keys, unions the approved-key list, preserves every other field, writes it back.
 */
export const setRealClaudeFirstRunAccepted = (input: { dir: string }): void => {
  const configPath = join(homedir(), '.claude.json');
  return withHostFileLock({ path: configPath, mutate: () => setAccepted(input) });
};

/**
 * .what = the read-modify-write itself, ALWAYS called under the lock above
 * .why = split out so the lock is not optional at the one call site that matters — a
 *   caller reaches `setRealClaudeFirstRunAccepted`, which cannot be invoked unlocked
 */
const setAccepted = (input: { dir: string }): void => {
  const configPath = join(homedir(), '.claude.json');
  const prior = existsSync(configPath)
    ? (JSON.parse(readFileSync(configPath, 'utf-8')) as {
        projects?: Record<string, Record<string, unknown>>;
        hasCompletedOnboarding?: boolean;
        theme?: string;
        customApiKeyResponses?: { approved?: string[]; rejected?: string[] };
      })
    : {};
  const projects = prior.projects ?? {};
  const project = projects[input.dir] ?? {};

  // approve the key this run will actually hand claude, by the last-20 suffix claude
  // itself keys on. absent a key, leave the list exactly as found
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const approvedPrior = prior.customApiKeyResponses?.approved ?? [];
  const approvedNext = apiKey
    ? Array.from(new Set([...approvedPrior, apiKey.slice(-20)]))
    : approvedPrior;

  const next = {
    ...prior,
    // fill the account-level gates ONLY when absent — an already-set-up host keeps
    // whatever the human chose (their theme is theirs, not ours to overwrite)
    hasCompletedOnboarding: prior.hasCompletedOnboarding ?? true,
    theme: prior.theme ?? 'dark',
    customApiKeyResponses: {
      ...prior.customApiKeyResponses,
      approved: approvedNext,
      rejected: prior.customApiKeyResponses?.rejected ?? [],
    },
    projects: {
      ...projects,
      [input.dir]: { ...project, hasTrustDialogAccepted: true },
    },
  };
  writeFileSync(configPath, JSON.stringify(next, null, 2), 'utf-8');
};

/**
 * .what = the marks a real claude draws once its tui is up and its input reader is armed
 * .why = the readiness signal must survive a banner redesign, so it names SEVERAL marks
 *   any one of which proves the tui took over, rather than one word that a release can
 *   retire. claude v1 opened with a "Welcome" box; v2.1.251 opens with a version banner
 *   (`Claude Code` / `Haiku 4.5 · API Usage Billing` / cwd), an input box, and a mode
 *   footer (`⏸ manual mode on · ← for agents`) — and holds no "Welcome" at all.
 *
 *   ⚠️ every alternative here is ONE contiguous token in the pty stream. the tui draws
 *      each word with a `[NNG` cursor-move between, so a multi-word literal like
 *      `Claude Code v` never matches. verify any new mark against a raw capture before
 *      it is added, never against the rendered screen.
 */
const CLAUDE_IS_READY = /Welcome|API Usage Billing|manual mode on/;

/**
 * .what = drive claude's folder-trust menu(s) through the outer pty until the brain boots
 * .why = a fresh dir raises a one-time trust menu before claude boots. a
 *   `~/.claude.json` pre-accept CAN clear it, but a nested claude session races that
 *   write and clobbers it, so the menu must be driven the way a human drives it.
 *
 *   ⚠️ three properties of that menu defeat a fixed key burst, and each is observed:
 *   1. the SELECTED option is not stable across claude versions. a build that
 *      pre-approves many tool permissions renders the safe refusal first —
 *      `❯ No, exit`, with `Yes, I trust this folder` below — so a bare Enter confirms
 *      the EXIT and the brain never boots
 *   2. the menu can render MORE THAN ONCE (the nested session raises its own), each
 *      fresh render back on the refusal
 *   3. it redraws async, so keys fired back-to-back outrun the render
 *
 *   so poll instead: act only when the stream has gone quiet (the menu awaits a key)
 *   AND the menu is the last panel drawn, then step toward the trust option or confirm
 *   it. yields as soon as claude's welcome box appears.
 */
const driveTrustMenus = async (input: {
  bg: RhachetBackgroundHandle;
  timeoutMs?: number;
}): Promise<void> => {
  // the cursor sits on whichever option follows the LAST `❯` drawn. the menu writes each
  // word with a `[NNG` cursor-move between, but never a newline mid-option, so the option
  // label is read as the remainder of that line.
  const cursorSitsOnTrust = (): boolean => {
    const output = input.bg.getOutput();
    const at = output.lastIndexOf('❯');
    if (at < 0) return false;
    return (output.slice(at, at + 200).split(/[\r\n]/)[0] ?? '').includes(
      'Yes,',
    );
  };

  // the menu is ON SCREEN when its cursor, its trust option, and its confirm footer are
  // all among the last bytes drawn. the buffer only ever grows, so a tail read is what
  // distinguishes "menu up now" from "menu was up earlier".
  // ⚠️ NEVER match a multi-word literal here. the menu draws each word with a `[NNG`
  //    cursor-move between, so `to confirm` and `trust this folder` are NOT contiguous
  //    in the stream — a plain `.includes()` on either silently never matches, and the
  //    loop then sits on its hands for the whole timeout. match single words, or span
  //    the escapes with a same-line `[^\r\n]*`.
  const menuIsOnScreen = (): boolean => {
    const tail = input.bg.getOutput().slice(-1500);
    return (
      /❯/.test(tail) && /confirm/.test(tail) && /Yes,[^\r\n]*folder/.test(tail)
    );
  };

  const deadline = Date.now() + (input.timeoutMs ?? 120000);
  // .note = deliberate mutation — a pty is driven over time, so the loop MUST carry the
  //   prior byte count to tell a quiet stream from a live one. bounded to this closure.
  let lengthPrior = -1;
  while (!CLAUDE_IS_READY.test(input.bg.getOutput()) && Date.now() < deadline) {
    const output = input.bg.getOutput();
    const streamIsQuiet = output.length === lengthPrior;
    lengthPrior = output.length;

    // one key per quiet tick: step down toward the trust option, or confirm it once the
    // cursor is there. a key per tick keeps every press paired with a fresh read, so a
    // wrap or a second menu is handled the same way the first one was.
    if (streamIsQuiet && menuIsOnScreen())
      input.bg.write(cursorSitsOnTrust() ? '\r' : '\u001b[B');

    await new Promise<void>((done) => setTimeout(done, 400));
  }
};

/**
 * .what = enroll a REAL claude through the outer pty and wait for its serial handoff
 * .why = the real-tier counterpart of enrollCloneAndWaitReady. a real claude prints no
 *   stub `ready serial=` line, and the human breadcrumb (`asCloneReachBreadcrumb`) is a
 *   TREE-mode emit on stderr, interleaved with the brain's own boot noise on a shared pty
 *   — so it is a poor sync point even though it now fires on a named enroll too.
 *   `--output json` gives a deterministic handoff for BOTH cases: a compact single-line
 *   `{"outcome":…,"serial":…,"slug":…,"socketEligible":true}` printed to stdout, after
 *   which enroll blocks on the brain's lifetime (invokeEnroll awaits waitForExit), so
 *   the brain stays alive + the socket stays up. yields the live handle + the clone's
 *   address + serial. NOTE the caller must put the real claude first on PATH and must
 *   NOT override CLAUDE_CONFIG_DIR (the brain needs its real ~/.claude).
 */
export const enrollRealClaudeAndWaitReach = async (input: {
  dir: string;
  env: Record<string, string | undefined>;
  as?: string;
  model?: string;
  timeoutMs?: number;
}): Promise<{ bg: RhachetBackgroundHandle; address: string; serial: string }> => {
  // default the real brain to haiku — the reach proof needs a LIVE brain that submits
  // + replies, not a smart one. haiku answers fastest + cheapest, so the round-trip is
  // quick and the token spend is minimal (rule.require.test-claude-cli-against-haiku).
  // `--model` is a claude passthrough arg (enroll consumes only its own flags).
  const bg = spawnRhachetCliBackground({
    args: [
      'enroll',
      'claude',
      '--model',
      input.model ?? 'haiku',
      ...(input.as ? ['--as', input.as] : []),
      '--output',
      'json',
    ],
    cwd: input.dir,
    env: input.env,
  });
  const reach = await bg.waitForOutput({
    pattern: /"serial":\s*"(?<serial>[0-9a-f-]{36})"/,
    timeoutMs: input.timeoutMs ?? 120000,
  });
  const serial = reach.groups!.serial!;

  // claude shows a one-time folder-trust menu for a fresh dir before it boots ("Is this
  // a project you created or one you trust?"). race that menu against the ready marks —
  // whichever lands first says whether the menu must be driven at all. the menu text is
  // drawn word-by-word with `[NNG` cursor-move escapes between words, so
  // "trust this folder" is NOT contiguous; the header "you trust?" gives a reliable
  // contiguous literal to match.
  const gate = await bg.waitForOutput({
    pattern: new RegExp(`trust\\?|${CLAUDE_IS_READY.source}`),
    timeoutMs: input.timeoutMs ?? 120000,
  });
  if (gate[0].includes('trust?'))
    await driveTrustMenus({ bg, timeoutMs: input.timeoutMs });

  // the `"serial":` handoff prints from rhachet BEFORE claude's tui input reader is
  // armed. a dispatch that lands before the reader is ready is lost (a mid-boot claude
  // buffers it as literal text; a booted claude discards a burst). the stub draws no such
  // banner, so both waits below are real-claude-only.
  //
  // ⚠️ these are TWO waits, and only the first is a signal. an earlier comment said "a
  //   signal, not a fixed delay" over BOTH lines, which read as a claim about the settle
  //   too — it was not one, and a reviewer read it exactly that way
  //   (`rule.require.timeless-comments`).
  //
  //   1. the SIGNAL — claude's own readiness banner, however long its boot took
  await bg.waitForOutput({
    pattern: CLAUDE_IS_READY,
    timeoutMs: input.timeoutMs ?? 120000,
  });

  //   2. a FIXED settle, stated as one. the banner marks the RENDER; claude publishes no
  //      second mark for "the input reader is armed", so there is no signal left to wait
  //      on and this is a guess at that gap. on a loaded host it can be short.
  //
  //   ⇒ the residue is covered DELIBERATELY, never incidentally: `sayAndPollForMarker`
  //     re-sends a non-landed dispatch up to `maxAttempts`, which is the shipped consumer
  //     contract (fail loud on exit 2, then retry) rather than a mask over this delay. so
  //     a settle too short costs a retry, never a red — and ALL attempts wedged still
  //     fails loud with the brain's own screen attached
  await new Promise<void>((done) => setTimeout(done, 2000));

  return { bg, address: `@:${serial}`, serial };
};

/**
 * .what = poll `clone list` until the reach-state a caller expects is on screen
 *
 * 🚨 .why a POLL and not a settle = the callers each killed a brain and then slept a fixed
 *   500ms before they read its reach-state. that is a LATENCY BOUND asserted as fact, and
 *   the two cases it covers do not even share a mechanism:
 *
 *   | the read | what it actually waits on |
 *   |---|---|
 *   | a socketed clone → DEAD | the listener is gone. `bg.kill()` already awaits the child's exit, so this is settled BEFORE the sleep begins |
 *   | a socketless clone → DEAF→DEAD | a `kill(pid, 0)` probe, which answers ALIVE for a zombie until its parent reaps it — a genuinely unbounded wait |
 *
 *   ⇒ one guess covered a case that needed none and a case no fixed number can bound. a
 *   poll of the OBSERVABLE is right for both, and it reports the last screen it saw when
 *   the bound expires, so an expiry names what it found rather than only that it waited
 *   (`rule.forbid.time-assumptions`, raised by the r007 `behavior-hazards` lane at i076).
 *
 * ⚠️ it does NOT throw on expiry. the caller's own `expect` is the verdict, and a throw
 *   here would replace a legible assertion diff with a harness fault.
 */
export const pollForCloneListState = async (input: {
  /** the text the caller expects on screen, e.g. `'DEAD'` */
  wanted: string;
  dir: string;
  env: Record<string, string | undefined>;
  timeoutMs?: number;
}): Promise<ReturnType<typeof invokeRhachetCliBinary>> => {
  const deadline = Date.now() + (input.timeoutMs ?? 15000);
  // .note = deliberate mutation — the loop must carry the most recent read out, so the
  //   caller asserts against a real screen rather than an absent one. bounded to this call
  let listed = invokeRhachetCliBinary({
    args: ['clone', 'list'],
    cwd: input.dir,
    env: input.env,
    logOnError: false,
  });
  while (!listed.stdout.includes(input.wanted) && Date.now() < deadline) {
    await new Promise((wake) => setTimeout(wake, 100));
    listed = invokeRhachetCliBinary({
      args: ['clone', 'list'],
      cwd: input.dir,
      env: input.env,
      logOnError: false,
    });
  }
  return listed;
};

/**
 * .what = say a message to a real clone, then poll `get` until a marker appears
 * .why = a real brain takes seconds to think + write its transcript, so a dispatch is
 *   observed by a poll of `get` for a deterministic marker the prompt asked the brain to
 *   emit (LLM reply text is nondeterministic; the marker is not). returns the say result
 *   + the last read + whether the marker landed, so the caller asserts loud with context.
 */
export const sayAndPollForMarker = async (input: {
  address: string;
  what: string;
  marker: string;
  dir: string;
  env: Record<string, string | undefined>;
  stdin?: string;
  timeoutMs?: number;
  maxAttempts?: number;
  /**
   * the clone's pty mirror, so an exhausted dispatch can report the brain's OWN
   * screen. without it a failure reads only `exit 1` — with it, the screen names
   * the cause (a first-run setup prompt, a trust dialog, a crashed tui)
   */
  getScreen?: () => string;
}): Promise<{
  said: ReturnType<typeof invokeRhachetCliBinary>;
  lastRead: string;
  landed: boolean;
}> => {
  // one dispatch attempt — the say cli invocation, factored so a retry re-sends it
  const sendSay = (): ReturnType<typeof invokeRhachetCliBinary> =>
    invokeRhachetCliBinary({
      args: [
        'clone',
        'say',
        input.address,
        '--what',
        input.stdin !== undefined ? '@stdin' : input.what,
      ],
      cwd: input.dir,
      env: input.env,
      stdin: input.stdin,
      logOnError: false,
    });

  // a wedged/undelivered say is the FAIL-LOUD signal (exit 2), and the wish's real
  // consumer (a cron/comms handler) RETRIES it. a booted claude has a brief settle window
  // between turns — right after it renders a reply, its input reader is momentarily not
  // drained, so a rapid next-turn say can land in that window and wedge on a live-brain
  // race (the flagged say-vs-settle boundary). so re-say a non-landed dispatch up to
  // maxAttempts, exactly as the consumer must — this models the shipped contract (fail
  // loud, then retry), NOT a masked defect: the deterministic submit path is proven
  // separately by the stub-brain suites, and ALL attempts wedged still surfaces a
  // genuinely broken submit here.
  const maxAttempts = input.maxAttempts ?? 3;

  // .note = deliberate mutation — `said` latches the most-recent say result, `lastRead`
  //   the most-recent `get` read; both reassigned across attempts, neither escapes
  let said = sendSay();
  let lastRead = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // a retry (attempt 2+) re-sends before its poll; attempt 1 was sent above
    if (attempt > 1) said = sendSay();

    // a TIGHT per-attempt deadline — claude replies + writes its transcript within
    // seconds, so a marker absent after this cap means THIS attempt did not land; the
    // retry above covers the live settle-race, so the cap need not swallow it
    const deadline = Date.now() + (input.timeoutMs ?? 30000);
    while (Date.now() < deadline) {
      const got = invokeRhachetCliBinary({
        args: ['clone', 'get', input.address, '--tail', '10'],
        cwd: input.dir,
        env: input.env,
        logOnError: false,
      });
      lastRead = got.stdout;
      if (got.stdout.includes(input.marker))
        return { said, lastRead, landed: true };
      await new Promise((r) => setTimeout(r, 1500));
    }

    // this attempt did not land — a short settle before the retry lets claude's input
    // reader return to a ready state after the prior turn's render
    if (attempt < maxAttempts)
      await new Promise((r) => setTimeout(r, 2000));
  }

  // every attempt is spent and the marker never landed — the caller's `landed` assert
  // will fail, but on its own it reads as a bare `false`. each say ran with
  // logOnError:false (a retried say is expected to fail, so per-attempt logs are noise),
  // so the WHY is otherwise swallowed. print it once, here, at the only moment it is
  // load-bearing: the last say's exit + stderr, the last `get` read, and — when the
  // caller supplies it — the brain's own screen, which names a cause no rhachet-side
  // error can (a first-run setup prompt, a trust dialog, a crashed tui)
  const screen = input.getScreen?.() ?? '(no screen supplied)';
  console.error(
    [
      `⛈️ dispatch NEVER landed after ${maxAttempts} attempts`,
      `   address = ${input.address}`,
      `   marker  = ${input.marker}`,
      `   say.status = ${String(said.status)}`,
      `--- say.stderr ---`,
      said.stderr,
      `--- say.stdout ---`,
      said.stdout,
      `--- last get read ---`,
      lastRead,
      `--- brain screen (last 4000 chars) ---`,
      screen.slice(-4000),
    ].join('\n'),
  );

  return { said, lastRead, landed: false };
};
